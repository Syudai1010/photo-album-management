/**
 * メモ用データ出力。
 * 既存 xlsm のメモ欄（C列）へ貼り付けるため、No.順のラベル名（全景/接写/内部/測定）を
 *  - TSV（クリップボード直貼り・Excel列貼り付け用）
 *  - CSV / JSON（ファイル保存）
 * で出力する。資料の要望「Excelに貼り付けた時にメモ欄が自動入力」を実現する橋渡し。
 */

export interface MemoRow {
  order: number; // 1-based 通し番号
  newName: string; // 新ファイル名（拡張子込み）
  label: string; // メモ語（全景 等）。空の場合あり
}

/** Excel列貼り付け用: ラベルのみを改行区切り（メモ欄C列にそのまま縦貼り） */
export function toMemoColumn(rows: MemoRow[]): string {
  return rows.map((r) => r.label).join("\n");
}

/** No. とラベルのTSV（見出し付き） */
export function toTSV(rows: MemoRow[]): string {
  const head = "No.\tファイル名\tメモ";
  const body = rows.map((r) => `${r.order}\t${r.newName}\t${r.label}`).join("\n");
  return `${head}\n${body}`;
}

export function toCSV(rows: MemoRow[]): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const head = "order,file_name,label";
  const body = rows.map((r) => `${r.order},${esc(r.newName)},${esc(r.label)}`).join("\n");
  return `${head}\n${body}`;
}

export function toJSON(rows: MemoRow[]): string {
  return JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      totalCount: rows.length,
      items: rows.map((r) => ({ order: r.order, fileName: r.newName, label: r.label })),
    },
    null,
    2
  );
}

/** クリップボードへコピー（対応環境） */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
