# server/

Pythonサーバーのコードを置く場所。

## 予定されるファイル

- `app.py` — サーバー本体。サイトを配信し、Claude Codeを起動する
- `requirements.txt` — 必要なPythonライブラリの一覧

## 役割

1. サイト（`../site/index.html`）をブラウザに配信する
2. ジャンル/アカウントモードの実行リクエストを受ける
3. プロンプトを組み立てて `claude --chrome` を起動する
4. 結果ファイル（`../results/`）を読み取ってサイトに返す
