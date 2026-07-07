/**
 * 写真帳の .xlsx 出力（exceljs, 完全クライアントサイド）。
 * xlsm と同じ「写真枠（結合セル）＋コマ番号＋メモ＋撮影日」を再現する。
 * 出力はマクロ無しの素の .xlsx（SaveWOMacro 相当の成果物に直行）。
 */
import ExcelJS from "exceljs";
import type { Album, AlbumSheet } from "./album";
import { computeNumbers } from "./album";

export interface PhotoResolver {
  /** photoId から画像の Blob と表示名を返す */
  get(photoId: string): { blob: Blob; name: string } | undefined;
}

// レイアウトごとの1コマの行数（A4縦での見栄え調整）
const FRAME_ROWS = 13; // 写真12行 + 余白1
const PHOTO_ROWS = 12;
const PHOTO_COLS = 4; // A..D を写真、E..F をメモ

/** 画像を最大長辺 maxPx の JPEG に縮小して ArrayBuffer 化（容量削減）。失敗時は原本を返す */
async function toJpegBuffer(blob: Blob, maxPx = 1400): Promise<{ buf: ArrayBuffer; ext: "jpeg" | "png" }> {
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, maxPx / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(w, h)
        : Object.assign(document.createElement("canvas"), { width: w, height: h });
    const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D;
    ctx.drawImage(bmp, 0, 0, w, h);
    let outBlob: Blob;
    if (canvas instanceof OffscreenCanvas) {
      outBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.82 });
    } else {
      outBlob = await new Promise<Blob>((res, rej) =>
        (canvas as HTMLCanvasElement).toBlob(
          (b) => (b ? res(b) : rej(new Error("toBlob failed"))),
          "image/jpeg",
          0.82
        )
      );
    }
    bmp.close?.();
    return { buf: await outBlob.arrayBuffer(), ext: "jpeg" };
  } catch {
    // 縮小できない場合（HEIC等でデコード不可）は原本をそのまま
    const buf = await blob.arrayBuffer();
    const ext = blob.type.includes("png") ? "png" : "jpeg";
    return { buf, ext };
  }
}

async function writeSheet(wb: ExcelJS.Workbook, sheet: AlbumSheet, resolver: PhotoResolver) {
  const ws = wb.addWorksheet(sheet.name.slice(0, 30) || "写真帳", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });

  // 列幅
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 20; // メモ
  ws.getColumn(6).width = 14; // 撮影日

  const numbers = computeNumbers(sheet);

  for (let i = 0; i < sheet.frames.length; i++) {
    const frame = sheet.frames[i];
    const top = i * FRAME_ROWS + 1; // 1-based row
    // 写真行の高さ
    for (let r = top; r < top + PHOTO_ROWS; r++) ws.getRow(r).height = 16;

    // 写真枠（A..D を結合）
    ws.mergeCells(top, 1, top + PHOTO_ROWS - 1, PHOTO_COLS);
    const frameCell = ws.getCell(top, 1);
    frameCell.border = boxBorder();
    frameCell.alignment = { vertical: "middle", horizontal: "center" };

    // No.（E列上段）
    const no = numbers[i];
    const noCell = ws.getCell(top, 5);
    noCell.value = no !== null ? `No.${no}` : "";
    noCell.font = { bold: true, size: 11 };
    noCell.alignment = { vertical: "middle" };

    if (frame.kind === "blank") {
      frameCell.value = "余白";
      frameCell.font = { size: 28, color: { argb: "FFC0C0C0" } };
    } else {
      // メモ（E列, No.の下）
      ws.mergeCells(top + 1, 5, top + PHOTO_ROWS - 1, 5);
      const memoCell = ws.getCell(top + 1, 5);
      memoCell.value = frame.memo || "";
      memoCell.alignment = { vertical: "top", wrapText: true };
      memoCell.font = { size: 11 };

      // 撮影日（F列）
      if (sheet.showDate && frame.date) {
        const dateCell = ws.getCell(top, 6);
        dateCell.value = frame.date;
        dateCell.font = { size: 9, color: { argb: "FF666666" } };
        dateCell.alignment = { horizontal: "right" };
      }

      // 画像埋込
      const resolved = resolver.get(frame.photoId);
      if (resolved) {
        const { buf, ext } = await toJpegBuffer(resolved.blob);
        const imageId = wb.addImage({ buffer: buf as ExcelJS.Buffer, extension: ext });
        // 枠内に少し余白を持たせて配置
        // exceljs は分数の {col,row} アンカーを実行時に受け付けるが型が厳しいため cast する
        ws.addImage(imageId, {
          tl: { col: 0.1, row: top - 1 + 0.1 },
          br: { col: PHOTO_COLS - 0.1, row: top - 1 + PHOTO_ROWS - 0.1 },
          editAs: "oneCell",
        } as unknown as Parameters<typeof ws.addImage>[1]);
      }
    }
  }
}

function boxBorder(): Partial<ExcelJS.Borders> {
  const s = { style: "thin" as const, color: { argb: "FF000000" } };
  return { top: s, left: s, right: s, bottom: s };
}

/** アルバム全体を .xlsx Blob として生成 */
export async function buildAlbumXlsx(album: Album, resolver: PhotoResolver): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "工事写真整理Webアプリ";
  wb.created = new Date();
  for (const sheet of album.sheets) {
    await writeSheet(wb, sheet, resolver);
  }
  if (album.sheets.length === 0) wb.addWorksheet("写真帳");
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
