import { describe, it, expect } from "vitest";
import {
  type AlbumSheet,
  type Frame,
  computeNumbers,
  insertBlank,
  removeFrame,
  moveFrame,
  swapFrames,
  pageCount,
} from "./album";

function photo(id: string, memo = ""): Frame {
  return { kind: "photo", photoId: id, memo };
}
const blank: Frame = { kind: "blank" };

function sheet(frames: Frame[], over: Partial<AlbumSheet> = {}): AlbumSheet {
  return {
    id: "s1",
    name: "弁栓",
    layout: 3,
    numbering: "perFrame",
    showDate: false,
    frames,
    ...over,
  };
}

describe("番号振り 2モード", () => {
  const s = sheet([photo("a"), blank, photo("b"), photo("c")]);

  it("perFrame（コマ毎, SerialNumbering相当）は余白も番号を振る", () => {
    expect(computeNumbers({ ...s, numbering: "perFrame" })).toEqual([1, 2, 3, 4]);
  });

  it("perPhoto（写真毎, PictureNumbering相当）は写真のみ、余白はnull", () => {
    expect(computeNumbers({ ...s, numbering: "perPhoto" })).toEqual([1, null, 2, 3]);
  });
});

describe("余白コマ挿入で後続がずれる", () => {
  it("index=1 に余白を挿入すると後続が1つ後ろへ", () => {
    const s = sheet([photo("a"), photo("b"), photo("c")]);
    const s2 = insertBlank(s, 1);
    expect(s2.frames.map((f) => (f.kind === "photo" ? f.photoId : "_"))).toEqual([
      "a", "_", "b", "c",
    ]);
    // perPhoto番号: a=1, 余白=null, b=2, c=3
    expect(computeNumbers({ ...s2, numbering: "perPhoto" })).toEqual([1, null, 2, 3]);
  });

  it("削除で詰まる", () => {
    const s = sheet([photo("a"), blank, photo("b")]);
    const s2 = removeFrame(s, 1);
    expect(s2.frames.map((f) => (f.kind === "photo" ? f.photoId : "_"))).toEqual(["a", "b"]);
  });
});

describe("移動・入替", () => {
  it("moveFrame: 先頭を末尾へ", () => {
    const s = sheet([photo("a"), photo("b"), photo("c")]);
    const s2 = moveFrame(s, 0, 2);
    expect(s2.frames.map((f) => (f.kind === "photo" ? f.photoId : "_"))).toEqual([
      "b", "c", "a",
    ]);
  });
  it("swapFrames: 0 と 2 を入替", () => {
    const s = sheet([photo("a"), photo("b"), photo("c")]);
    const s2 = swapFrames(s, 0, 2);
    expect(s2.frames.map((f) => (f.kind === "photo" ? f.photoId : "_"))).toEqual([
      "c", "b", "a",
    ]);
  });
});

describe("ページ数計算", () => {
  it("3枚タイプ・7コマ → 3ページ", () => {
    const s = sheet(Array.from({ length: 7 }, (_, i) => photo(String(i))), { layout: 3 });
    expect(pageCount(s)).toBe(3);
  });
  it("空でも最低1ページ", () => {
    expect(pageCount(sheet([]))).toBe(1);
  });
});
