#!/bin/bash
# ============================================
# Threads Research Studio - 起動スクリプト（Mac用）
# ダブルクリックで起動できます
# ============================================

# このスクリプトがあるフォルダに移動
cd "$(dirname "$0")"

echo ""
echo "============================================"
echo "  🧵 Threads Research Studio"
echo "============================================"
echo ""

# Python 3 が入っているか確認
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 が見つかりません。"
    echo ""
    echo "macOSには通常Python 3が標準搭載されています。"
    echo "確認するには、ターミナルで以下を実行してください："
    echo "  python3 --version"
    echo ""
    echo "見つからない場合は https://python.org からインストールしてください。"
    echo ""
    read -p "Enterキーを押すと閉じます..."
    exit 1
fi

# Flask が入っているか確認、なければインストール
if ! python3 -c "import flask" &> /dev/null; then
    echo "📦 Flask（必要なライブラリ）をインストールします..."
    echo ""
    pip3 install -r server/requirements.txt
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Flask のインストールに失敗しました。"
        echo "手動で次のコマンドを実行してください："
        echo "  pip3 install flask"
        echo ""
        read -p "Enterキーを押すと閉じます..."
        exit 1
    fi
    echo "✅ インストール完了"
    echo ""
fi

# サーバーを起動
echo "🚀 サーバーを起動します..."
echo ""
python3 server/app.py

# サーバーが終了したら一時停止
echo ""
read -p "Enterキーを押すと閉じます..."
