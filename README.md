# Threads Research Studio

Threadsで伸びている価値提供型の投稿を、毎日キュレーションしてサイトに公開するツール。

## サイト

🌐 https://threads-research-studio.vercel.app  
（デプロイ後にURLを更新）

## ローカル運用フロー

### 1. ジャンル別リサーチ（毎朝）

```bash
cd ~/Documents/projects/threads-research-tool
claude --chrome
```

Claude Code 起動後、`prompts/<ジャンル名>.txt` の中身を貼り付けて実行。

### 2. データ統合 → サイトに反映

```bash
python3 build_data.py
git add .
git commit -m "update data"
git push
```

→ Vercel が自動デプロイ。1分後にサイトに反映。

## ファイル構成

```
.
├── site/                  # 配布する静的サイト
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── data.json          # build_data.py が生成
├── prompts/               # claude --chrome に貼り付ける用
│   └── <ジャンル>.txt
├── results/               # リサーチ結果の蓄積
│   ├── by-genre/
│   └── by-account/
├── criteria/              # 判定基準
│   ├── howto-judgment.md
│   ├── uranai-judgment.md
│   └── observed-accounts.md
├── procedures/            # リサーチ手順テンプレート
│   ├── genre-research.md
│   └── account-research.md
├── genres/                # ジャンル設定
│   └── <ジャンル>.json
├── server/                # （旧設計の残骸 — 配布版では未使用）
└── build_data.py          # 結果統合スクリプト
```

## 対象ジャンル

- 美容 / 育児 / お金 / 恋愛 / 占い / AI / 転職 / 健康 / ダイエット
