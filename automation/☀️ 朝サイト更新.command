#!/bin/bash
# ============================================
# ☀️ 朝サイト更新
#   ダブルクリックすると：
#   1. リサーチ結果を集計（build_data.py）
#   2. git push でサイトに自動反映
#   → 朝のチェック作業がワンクリックで完了
# ============================================

PROJECT_DIR="$HOME/Documents/projects/threads-research-tool"
cd "$PROJECT_DIR" || exit 1

echo "============================================"
echo "  ☀️  Threads Research Studio - サイト更新"
echo "============================================"
echo ""

# Step 1: 結果ファイルの確認
echo "[1/4] 昨夜のリサーチ結果を確認中..."
TODAY=$(date +%Y-%m-%d)
COUNT=0
for genre_dir in results/by-genre/*/; do
    GENRE=$(basename "$genre_dir")
    LATEST=$(ls -t "$genre_dir" 2>/dev/null | head -1)
    if [ -n "$LATEST" ]; then
        echo "  ✓ $GENRE: $LATEST"
        COUNT=$((COUNT + 1))
    else
        echo "  ✗ $GENRE: ファイルなし"
    fi
done
echo "  → ${COUNT} ジャンルにデータあり"
echo ""

# Step 2: build_data.py 実行
echo "[2/4] データを統合中..."
python3 build_data.py 2>&1 | tail -15
echo ""

# Step 3: git status で変更を確認
echo "[3/4] 変更を確認..."
CHANGED=$(git status --short | wc -l | tr -d ' ')
if [ "$CHANGED" = "0" ]; then
    echo "  ⚠️  変更なし。リサーチ結果が新しく追加されていない可能性があります。"
    echo ""
    read -p "それでも続行しますか？ (y/N): " yn
    case $yn in
        [Yy]*) ;;
        *) echo "終了します。"; read -p "Enter で閉じる..."; exit 0 ;;
    esac
else
    echo "  ✓ ${CHANGED} ファイルに変更あり"
fi
echo ""

# Step 4: git commit & push
echo "[4/4] サイトに反映中..."
git add .
COMMIT_MSG="Daily update: $(date +%Y-%m-%d)"
git commit -m "$COMMIT_MSG" 2>&1 | tail -3
git push 2>&1 | tail -5
echo ""

# 完了
echo "============================================"
echo "  ✨ 完了！"
echo "============================================"
echo ""
echo "サイトURL: https://threads-research-tool-two.vercel.app"
echo "30〜60秒後に自動デプロイされます。"
echo ""
read -p "Enterキーを押すと閉じます..."
