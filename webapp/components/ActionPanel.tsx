"use client";
import { useState } from "react";
import { useApp, buildPlanRows, type PlanRow } from "@/lib/store";
import { executeDirectRename, undoRename, type RenamePlan } from "@/lib/fsAccess";
import { buildRenamedZip, downloadBlob, type ZipPlan } from "@/lib/zipExport";
import {
  toMemoColumn,
  toTSV,
  toCSV,
  toJSON,
  copyToClipboard,
  type MemoRow,
} from "@/lib/memoExport";

export function ActionPanel() {
  const state = useApp();
  const [preview, setPreview] = useState<PlanRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const rows = () => buildPlanRows(useApp.getState());

  const doPreview = () => {
    const r = rows();
    setPreview(r);
    setMsg(r.length ? `${r.length}件のプレビュー` : "写真が選択されていません");
  };

  const doExecute = async () => {
    const r = rows();
    if (r.length === 0) {
      setMsg("写真が選択されていません");
      return;
    }
    setBusy(true);
    setMsg("リネーム中...");
    try {
      if (state.loadMode === "direct" && state.dirHandle) {
        const plans: RenamePlan[] = r.map((x) => ({
          oldName: x.photo.name,
          newName: x.newName,
          handle: x.photo.handle,
          file: x.photo.file,
        }));
        const res = await executeDirectRename(state.dirHandle, plans);
        state.setUndoMap(res.undoMap);
        setMsg(`完了: 成功 ${res.success} / 失敗 ${res.failed}${res.errors[0] ? " / " + res.errors[0] : ""}`);
        // フォルダを再読込して最新状態へ
        await state.rescan().catch(() => {});
      } else {
        const plans: ZipPlan[] = r.map((x) => ({ newName: x.newName, file: x.photo.file }));
        const blob = await buildRenamedZip(plans);
        downloadBlob(blob, "renamed_photos.zip");
        setMsg(`ZIP出力: ${r.length}件（元ファイルは変更していません）`);
      }
    } catch (e) {
      setMsg("エラー: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  const doUndo = async () => {
    if (!state.dirHandle || !state.lastUndoMap) return;
    setBusy(true);
    setMsg("Undo中...");
    try {
      const res = await undoRename(state.dirHandle, state.lastUndoMap);
      state.setUndoMap(null);
      setMsg(`Undo完了: 成功 ${res.success} / 失敗 ${res.failed}`);
      await state.rescan().catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const memoRows = (): MemoRow[] =>
    rows().map((x, i) => ({ order: i + 1, newName: x.newName, label: x.label }));

  const doCopyMemo = async () => {
    const ok = await copyToClipboard(toMemoColumn(memoRows()));
    setMsg(ok ? "メモ列をコピー（Excelのメモ欄に縦貼り付け）" : "コピー失敗");
  };
  const doMemoFile = (kind: "tsv" | "csv" | "json") => {
    const mr = memoRows();
    const text = kind === "tsv" ? toTSV(mr) : kind === "csv" ? toCSV(mr) : toJSON(mr);
    downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `memo.${kind}`);
    setMsg(`メモを ${kind.toUpperCase()} で出力`);
  };

  const canUndo = state.loadMode === "direct" && !!state.lastUndoMap;

  return (
    <div className="space-y-3 border-t bg-white p-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={doPreview} disabled={busy} className="rounded bg-emerald-600 px-4 py-2 font-medium text-white disabled:opacity-50">
          プレビュー
        </button>
        <button onClick={doExecute} disabled={busy} className="rounded bg-orange-600 px-4 py-2 font-medium text-white disabled:opacity-50">
          {state.loadMode === "direct" ? "リネーム実行" : "リネーム済ZIP出力"}
        </button>
        {canUndo && (
          <button onClick={doUndo} disabled={busy} className="rounded bg-slate-500 px-4 py-2 font-medium text-white disabled:opacity-50">
            Undo
          </button>
        )}
        <div className="ml-auto flex flex-wrap gap-1">
          <button onClick={doCopyMemo} className="rounded border px-3 py-2 text-sm">メモ列コピー</button>
          <button onClick={() => doMemoFile("tsv")} className="rounded border px-3 py-2 text-sm">TSV</button>
          <button onClick={() => doMemoFile("csv")} className="rounded border px-3 py-2 text-sm">CSV</button>
          <button onClick={() => doMemoFile("json")} className="rounded border px-3 py-2 text-sm">JSON</button>
        </div>
      </div>

      {msg && <div className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">{msg}</div>}

      {preview && preview.length > 0 && (
        <div className="max-h-64 overflow-auto rounded border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-100">
              <tr>
                <th className="px-2 py-1 text-left">#</th>
                <th className="px-2 py-1 text-left">旧ファイル名</th>
                <th className="px-2 py-1 text-left">新ファイル名</th>
                <th className="px-2 py-1 text-left">メモ</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={r.photo.id} className="border-t">
                  <td className="px-2 py-1 text-slate-400">{i + 1}</td>
                  <td className="px-2 py-1 text-slate-500">{r.photo.name}</td>
                  <td className="px-2 py-1 font-medium">{r.newName}</td>
                  <td className="px-2 py-1">{r.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
