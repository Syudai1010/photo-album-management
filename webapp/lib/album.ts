/**
 * アルバム（写真帳）のデータモデルと操作（純関数）
 *
 * 工事写真帳マルチVer16.xlsm の操作体系を再現:
 *   - 3枚/4枚タイプ（layout）
 *   - 余白コマ挿入/削除（AddBlank/DeleteBlank）
 *   - 写真の入替/移動（ExchangePicture/MoveToHere）
 *   - 番号振り 2モード（SerialNumbering=コマ毎 / PictureNumbering=写真毎）
 *   - メモ欄・撮影日表示
 */

export type Layout = 2 | 3 | 4 | 6 | 8;
export type NumberingMode = "perFrame" | "perPhoto";

export type Frame =
  | { kind: "photo"; photoId: string; memo: string; date?: string }
  | { kind: "blank" };

export interface AlbumSheet {
  id: string;
  name: string; // 例: 弁栓
  layout: Layout; // 1ページのコマ数
  numbering: NumberingMode;
  showDate: boolean;
  frames: Frame[];
}

export interface Album {
  sheets: AlbumSheet[];
}

/** ページ数（frames と layout から計算） */
export function pageCount(sheet: AlbumSheet): number {
  return Math.max(1, Math.ceil(sheet.frames.length / sheet.layout));
}

/**
 * コマ番号（No.）を計算して返す。
 *   perFrame（コマ毎）: 余白含め 1,2,3,...（xlsm SerialNumbering 相当）
 *   perPhoto（写真毎）: 写真のあるコマにのみ連番、余白は null（xlsm PictureNumbering 相当）
 * 返り値は frames と同じ長さの配列（null = 番号なし）。
 */
export function computeNumbers(sheet: AlbumSheet): (number | null)[] {
  const out: (number | null)[] = [];
  let n = 1;
  for (const f of sheet.frames) {
    if (sheet.numbering === "perFrame") {
      out.push(n);
      n += 1;
    } else {
      if (f.kind === "photo") {
        out.push(n);
        n += 1;
      } else {
        out.push(null);
      }
    }
  }
  return out;
}

/** 指定位置の直前に余白コマを挿入（後続は自動でずれる） */
export function insertBlank(sheet: AlbumSheet, index: number): AlbumSheet {
  const frames = sheet.frames.slice();
  const i = Math.max(0, Math.min(index, frames.length));
  frames.splice(i, 0, { kind: "blank" });
  return { ...sheet, frames };
}

/** コマを削除（余白でも写真でも）。後続は自動で詰まる */
export function removeFrame(sheet: AlbumSheet, index: number): AlbumSheet {
  const frames = sheet.frames.slice();
  if (index < 0 || index >= frames.length) return sheet;
  frames.splice(index, 1);
  return { ...sheet, frames };
}

/** コマを from から to へ移動（ドラッグ&ドロップ並べ替え） */
export function moveFrame(sheet: AlbumSheet, from: number, to: number): AlbumSheet {
  const frames = sheet.frames.slice();
  if (from < 0 || from >= frames.length) return sheet;
  const [item] = frames.splice(from, 1);
  const dest = Math.max(0, Math.min(to, frames.length));
  frames.splice(dest, 0, item);
  return { ...sheet, frames };
}

/** 2コマの写真を入れ替え（xlsm ExchangePicture 相当） */
export function swapFrames(sheet: AlbumSheet, a: number, b: number): AlbumSheet {
  const frames = sheet.frames.slice();
  if (a < 0 || b < 0 || a >= frames.length || b >= frames.length) return sheet;
  [frames[a], frames[b]] = [frames[b], frames[a]];
  return { ...sheet, frames };
}

/** メモを更新 */
export function setMemo(sheet: AlbumSheet, index: number, memo: string): AlbumSheet {
  const frames = sheet.frames.slice();
  const f = frames[index];
  if (!f || f.kind !== "photo") return sheet;
  frames[index] = { ...f, memo };
  return { ...sheet, frames };
}

/** レイアウト変更（コマ数の再割当は frames を保持したまま。ページは再計算） */
export function setLayout(sheet: AlbumSheet, layout: Layout): AlbumSheet {
  return { ...sheet, layout };
}

/** 番号モード変更 */
export function setNumbering(sheet: AlbumSheet, numbering: NumberingMode): AlbumSheet {
  return { ...sheet, numbering };
}
