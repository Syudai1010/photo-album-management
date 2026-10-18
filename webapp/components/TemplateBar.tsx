"use client";
import { useApp, currentTemplate, currentAssignments } from "@/lib/store";
import { buildStem, labelName } from "@/lib/naming";

export function TemplateBar() {
  const templates = useApp((s) => s.templates);
  const templateId = useApp((s) => s.templateId);
  const order = useApp((s) => s.order);
  const cuts = useApp((s) => s.cuts);
  const skips = useApp((s) => s.skips);
  const setTemplate = useApp((s) => s.setTemplate);
  const cutHere = useApp((s) => s.cutHere);
  const skipLabelHere = useApp((s) => s.skipLabelHere);
  const undoSkip = useApp((s) => s.undoSkip);
  const clearSelection = useApp((s) => s.clearSelection);

  const state = { templates, templateId, order, cuts, skips } as Parameters<typeof currentAssignments>[0];
  const tpl = currentTemplate(state);

  // 「次に振られる」名前をプレビュー（飛ばし・区切りを反映した状態で1枚先を覗く）
  const assigns = currentAssignments({ ...state, order: [...order, "__peek__"] } as typeof state);
  const nextA = assigns[order.length];
  const nextLabel = nextA && nextA.labelIndex ? labelName(tpl, nextA.labelIndex) : "";
  const nextName = nextA ? `${buildStem(tpl, nextA)}${nextLabel ? " " + nextLabel : ""}` : "";

  // まだ写真を割り当てていない「飛ばし」の数（取り消し可能な分）
  const pendingSkips = skips.filter((k) => k === order.length).length;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-white px-3 py-2 text-sm">
      <label className="flex items-center gap-1">
        <span className="text-slate-500">種別</span>
        <select
          value={templateId}
          onChange={(e) => setTemplate(e.target.value)}
          className="rounded border px-2 py-1"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1">
        <span className="text-slate-500">選択</span>
        <span className="font-bold">{order.length}</span>
        <span className="text-slate-400">枚</span>
      </div>

      {nextName && (
        <div className="flex items-center gap-1 rounded bg-brand/10 px-2 py-1 text-brand-dark">
          <span className="text-slate-500">次:</span>
          <span className="font-bold">{nextName}</span>
          {pendingSkips > 0 && (
            <button
              onClick={undoSkip}
              title="直前の「飛ばす」を取り消す"
              className="ml-1 rounded border border-brand/40 px-1.5 text-xs text-brand-dark hover:bg-white"
            >
              ↩ 飛ばし取消
            </button>
          )}
        </div>
      )}

      <div className="ml-auto flex flex-wrap gap-2">
        {tpl.mode === "cycle" && nextLabel && (
          <button
            onClick={skipLabelHere}
            title={`この箇所に「${nextLabel}」の写真が無い場合に押す`}
            className="rounded border border-amber-500 px-3 py-1 font-medium text-amber-700 hover:bg-amber-50"
          >
            {nextLabel}なし（飛ばす）
          </button>
        )}
        {tpl.mode !== "serial" && (
          <button
            onClick={cutHere}
            className="rounded border border-brand px-3 py-1 font-medium text-brand-dark hover:bg-brand/5"
          >
            次の{tpl.mode === "cycle" ? "箇所" : "群"}へ →
          </button>
        )}
        <button
          onClick={clearSelection}
          className="rounded border px-3 py-1 text-slate-600 hover:bg-slate-50"
        >
          選択クリア
        </button>
      </div>
    </div>
  );
}
