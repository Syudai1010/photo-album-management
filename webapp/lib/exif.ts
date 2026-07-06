/**
 * EXIF 撮影日時の読み取り（exifr ラッパ）。
 * services/exif.py と同じ思想: DateTimeOriginal → DateTime → ファイル更新日時 の順にフォールバック。
 */
import exifr from "exifr";

export async function readTakenAt(file: File): Promise<Date> {
  try {
    const out = await exifr.parse(file, {
      pick: ["DateTimeOriginal", "CreateDate", "ModifyDate"],
    });
    const dt: Date | undefined =
      out?.DateTimeOriginal || out?.CreateDate || out?.ModifyDate;
    if (dt instanceof Date && !isNaN(dt.getTime())) return dt;
  } catch {
    // EXIF 無し/破損は無視してフォールバック
  }
  // フォールバック: ファイル最終更新日時
  return new Date(file.lastModified);
}

/** 表示用フォーマット（YYYY-MM-DD HH:mm:ss） */
export function formatDate(d: Date, sep = "-"): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${sep}${p(d.getMonth() + 1)}${sep}${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 撮影日のみ（YYYY/MM/DD 等、写真帳用） */
export function formatDateOnly(d: Date, sep = "/"): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${sep}${p(d.getMonth() + 1)}${sep}${p(d.getDate())}`;
}
