"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import {
  type AlbumSheet,
  type Layout,
  computeNumbers,
  insertBlank,
  removeFrame,
  moveFrame,
  setMemo,
  setLayout,
  setNumbering,
} from "@/lib/album";
import { buildAlbumXlsx } from "@/lib/xlsxExport";
import { downloadBlob } from "@/lib/zipExport";

export default function AlbumPage() {
  const album = useApp((s) => s.album);
  const photos = useApp((s) => s.photos);
  const order = useApp((s) => s.order);
  const addSheetFromSelection = useApp((s) => s.addSheetFromSelection);
  const updateSheet = useApp((s) => s.updateSheet);
  const removeSheet = useApp((s) => s.removeSheet);
  const getPhotoBlob = useApp((s) => s.getPhotoBlob);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const exportXlsx = async () => {
    if (album.sheets.length === 0) {
      setMsg("シートがありません。フェーズ1で写真を選び「シート追加」してください");
      return;
    }
    setBusy(true);
    setMsg("Excel生成中...");
    try {
      const blob = await buildAlbumXlsx(album, { get: getPhotoBlob });
      downloadBlob(blob, "写真帳.xlsx");
      setMsg(`写真帳.xlsx を出力（${album.sheets.length}シート）`);
    } catch (e) {
      setMsg("エラー: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col bg-slate-100">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-slate-800 px-3 py-2 text-white">
        <Link href="/" className="rounded bg-slate-600 px-3 py-1 text-sm hover:bg-slate-500">
          ← 選別に戻る
        </Link>
        <h1 className="text-base font-bold">写真帳エディタ</h1>
        <button
          onClick={addSheetFromSelection}
          disabled={order.length === 0}
          className="ml-auto rounded bg-emerald-600 px-3 py-1 text-sm font-medium disabled:opacity-40"
          title={order.length === 0 ? "先にフェーズ1で写真を選択" : ""}
        >
          現在の選択をシート追加（{order.length}枚）
        </button>
        <button
          onClick={exportXlsx}
          disabled={busy}
          className="rounded bg-brand px-3 py-1 text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
        >
          Excel出力
        </button>
      </header>

      {msg && <div className="bg-amber-50 px-3 py-2 text-sm text-amber-800">{msg}</div>}

      {album.sheets.length === 0 && (
        <div className="p-8 text-center text-slate-500">
          <p>まだシートがありません。</p>
          <p className="mt-2 text-sm">
            <Link href="/" className="text-brand underline">選別画面</Link>
            で写真をタップ選択し、ここで「シート追加」を押してください。
          </p>
        </div>
      )}

      <div className="space-y-6 p-3">
        {album.sheets.map((sheet, si) => (
          <SheetEditor
            key={sheet.id}
            sheet={sheet}
            photoUrl={(id) => photos.find((p) => p.id === id)?.url}
            onChange={(s) => updateSheet(si, s)}
            onRemove={() => removeSheet(si)}
          />
        ))}
      </div>
    </main>
  );
}

function SheetEditor({
  sheet,
  photoUrl,
  onChange,
  onRemove,
}: {
  sheet: AlbumSheet;
  photoUrl: (id: string) => string | undefined;
  onChange: (s: AlbumSheet) => void;
  onRemove: () => void;
}) {
  const numbers = computeNumbers(sheet);

  return (
    <section className="rounded-lg border bg-white shadow-sm">
      {/* シート設定バー */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50 px-3 py-2 text-sm">
        <input
          value={sheet.name}
          onChange={(e) => onChange({ ...sheet, name: e.target.value })}
          className="w-32 rounded border px-2 py-1 font-medium"
        />
        <label className="flex items-center gap-1">
          <span className="text-slate-500">タイプ</span>
          <select
            value={sheet.layout}
            onChange={(e) => onChange(setLayout(sheet, Number(e.target.value) as Layout))}
            className="rounded border px-2 py-1"
          >
            {[2, 3, 4, 6, 8].map((n) => (
              <option key={n} value={n}>{n}枚</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span className="text-slate-500">番号</span>
          <select
            value={sheet.numbering}
            onChange={(e) => onChange(setNumbering(sheet, e.target.value as AlbumSheet["numbering"]))}
            className="rounded border px-2 py-1"
          >
            <option value="perFrame">コマ毎</option>
            <option value="perPhoto">写真毎</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={sheet.showDate}
            onChange={(e) => onChange({ ...sheet, showDate: e.target.checked })}
          />
          <span className="text-slate-500">撮影日</span>
        </label>
        <button onClick={onRemove} className="ml-auto rounded border border-red-300 px-2 py-1 text-red-600">
          シート削除
        </button>
      </div>

      {/* コマ一覧（紙面プレビュー風） */}
      <div className="divide-y">
        {sheet.frames.map((frame, i) => {
          const pageBreak = i > 0 && i % sheet.layout === 0;
          return (
            <div key={i}>
              {pageBreak && (
                <div className="bg-slate-200 py-1 text-center text-xs text-slate-500">— ページ区切り —</div>
              )}
              <div className="flex items-stretch gap-3 p-3">
                {/* 写真枠 */}
                <div className="flex h-28 w-40 flex-shrink-0 items-center justify-center overflow-hidden rounded border bg-slate-50">
                  {frame.kind === "photo" ? (
                    photoUrl(frame.photoId) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl(frame.photoId)} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-xs text-red-400">画像なし</span>
                    )
                  ) : (
                    <span className="text-2xl text-slate-300">余白</span>
                  )}
                </div>

                {/* 右: No.・メモ・撮影日 */}
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">
                      {numbers[i] !== null ? `No.${numbers[i]}` : "—"}
                    </span>
                    {frame.kind === "photo" && sheet.showDate && frame.date && (
                      <span className="text-xs text-slate-400">{frame.date}</span>
                    )}
                  </div>
                  {frame.kind === "photo" && (
                    <input
                      value={frame.memo}
                      onChange={(e) => onChange(setMemo(sheet, i, e.target.value))}
                      placeholder="メモ"
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  )}
                  <div className="mt-auto flex flex-wrap gap-1 text-xs">
                    <button onClick={() => onChange(moveFrame(sheet, i, Math.max(0, i - 1)))} className="rounded border px-2 py-0.5">▲</button>
                    <button onClick={() => onChange(moveFrame(sheet, i, Math.min(sheet.frames.length - 1, i + 1)))} className="rounded border px-2 py-0.5">▼</button>
                    <button onClick={() => onChange(insertBlank(sheet, i))} className="rounded border px-2 py-0.5">＋余白(前)</button>
                    <button onClick={() => onChange(removeFrame(sheet, i))} className="rounded border border-red-200 px-2 py-0.5 text-red-500">削除</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div className="p-2">
          <button
            onClick={() => onChange(insertBlank(sheet, sheet.frames.length))}
            className="w-full rounded border border-dashed py-2 text-sm text-slate-500 hover:bg-slate-50"
          >
            ＋ 末尾に余白コマを追加
          </button>
        </div>
      </div>
    </section>
  );
}
