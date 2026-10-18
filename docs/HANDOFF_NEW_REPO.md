# 引き継ぎ：photo-album-management2 の作成手順

このブランチ（`claude/program-code-review-c8269q`）の `webapp/` が **最新版の完成コード**です
（飛ばすボタン・iPhone修正・箇所番号修正まで含む。テスト24件パス・ビルド成功を確認済み）。

これを Next.js 直下構成の新リポジトリ `photo-album-management2` に移し、
`C:\work\01_projects\写真帳管理アプリ` を正本として運用するための手順です。
**別のセッション（ローカルの Claude Code / Claude デスクトップ / 人手）でそのまま実行できます。**

## 0. 前提（あなたのPC）

- Git、Node.js 18.17+ がインストール済み
- GitHub に `photo-album-management2`（Private・空）を作成済み
  - GitHub CLI があれば: `gh repo create photo-album-management2 --private`
  - 無ければ https://github.com/new で作成（README等は追加しない）

## 1. PowerShell で実行（コピペ可）

```powershell
# 最新コードを一時フォルダに取得
cd C:\work\01_projects
git clone -b claude/program-code-review-c8269q https://github.com/Syudai1010/photo-album-management.git _src

# 新しい作業フォルダを作り、webapp の中身を直下にコピー（node_modules/.next は除外）
New-Item -ItemType Directory -Force 写真帳管理アプリ | Out-Null
robocopy _src\webapp 写真帳管理アプリ /E /XD node_modules .next /XF *.tsbuildinfo next-env.d.ts README.md | Out-Null
New-Item -ItemType Directory -Force 写真帳管理アプリ\docs | Out-Null
Copy-Item _src\docs\PLAN.md, _src\docs\FIX_PLAN.md 写真帳管理アプリ\docs\
Copy-Item _src\docs\NEW_REPO_README.md 写真帳管理アプリ\README.md

# .gitignore
@"
node_modules/
.next/
out/
dist/
*.tsbuildinfo
next-env.d.ts
.env*.local
.vercel
"@ | Set-Content -Encoding UTF8 写真帳管理アプリ\.gitignore

# 動作確認
cd 写真帳管理アプリ
npm install
npm test
npm run build

# 初期コミット・タグ・push
git init -b main
git add -A
git commit -m "写真帳管理アプリ v1.0.0（Next.js 直下構成）"
git tag -a v1.0.0 -m "v1.0.0 初版"
git remote add origin https://github.com/Syudai1010/photo-album-management2.git
git push -u origin main
git push origin v1.0.0

# 一時フォルダを削除
cd ..
Remove-Item -Recurse -Force _src
```

## 2. Vercel

1. vercel.com に GitHub でログイン → Add New… → Project
2. `photo-album-management2` を Import
3. そのまま Deploy（Next.js が直下にあるため Root Directory 設定は不要）

## 3. 以後の開発フロー

`C:\work\01_projects\写真帳管理アプリ` で作業ブランチを切る → push → GitHub で PR → main へマージ → Vercel 自動デプロイ。
詳細は新リポジトリの README（= `docs/NEW_REPO_README.md`）を参照。

## 補足

- 旧リポジトリ `photo-album-management` には `v2.0` タグ（PR #4 時点の main）が既にある。
  このブランチ先端（最新版）にタグを残したい場合はローカルから `git tag -a webapp-v1.0.0 6ed1142 && git push origin webapp-v1.0.0`。
- 旧リポジトリは移行後、アーカイブ（Settings → Archive this repository）しておくと混乱しない。
