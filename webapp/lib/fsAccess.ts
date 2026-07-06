/**
 * File System Access API によるフォルダ直接リネーム（PC Chrome/Edge 用）。
 * 非対応環境では supportsDirectRename()=false となり、UI 側で ZIP 方式へフォールバックする。
 */
import { extname, sanitizeFilename } from "./naming";

const IMAGE_EXT = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff", ".heic", ".heif", ".gif",
]);

export function supportsDirectRename(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

export interface LoadedFile {
  name: string;
  file: File;
  handle?: FileSystemFileHandle; // 直接モードのみ
}

export interface DirectorySelection {
  dirHandle?: FileSystemDirectoryHandle; // 直接モードのみ
  files: LoadedFile[];
}

/** 既存の dirHandle から画像ファイル一覧を再列挙（ピッカーを出さない） */
export async function enumerateDirectory(
  dirHandle: FileSystemDirectoryHandle
): Promise<LoadedFile[]> {
  const files: LoadedFile[] = [];
  for await (const entry of dirHandle.values()) {
    if ((entry as FileSystemHandle).kind === "file") {
      const fh = entry as FileSystemFileHandle;
      if (IMAGE_EXT.has(extname(fh.name))) {
        const file = await fh.getFile();
        files.push({ name: fh.name, file, handle: fh });
      }
    }
  }
  return files;
}

/** フォルダを開いて画像ファイル一覧を取得（直接リネーム対応モード） */
export async function pickDirectory(): Promise<DirectorySelection> {
  if (!supportsDirectRename()) {
    throw new Error("このブラウザはフォルダ直接アクセスに対応していません");
  }
  const dirHandle = await window.showDirectoryPicker!({ mode: "readwrite", id: "photobook" });
  const files = await enumerateDirectory(dirHandle);
  return { dirHandle, files };
}

/** <input webkitdirectory> の FileList から画像を取り込む（フォールバックモード） */
export function loadFromFileList(fileList: FileList | File[]): DirectorySelection {
  const files: LoadedFile[] = [];
  for (const file of Array.from(fileList)) {
    if (IMAGE_EXT.has(extname(file.name))) {
      files.push({ name: file.name, file });
    }
  }
  return { files };
}

export interface RenamePlan {
  oldName: string;
  newName: string;
  handle?: FileSystemFileHandle;
  file: File;
}

export interface RenameResult {
  success: number;
  failed: number;
  errors: string[];
  undoMap: { oldName: string; newName: string }[];
}

/**
 * 直接リネームを実行（move() 優先、無ければ createWritable でコピー→元削除）。
 * 衝突回避のため二相リネーム: 一旦一時名 (__tmp__<i>) に退避してから最終名へ。
 */
export async function executeDirectRename(
  dirHandle: FileSystemDirectoryHandle,
  plans: RenamePlan[]
): Promise<RenameResult> {
  const result: RenameResult = { success: 0, failed: 0, errors: [], undoMap: [] };

  // フェーズA: 全て一時名へ（新旧名の衝突・循環を避ける）
  const temps: { tmp: string; finalName: string; oldName: string }[] = [];
  for (let i = 0; i < plans.length; i++) {
    const p = plans[i];
    if (p.oldName === p.newName) {
      result.success += 1;
      result.undoMap.push({ oldName: p.oldName, newName: p.newName });
      continue;
    }
    const tmp = `__pbtmp__${i}${extname(p.oldName)}`;
    try {
      const fh = p.handle ?? (await dirHandle.getFileHandle(p.oldName));
      await moveOrCopy(dirHandle, fh, p.oldName, tmp);
      temps.push({ tmp, finalName: p.newName, oldName: p.oldName });
    } catch (e) {
      result.failed += 1;
      result.errors.push(`退避失敗: ${p.oldName} - ${errStr(e)}`);
    }
  }

  // フェーズB: 一時名から最終名へ。既存衝突は連番回避。
  const used = new Set<string>();
  for (const t of temps) {
    let finalName = t.finalName;
    try {
      const fh = await dirHandle.getFileHandle(t.tmp);
      finalName = await uniqueName(dirHandle, finalName, used);
      used.add(finalName);
      await moveOrCopy(dirHandle, fh, t.tmp, finalName);
      result.success += 1;
      result.undoMap.push({ oldName: t.oldName, newName: finalName });
    } catch (e) {
      result.failed += 1;
      result.errors.push(`リネーム失敗: ${t.oldName} → ${t.finalName} - ${errStr(e)}`);
    }
  }

  // undo マップをフォルダに保存（xlsm の rename_map.csv と同思想）
  try {
    const ts = timestamp();
    const undoHandle = await dirHandle.getFileHandle(`rename_undo_${ts}.json`, { create: true });
    const w = await undoHandle.createWritable();
    await w.write(JSON.stringify({ createdAt: new Date().toISOString(), map: result.undoMap }, null, 2));
    await w.close();
  } catch {
    // undo保存の失敗はリネーム自体の成否に影響させない
  }

  return result;
}

/** undo: 保存済みマップを使い新名→旧名へ戻す */
export async function undoRename(
  dirHandle: FileSystemDirectoryHandle,
  map: { oldName: string; newName: string }[]
): Promise<RenameResult> {
  const result: RenameResult = { success: 0, failed: 0, errors: [], undoMap: [] };
  for (const m of map.slice().reverse()) {
    if (m.oldName === m.newName) continue;
    try {
      const fh = await dirHandle.getFileHandle(m.newName);
      await moveOrCopy(dirHandle, fh, m.newName, m.oldName);
      result.success += 1;
    } catch (e) {
      result.failed += 1;
      result.errors.push(`復元失敗: ${m.newName} → ${m.oldName} - ${errStr(e)}`);
    }
  }
  return result;
}

async function moveOrCopy(
  dirHandle: FileSystemDirectoryHandle,
  fh: FileSystemFileHandle,
  oldName: string,
  newName: string
): Promise<void> {
  if (typeof fh.move === "function") {
    await fh.move(newName);
    return;
  }
  // フォールバック: コピー新規作成 → 元削除
  const file = await fh.getFile();
  const dest = await dirHandle.getFileHandle(newName, { create: true });
  const w = await dest.createWritable();
  await w.write(file);
  await w.close();
  await dirHandle.removeEntry(oldName);
}

async function uniqueName(
  dirHandle: FileSystemDirectoryHandle,
  name: string,
  used: Set<string>
): Promise<string> {
  const clean = sanitizeFilename(name);
  const dot = clean.lastIndexOf(".");
  const stem = dot > 0 ? clean.slice(0, dot) : clean;
  const ext = dot > 0 ? clean.slice(dot) : "";
  let candidate = clean;
  let i = 1;
  // used集合 or 既存ファイルと衝突する間、連番付与
  while (used.has(candidate) || (await exists(dirHandle, candidate))) {
    candidate = `${stem} (${i})${ext}`;
    i += 1;
  }
  return candidate;
}

async function exists(dirHandle: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dirHandle.getFileHandle(name);
    return true;
  } catch {
    return false;
  }
}

function errStr(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(
    d.getMinutes()
  )}${p(d.getSeconds())}`;
}
