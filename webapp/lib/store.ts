"use client";
/**
 * アプリ全体の状態（Zustand）。フェーズ1（選別・採番・リネーム）とフェーズ2（写真帳）を橋渡しする。
 */
import { create } from "zustand";
import {
  DEFAULT_TEMPLATES,
  type Template,
  type Assignment,
  recomputeSequence,
  buildStem,
  labelName,
  extname,
} from "./naming";
import {
  supportsDirectRename,
  pickDirectory,
  loadFromFileList,
  enumerateDirectory,
  type LoadedFile,
} from "./fsAccess";
import { readTakenAt, formatDateOnly } from "./exif";
import type { Album, AlbumSheet, Frame } from "./album";

export interface PhotoItem {
  id: string; // フォルダ内でユニーク（=元ファイル名）
  name: string;
  file: File;
  handle?: FileSystemFileHandle;
  takenAt: number; // epoch ms（ソート用）
  url: string; // サムネイル用 object URL
}

export type LoadMode = "direct" | "fallback";

interface AppState {
  // ---- フォルダ/写真 ----
  photos: PhotoItem[];
  dirHandle?: FileSystemDirectoryHandle;
  loadMode: LoadMode | null;
  loading: boolean;
  canDirect: boolean;

  // ---- 採番 ----
  templates: Template[];
  templateId: string;
  order: string[]; // 選択された photo id（タップ順）
  cuts: number[]; // 「次の箇所へ」を切ったorderインデックス（そのorderの後に切替）

  // ---- リネーム結果 ----
  lastUndoMap: { oldName: string; newName: string }[] | null;

  // ---- フェーズ2: 写真帳 ----
  album: Album;

  // ---- actions ----
  init: () => void;
  openDirectory: () => Promise<void>;
  rescan: () => Promise<void>;
  openFallback: (files: FileList | File[]) => Promise<void>;
  setSortByDate: (asc: boolean) => void;
  setSortByName: () => void;
  setTemplate: (id: string) => void;
  setTemplates: (t: Template[]) => void;
  toggle: (id: string) => void;
  cutHere: () => void;
  clearSelection: () => void;
  setUndoMap: (m: { oldName: string; newName: string }[] | null) => void;

  // フェーズ2
  addSheetFromSelection: () => void;
  updateSheet: (index: number, sheet: AlbumSheet) => void;
  removeSheet: (index: number) => void;
  getPhotoBlob: (photoId: string) => { blob: Blob; name: string } | undefined;
}

export const useApp = create<AppState>((set, get) => ({
  photos: [],
  dirHandle: undefined,
  loadMode: null,
  loading: false,
  canDirect: false,

  templates: DEFAULT_TEMPLATES,
  templateId: DEFAULT_TEMPLATES[0].id,
  order: [],
  cuts: [],

  lastUndoMap: null,
  album: { sheets: [] },

  init: () => set({ canDirect: supportsDirectRename() }),

  openDirectory: async () => {
    set({ loading: true });
    try {
      const sel = await pickDirectory();
      const photos = await toPhotoItems(sel.files);
      revokeAll(get().photos);
      set({
        photos: sortByDate(photos, true),
        dirHandle: sel.dirHandle,
        loadMode: "direct",
        order: [],
        cuts: [],
        lastUndoMap: null,
      });
    } finally {
      set({ loading: false });
    }
  },

  rescan: async () => {
    const { dirHandle } = get();
    if (!dirHandle) return;
    set({ loading: true });
    try {
      const files = await enumerateDirectory(dirHandle);
      const photos = await toPhotoItems(files);
      revokeAll(get().photos);
      set({ photos: sortByDate(photos, true), order: [], cuts: [] });
    } finally {
      set({ loading: false });
    }
  },

  openFallback: async (files) => {
    set({ loading: true });
    try {
      const sel = loadFromFileList(files);
      const photos = await toPhotoItems(sel.files);
      revokeAll(get().photos);
      set({
        photos: sortByDate(photos, true),
        dirHandle: undefined,
        loadMode: "fallback",
        order: [],
        cuts: [],
        lastUndoMap: null,
      });
    } finally {
      set({ loading: false });
    }
  },

  setSortByDate: (asc) => set({ photos: sortByDate(get().photos, asc) }),
  setSortByName: () =>
    set({ photos: get().photos.slice().sort((a, b) => a.name.localeCompare(b.name)) }),

  setTemplate: (id) => set({ templateId: id, order: [], cuts: [] }),
  setTemplates: (t) => set({ templates: t }),

  toggle: (id) => {
    const { order, cuts } = get();
    const pos = order.indexOf(id);
    if (pos >= 0) {
      // 選択解除: pos を除去し、後続の cut インデックスを1つ前へずらす
      const newOrder = order.filter((x) => x !== id);
      const newCuts = cuts
        .filter((c) => c !== pos)
        .map((c) => (c > pos ? c - 1 : c));
      set({ order: newOrder, cuts: newCuts });
    } else {
      set({ order: [...order, id] });
    }
  },

  cutHere: () => {
    const { order, cuts } = get();
    if (order.length === 0) return;
    const idx = order.length - 1;
    if (!cuts.includes(idx)) set({ cuts: [...cuts, idx] });
  },

  clearSelection: () => set({ order: [], cuts: [] }),

  setUndoMap: (m) => set({ lastUndoMap: m }),

  // ---- フェーズ2 ----

  addSheetFromSelection: () => {
    const state = get();
    const rows = buildPlanRows(state);
    if (rows.length === 0) return;
    const tpl = currentTemplate(state);
    const frames: Frame[] = rows.map((r) => ({
      kind: "photo",
      photoId: r.photo.id,
      memo: r.label,
      date: formatDateOnly(new Date(r.photo.takenAt)),
    }));
    const sheet: AlbumSheet = {
      id: `sheet_${state.album.sheets.length + 1}_${tpl.id}`,
      name: tpl.name,
      layout: 3,
      numbering: "perPhoto",
      showDate: true,
      frames,
    };
    set({ album: { sheets: [...state.album.sheets, sheet] } });
  },

  updateSheet: (index, sheet) => {
    const sheets = get().album.sheets.slice();
    sheets[index] = sheet;
    set({ album: { sheets } });
  },

  removeSheet: (index) => {
    const sheets = get().album.sheets.slice();
    sheets.splice(index, 1);
    set({ album: { sheets } });
  },

  getPhotoBlob: (photoId) => {
    const p = get().photos.find((x) => x.id === photoId);
    return p ? { blob: p.file, name: p.name } : undefined;
  },
}));

// ---- セレクタ的ヘルパ（コンポーネントから使用）----

export function currentTemplate(state: AppState): Template {
  return state.templates.find((t) => t.id === state.templateId) ?? state.templates[0];
}

/** 選択順の Assignment 配列を計算 */
export function currentAssignments(state: AppState): Assignment[] {
  const tpl = currentTemplate(state);
  return recomputeSequence(tpl, state.order.length, new Set(state.cuts));
}

export interface PlanRow {
  photo: PhotoItem;
  order: number;
  stem: string;
  newName: string;
  label: string;
}

/** リネーム計画（旧→新）を生成 */
export function buildPlanRows(state: AppState): PlanRow[] {
  const tpl = currentTemplate(state);
  const assigns = currentAssignments(state);
  const rows: PlanRow[] = [];
  state.order.forEach((id, i) => {
    const photo = state.photos.find((p) => p.id === id);
    if (!photo) return;
    const a = assigns[i];
    const stem = buildStem(tpl, a);
    const ext = extname(photo.name) || ".jpg";
    rows.push({
      photo,
      order: i,
      stem,
      newName: stem + ext,
      label: labelName(tpl, a.labelIndex),
    });
  });
  return rows;
}

// ---- 内部ユーティリティ ----

async function toPhotoItems(files: LoadedFile[]): Promise<PhotoItem[]> {
  return Promise.all(
    files.map(async (f) => ({
      id: f.name,
      name: f.name,
      file: f.file,
      handle: f.handle,
      takenAt: (await readTakenAt(f.file)).getTime(),
      url: URL.createObjectURL(f.file),
    }))
  );
}

function sortByDate(photos: PhotoItem[], asc: boolean): PhotoItem[] {
  return photos.slice().sort((a, b) => (asc ? a.takenAt - b.takenAt : b.takenAt - a.takenAt));
}

function revokeAll(photos: PhotoItem[]) {
  photos.forEach((p) => URL.revokeObjectURL(p.url));
}
