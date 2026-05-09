#!/bin/bash
# ============================================
# 🌙 寝る前リサーチ開始
#   ダブルクリックすると：
#   1. ターミナルを自動で開く
#   2. claude --chrome を起動
#   3. 全ジャンル一括プロンプトを自動ペースト
#   4. Enter を自動で押す
#   → あとは寝るだけ
# ============================================

PROJECT_DIR="$HOME/Documents/projects/threads-research-tool"
PROMPT_FILE="$PROJECT_DIR/prompts/_全ジャンル一括.txt"

# プロンプトファイルが存在するか確認
if [ ! -f "$PROMPT_FILE" ]; then
    osascript -e 'display dialog "プロンプトファイルが見つかりません: '"$PROMPT_FILE"'" buttons {"OK"} default button "OK"'
    exit 1
fi

# プロンプトをクリップボードにコピー
cat "$PROMPT_FILE" | pbcopy

# Terminal で claude --chrome を起動
osascript <<EOF
tell application "Terminal"
    activate
    do script "cd \"$PROJECT_DIR\" && claude --chrome"
end tell
EOF

# claude が起動するまで待機（10秒）
echo "⏳ claude --chrome の起動を待機中（10秒）..."
sleep 10

# クリップボードの内容を Terminal に貼り付け → Enter
osascript <<'EOF'
tell application "Terminal" to activate
delay 0.5

tell application "System Events"
    tell process "Terminal"
        -- Cmd+V でペースト
        keystroke "v" using {command down}
        delay 3
        -- Return キーで実行
        key code 36
    end tell
end tell
EOF

echo ""
echo "✅ プロンプトを送信しました。"
echo "💤 Claude が自動でリサーチを進めます（約2時間）。"
echo "🌅 朝起きたら ☀️ 朝サイト更新.command をダブルクリックしてください。"
echo ""
echo "（このウィンドウは閉じてOK。Terminalの claude タブは絶対に閉じないで！）"
echo ""
echo "  → このウィンドウは右上の × ボタンで閉じてOK"
echo ""

# プロセスをきれいに終わらせる（確認ダイアログを出さないため）
exit 0
