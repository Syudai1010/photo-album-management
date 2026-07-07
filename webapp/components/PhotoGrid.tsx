"use client";
import { useMemo } from "react";
import { useApp, currentTemplate, currentAssignments } from "@/lib/store";
import { buildStem, labelName } from "@/lib/naming";
import { PhotoCard } from "./PhotoCard";

export function PhotoGrid() {
  const photos = useApp((s) => s.photos);
  const order = useApp((s) => s.order);
  const cuts = useApp((s) => s.cuts);
  const templateId = useApp((s) => s.templateId);
  const templates = useApp((s) => s.templates);
  const toggle = useApp((s) => s.toggle);

  // 選択順 index と割り当て名を計算
  const info = useMemo(() => {
    const state = { templates, templateId, order, cuts } as Parameters<typeof currentAssignments>[0];
    const tpl = currentTemplate(state);
    const assigns = currentAssignments(state);
    const map = new Map<string, { pos: number; badge: string; label: string }>();
    order.forEach((id, i) => {
      const a = assigns[i];
      map.set(id, {
        pos: i,
        badge: buildStem(tpl, a),
        label: labelName(tpl, a.labelIndex),
      });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, order, cuts, templateId, templates]);

  if (photos.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        フォルダを開いて写真を読み込んでください
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 p-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {photos.map((p) => {
        const i = info.get(p.id);
        return (
          <PhotoCard
            key={p.id}
            photo={p}
            selectedOrder={i ? i.pos : null}
            badge={i ? i.badge : null}
            label={i ? i.label : null}
            onToggle={toggle}
          />
        );
      })}
    </div>
  );
}
