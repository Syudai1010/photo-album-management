import { describe, it, expect } from "vitest";
import {
  DEFAULT_TEMPLATES,
  buildStem,
  labelName,
  recomputeSequence,
  sanitizeFilename,
  isValidFilename,
  extname,
  type Template,
} from "./naming";

const valve = DEFAULT_TEMPLATES.find((t) => t.id === "valve")!;
const panorama = DEFAULT_TEMPLATES.find((t) => t.id === "panorama")!;
const other = DEFAULT_TEMPLATES.find((t) => t.id === "other")!;

describe("弁栓 cycle: V{箇所}-{ラベル}", () => {
  it("箇所ごとの枚数可変 [4,2,4,4,4] で実データ V1-1..V5-4 と一致", () => {
    // 佐波川の実データ: 箇所1=4枚, 箇所2=2枚, 箇所3=4枚, 箇所4=4枚, 箇所5=4枚
    const counts = [4, 2, 4, 4, 4];
    const total = counts.reduce((a, b) => a + b, 0);
    // カット位置（各箇所の最後のorder）を計算。ただし4枚(サイクル満了)は自動で箇所が進むのでカット不要。
    const cuts = new Set<number>();
    let order = 0;
    counts.forEach((c) => {
      order += c;
      if (c < valve.labels.length) cuts.add(order - 1); // 途中カットのみ明示
    });
    const seq = recomputeSequence(valve, total, cuts);
    const names = seq.map((a) => buildStem(valve, a));
    expect(names).toEqual([
      "V1-1", "V1-2", "V1-3", "V1-4",
      "V2-1", "V2-2",
      "V3-1", "V3-2", "V3-3", "V3-4",
      "V4-1", "V4-2", "V4-3", "V4-4",
      "V5-1", "V5-2", "V5-3", "V5-4",
    ]);
  });

  it("ラベル番号→メモ語のマッピング", () => {
    expect(labelName(valve, 1)).toBe("全景");
    expect(labelName(valve, 2)).toBe("接写");
    expect(labelName(valve, 3)).toBe("内部");
    expect(labelName(valve, 4)).toBe("測定");
    expect(labelName(valve, 5)).toBe(""); // 範囲外
  });
});

describe("全景 serial: P{連番2桁}", () => {
  it("P01..P22 のゼロ埋め連番", () => {
    const seq = recomputeSequence(panorama, 22);
    const names = seq.map((a) => buildStem(panorama, a));
    expect(names[0]).toBe("P01");
    expect(names[8]).toBe("P09");
    expect(names[9]).toBe("P10");
    expect(names[21]).toBe("P22");
  });
});

describe("その他 group-serial: S{群}-{連番}", () => {
  it("S1-1..S1-7, S2-1, S3(=S3-1) の群・連番", () => {
    // 群1=7枚, 群2=1枚, 群3=1枚
    const counts = [7, 1, 1];
    const total = counts.reduce((a, b) => a + b, 0);
    const cuts = new Set<number>();
    let order = 0;
    counts.forEach((c, idx) => {
      order += c;
      if (idx < counts.length - 1) cuts.add(order - 1);
    });
    const seq = recomputeSequence(other, total, cuts);
    const names = seq.map((a) => buildStem(other, a));
    expect(names).toEqual([
      "S1-1", "S1-2", "S1-3", "S1-4", "S1-5", "S1-6", "S1-7",
      "S2-1",
      "S3-1",
    ]);
  });
});

describe("サニタイズ (pathsafe.py 相当)", () => {
  it("無効文字を検出・置換", () => {
    expect(isValidFilename("V1-1")).toBe(true);
    expect(isValidFilename("a/b")).toBe(false);
    expect(isValidFilename("a:b")).toBe(false);
    expect(sanitizeFilename("a/b:c")).toBe("a_b_c");
    expect(sanitizeFilename("  .name. ")).toBe("name");
    expect(sanitizeFilename("///")).toBe("___"); // 無効文字は置換されるが空にはならない
    expect(sanitizeFilename("  .  ")).toBe("unnamed"); // 空になった場合のみ unnamed
  });
  it("Windows予約語", () => {
    expect(isValidFilename("CON.jpg")).toBe(false);
    expect(isValidFilename("LPT1.png")).toBe(false);
    expect(isValidFilename("console.jpg")).toBe(true);
  });
  it("拡張子抽出", () => {
    expect(extname("IMG_0001.JPG")).toBe(".jpg");
    expect(extname("photo.heic")).toBe(".heic");
    expect(extname("noext")).toBe("");
  });
});
