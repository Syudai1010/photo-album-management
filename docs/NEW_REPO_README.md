# 写真帳管理アプリ（photo-album-management2）

現地調査の写真を **タップした順に自動採番して一括リネーム** し、そのまま **写真帳（Excel）を作成** する Web アプリです。
すべての処理はブラウザ内で完結し、写真は外部へ送信されません。PC・スマホの両方で動作します。

> 旧リポジトリ `photo-album-management` の Web アプリ版（`webapp/`）を、Next.js を直下に置く構成で整理し直したものです。
> 旧 PySide6 デスクトップ版・旧 HTML 版は旧リポジトリに残しています。

## 機能

### 選別 → 自動採番 → 一括リネーム
- フォルダ（またはスマホの写真ライブラリ）から写真を読み込み、撮影日時順にサムネイル表示
- 調査種別（弁栓 / メーター / 全景 / その他）を選び、写真をタップした順に `V1-1 全景` → `V1-2 接写` … と自動採番
- **「◯◯なし（飛ばす）」** … 同じ箇所で特定のラベルが無いとき（例：接写なし → `V1-1` の次が `V1-3`）
- **「次の箇所へ」** … 箇所を切り上げる（例：2枚しか撮っていない箇所）
- **PC（Chrome / Edge）**：フォルダ内で直接リネーム＋Undo（取り消しマップをフォルダに保存）
- **スマホ / Safari / Firefox**：リネーム済み写真を ZIP で書き出し（元ファイルは変更しない）
- メモ用データ（No. → ラベル名）を クリップボード / TSV / CSV / JSON で出力 → 既存 Excel マクロのメモ欄へ貼り付け可能

### 写真帳エディタ → .xlsx 出力
- 選択した写真からシートを作成し、A4 紙面プレビューで編集
- レイアウト（2/3/4/6/8 枚）、余白コマ挿入、コマ移動、メモ編集、撮影日表示
- 番号モード：コマ毎（SerialNumbering 相当）/ 写真毎（PictureNumbering 相当）
- 画像埋込済みの `.xlsx` を生成（マクロ無し）

## 命名規則

| 種別 | 形式 | 例 | ラベル番号 |
|---|---|---|---|
| 弁栓 | `V{箇所}-{ラベル}` | `V1-1`, `V1-2`, … `V5-4` | 1=全景 2=接写 3=内部 4=測定 |
| メーター | `M{箇所}-{ラベル}` | `M1-1`, … | 1=全景 2=近景 3=接写 4=内部 |
| 全景 | `P{連番}` | `P01` … `P22` | （連番のみ） |
| その他資料 | `S{群}-{連番}` | `S1-1` … `S1-7`, `S2-1` | （群 × 連番） |

実際の写真帳（Excel）に貼られていた写真名の解析結果に合わせています。
箇所ごとの枚数は可変で、途中のラベルが無い場合も番号は詰めません（`V1-1`, `V1-3`, `V1-4` のように、番号がラベルの意味を保ちます）。

## 開発フロー

正本は GitHub の `main` ブランチです。作業はローカルで行い、Pull Request を経て `main` へ取り込みます。
`main` が更新されると Vercel が自動で本番へデプロイします。

```
C:\work\01_projects\写真帳管理アプリ   ← ローカル作業フォルダ
   │  git push（作業ブランチ）
   ▼
GitHub  ── Pull Request ──▶ main ──自動──▶ Vercel 本番
```

### 初回セットアップ（PowerShell）

```powershell
cd C:\work\01_projects
git clone https://github.com/Syudai1010/photo-album-management2.git 写真帳管理アプリ
cd 写真帳管理アプリ
npm install
npm run dev        # http://localhost:3000
```

Node.js 18.17 以上が必要です。

### 変更を加えるとき

```powershell
git checkout -b feature/変更内容        # 作業ブランチを切る
# …編集…
npm test                                 # ユニットテスト
npm run build                            # 本番ビルド確認
git add -A
git commit -m "変更内容"
git push -u origin feature/変更内容
```

GitHub 上で Pull Request を作成し、確認のうえ `main` へマージします。マージ後は作業ブランチを削除してください（ブランチが増えすぎるのを防ぐため）。

### バージョン管理（タグ）

節目のバージョンはタグで固定します。

```powershell
git tag -a v1.1.0 -m "説明"
git push origin v1.1.0
```

| タグ | 内容 |
|---|---|
| `v1.0.0` | 初版。選別・リネーム・写真帳 Excel 出力・飛ばすボタン・スマホ対応まで |

## Vercel デプロイ

1. [vercel.com](https://vercel.com) に GitHub アカウントでログイン
2. 「Add New… → Project」で `photo-album-management2` を Import
3. そのまま **Deploy**（Next.js が直下にあるため Root Directory の設定は不要）

以後は `main` へのマージごとに自動で再デプロイされます。

## スクリプト

```bash
npm run dev      # 開発サーバ
npm test         # ユニットテスト（vitest）
npm run build    # 本番ビルド
npm start        # 本番サーバ（ローカル確認用）
```

## 構成

```
.
├── app/
│   ├── page.tsx          # 選別・採番・リネーム画面
│   └── album/page.tsx    # 写真帳エディタ
├── components/           # PhotoGrid, PhotoCard, TemplateBar, ActionPanel
├── lib/
│   ├── naming.ts         # 命名エンジン（純関数・テスト有）
│   ├── album.ts          # 写真帳データモデル（純関数・テスト有）
│   ├── fsAccess.ts       # フォルダ直接リネーム＋Undo
│   ├── zipExport.ts      # ZIP フォールバック
│   ├── exif.ts           # 撮影日時読取
│   ├── memoExport.ts     # メモ出力
│   ├── xlsxExport.ts     # .xlsx 生成（exceljs）
│   └── store.ts          # 状態管理（Zustand）
└── docs/
    ├── PLAN.md           # 実装計画（背景・フェーズ・設計）
    └── FIX_PLAN.md       # 修正計画・既知の制約
```

## 技術

Next.js 14 (App Router) / TypeScript / Tailwind CSS / Zustand / exifr / JSZip / exceljs / File System Access API

## 既知の制約

- スマホではブラウザの制約によりフォルダ内の直接リネームはできません（ZIP 方式）
- Excel 出力はマクロ無しの `.xlsx` です
- iPhone の HEIC 写真はブラウザによってサムネイルが表示されない場合があります
- 直接リネームは実ファイル名を変更します。初回はコピーしたフォルダでお試しください（Undo あり）
