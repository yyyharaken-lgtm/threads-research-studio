#!/bin/bash
# ============================================
# 🌙 寝る前リサーチ開始
#   ダブルクリックすると：
#   0. 事前チェック（claude / Chrome / プロンプト）
#   1. ターミナルを自動で開く
#   2. claude --chrome を起動
#   3. 全ジャンル一括プロンプトを自動ペースト
#   4. Enter を自動で押す
#   → あとは寝るだけ
# ============================================

PROJECT_DIR="$HOME/Documents/projects/threads-research-tool"
PROMPT_FILE="$PROJECT_DIR/prompts/_全ジャンル一括.txt"

# 0-a. macOS の PATH でよく見る場所を明示的に追加（GUIから起動された時のPATHは狭いため）
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"

# 0-b. claude コマンド存在チェック
if ! command -v claude &> /dev/null; then
    osascript <<'DIALOG'
display dialog "❌ claude コマンドが見つかりません。

修復コマンド（ターミナルで実行）:
  npm install -g @anthropic-ai/claude-code

修復後、再度このスクリプトをダブルクリックしてください。" buttons {"OK"} default button "OK" with icon caution with title "Threads Research - 起動エラー"
DIALOG
    exit 1
fi

# 0-c. Chrome が起動中かチェック
if ! pgrep -x "Google Chrome" > /dev/null; then
    RESPONSE=$(osascript <<'DIALOG'
display dialog "⚠️ Google Chrome が起動していません。

claude --chrome は Chrome 拡張機能に接続するため、Chrome が起動していないと動作しません。

Chrome を起動してから続行しますか？" buttons {"キャンセル", "Chromeを起動して続行"} default button "Chromeを起動して続行" with icon caution with title "Threads Research - Chrome未起動"
DIALOG
)
    if [[ "$RESPONSE" == *"キャンセル"* ]]; then
        exit 0
    fi
    open -a "Google Chrome"
    sleep 3
fi

# 0-d. プロンプトファイル存在チェック
if [ ! -f "$PROMPT_FILE" ]; then
    osascript -e 'display dialog "❌ プロンプトファイルが見つかりません:

'"$PROMPT_FILE"'" buttons {"OK"} default button "OK" with icon stop'
    exit 1
fi

echo "✅ 事前チェック OK"
echo "  - claude: $(which claude)"
echo "  - Chrome: 起動中"
echo "  - prompt: $PROMPT_FILE"
echo ""

# 1. プロンプトをクリップボードにコピー
cat "$PROMPT_FILE" | pbcopy

# 2. Terminal で claude --chrome を起動
osascript <<EOF
tell application "Terminal"
    activate
    do script "cd \"$PROJECT_DIR\" && claude --chrome"
end tell
EOF

# 3. claude が起動して入力欄が準備できるまで待機
#    重い環境や初回起動時のためのマージンを確保
echo "⏳ claude --chrome の起動を待機中（15秒）..."
sleep 15

# 4. クリップボードの内容を Terminal に貼り付け → Enter
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
