"use client";
import { memo } from "react";
import type { PhotoItem } from "@/lib/store";

interface Props {
  photo: PhotoItem;
  selectedOrder: number | null; // 選択順（0-based）。未選択は null
  badge: string | null; // 割り当て名（例 "V1-2"）
  label: string | null; // ラベル（例 "接写"）
  onToggle: (id: string) => void;
}

function PhotoCardInner({ photo, selectedOrder, badge, label, onToggle }: Props) {
  const selected = selectedOrder !== null;
  return (
    <button
      type="button"
      onClick={() => onToggle(photo.id)}
      className={`relative block w-full overflow-hidden rounded-lg border-2 transition ${
        selected ? "border-brand ring-2 ring-brand/40" : "border-slate-200"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.name}
        loading="lazy"
        className="aspect-square w-full object-cover bg-slate-100"
      />
      {selected && (
        <span className="absolute left-1 top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-white shadow">
          {selectedOrder! + 1}
        </span>
      )}
      {badge && (
        <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-center text-xs font-bold text-white">
          {badge}
          {label ? ` ${label}` : ""}
        </span>
      )}
    </button>
  );
}

export const PhotoCard = memo(PhotoCardInner);
