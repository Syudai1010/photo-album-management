# 工事写真整理 Webアプリ

現場写真を **タップした順に自動採番して一括リネーム**（フェーズ1）し、そのまま **写真帳（Excel）を作成**（フェーズ2）する Next.js アプリ。Vercelにデプロイ可能。すべての処理はブラウザ内で完結し、写真は外部へ送信されません。

## 機能

### フェーズ1: 選別 → 採番 → 一括リネーム
- フォルダを開いて写真を撮影日時順にサムネイル表示
- 種別テンプレート（弁栓/メーター/全景/その他）を選び、写真をタップした順に `V1-1 全景`, `V1-2 接写` … と自動採番
- 「次の箇所へ」で箇所を区切る（箇所ごとの枚数可変に対応）
- **PC（Chrome/Edge）**: フォルダ内で直接リネーム（＋Undo用マップをフォルダに保存）
- **スマホ/Safari/Firefox**: リネーム済み写真をZIPで書き出し（自動判定）
- メモ用データ（No.→ラベル名）を TSV/CSV/JSON・クリップボードで出力 → 既存Excel（工事写真帳マクロ）のメモ欄へ貼り付け可能

### フェーズ2: 写真帳エディタ → .xlsx 出力
- 選択した写真からシートを作成し、A4紙面プレビューで編集
- 3枚/4枚などのレイアウト、余白コマ挿入、コマ移動、メモ編集
- 番号モード: コマ毎（`SerialNumbering`相当）/ 写真毎（`PictureNumbering`相当）
- 撮影日表示のON/OFF
- 画像埋込済みの `.xlsx` を生成（exceljs、マクロ無し）

## 命名規則（実データ由来）

| 種別 | 形式 | 例 |
|---|---|---|
| 弁栓 | `V{箇所}-{ラベル}` | V1-1, V1-2 …（1=全景,2=接写,3=内部,4=測定） |
| メーター | `M{箇所}-{ラベル}` | M1-1 …（1=全景,2=近景,3=接写,4=内部） |
| 全景 | `P{連番}` | P01, P02 … |
| その他 | `S{群}-{連番}` | S1-1, S2-1 … |

## 開発

```bash
cd webapp
npm install
npm run dev      # http://localhost:3000
npm test         # 命名/アルバムエンジンのユニットテスト
npm run build    # 本番ビルド
```

## Vercelデプロイ

- Root Directory を `webapp` に設定して Import するだけ（追加設定不要）
- サーバ処理は無し（全てクライアントサイド）

## 技術

Next.js 14 (App Router) / TypeScript / Tailwind CSS / Zustand / exifr / JSZip / exceljs / File System Access API

## 構成

```
webapp/
├── app/
│   ├── page.tsx          # フェーズ1: 選別・リネーム
│   └── album/page.tsx    # フェーズ2: 写真帳エディタ
├── components/           # PhotoGrid, PhotoCard, TemplateBar, ActionPanel
└── lib/
    ├── naming.ts         # 命名エンジン（純関数・テスト有）
    ├── album.ts          # 写真帳データモデル（純関数・テスト有）
    ├── fsAccess.ts       # 直接リネーム＋Undo
    ├── zipExport.ts      # ZIPフォールバック
    ├── exif.ts           # 撮影日時読取
    ├── memoExport.ts     # メモ出力（TSV/CSV/JSON）
    ├── xlsxExport.ts     # .xlsx生成（exceljs）
    └── store.ts          # 状態管理（Zustand）
```
