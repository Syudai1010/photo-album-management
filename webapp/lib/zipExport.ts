/**
 * リネーム済み写真を ZIP で書き出す（スマホ/Safari/Firefox 用フォールバック）。
 * 元ファイルは触らず、新ファイル名のコピーを ZIP 化してダウンロードする。
 */
import JSZip from "jszip";
import { sanitizeFilename } from "./naming";

export interface ZipPlan {
  newName: string;
  file: File | Blob;
}

export async function buildRenamedZip(plans: ZipPlan[]): Promise<Blob> {
  const zip = new JSZip();
  const used = new Set<string>();
  for (const p of plans) {
    let name = sanitizeFilename(p.newName);
    // ZIP 内衝突の連番回避
    if (used.has(name)) {
      const dot = name.lastIndexOf(".");
      const stem = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : "";
      let i = 1;
      while (used.has(`${stem} (${i})${ext}`)) i += 1;
      name = `${stem} (${i})${ext}`;
    }
    used.add(name);
    zip.file(name, p.file);
  }
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}

/** Blob をダウンロード（ブラウザ共通） */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
