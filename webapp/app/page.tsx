"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { TemplateBar } from "@/components/TemplateBar";
import { PhotoGrid } from "@/components/PhotoGrid";
import { ActionPanel } from "@/components/ActionPanel";

export default function Home() {
  const init = useApp((s) => s.init);
  const canDirect = useApp((s) => s.canDirect);
  const loading = useApp((s) => s.loading);
  const loadMode = useApp((s) => s.loadMode);
  const photoCount = useApp((s) => s.photos.length);
  const openDirectory = useApp((s) => s.openDirectory);
  const openFallback = useApp((s) => s.openFallback);
  const setSortByDate = useApp((s) => s.setSortByDate);
  const setSortByName = useApp((s) => s.setSortByName);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => init(), [init]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col bg-white shadow">
      {/* ヘッダ */}
      <header className="flex items-center gap-2 border-b bg-slate-800 px-3 py-2 text-white">
        <h1 className="text-base font-bold">工事写真整理</h1>
        <span className="text-xs text-slate-300">選別 → 採番 → 一括リネーム</span>
        <Link
          href="/album"
          className="ml-auto rounded bg-brand px-3 py-1 text-sm font-medium hover:bg-brand-dark"
        >
          写真帳を作る →
        </Link>
      </header>

      {/* フォルダ操作 */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50 px-3 py-2 text-sm">
        {canDirect ? (
          <button
            onClick={() => openDirectory()}
            className="rounded bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark"
          >
            フォルダを開く（直接リネーム）
          </button>
        ) : (
          <>
            <button
              onClick={() => fileInput.current?.click()}
              className="rounded bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark"
            >
              写真フォルダを選ぶ
            </button>
            <input
              ref={fileInput}
              type="file"
              // @ts-expect-error webkitdirectory は非標準属性
              webkitdirectory=""
              directory=""
              multiple
              accept="image/*"
              hidden
              onChange={(e) => e.target.files && openFallback(e.target.files)}
            />
          </>
        )}

        {photoCount > 0 && (
          <>
            <span className="text-slate-500">{photoCount}枚</span>
            <span className="ml-2 text-slate-400">並び:</span>
            <button onClick={() => setSortByDate(true)} className="rounded border px-2 py-1">撮影日↑</button>
            <button onClick={() => setSortByDate(false)} className="rounded border px-2 py-1">撮影日↓</button>
            <button onClick={() => setSortByName()} className="rounded border px-2 py-1">名前</button>
          </>
        )}

        <span className="ml-auto text-xs text-slate-400">
          {loadMode === "direct"
            ? "直接リネームモード（PC）"
            : loadMode === "fallback"
              ? "ZIP出力モード"
              : canDirect
                ? "PC: フォルダ内で直接リネーム可"
                : "スマホ/Safari: ZIP出力方式"}
        </span>
      </div>

      <TemplateBar />

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-slate-400">読み込み中...</div>
        ) : (
          <PhotoGrid />
        )}
      </div>

      <ActionPanel />
    </main>
  );
}
