"""
Threads Research Studio — ローカルサーバー

役割：
1. サイト画面（../site/index.html）をブラウザに配信
2. ジャンル設定の取得API
3. リサーチ実行（claude --chrome を起動）
4. 結果ファイルの読み取り
5. 起動時の環境チェック
6. シャットダウン処理
"""

import json
import os
import shutil
import subprocess
import sys
import threading
import time
import webbrowser
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, request, send_file, send_from_directory

# ===== 設定 =====
PORT = 8000
ROOT = Path(__file__).resolve().parent.parent  # threads-research-tool/
SITE_DIR = ROOT / "site"
GENRES_DIR = ROOT / "genres"
PROCEDURES_DIR = ROOT / "procedures"
CRITERIA_DIR = ROOT / "criteria"
RESULTS_DIR = ROOT / "results"

app = Flask(__name__, static_folder=str(SITE_DIR))

# ===== 状態管理 =====
# 進行中のリサーチを記録するメモリ上のストア
# research_id をキーに、ステータス・進捗・結果を保持
research_jobs = {}


# ===== 起動時チェック =====
def check_environment():
    """必要な環境が揃っているかチェックする"""
    issues = []

    # Python バージョン確認
    if sys.version_info < (3, 8):
        issues.append(
            f"Python 3.8 以上が必要です。現在のバージョン：{sys.version.split()[0]}"
        )

    # Claude Code がインストールされているか確認
    if shutil.which("claude") is None:
        issues.append(
            "Claude Code がインストールされていません。\n"
            "  → https://claude.com/code からインストールしてください"
        )

    # 必須フォルダの存在確認
    for folder in [SITE_DIR, GENRES_DIR, PROCEDURES_DIR, CRITERIA_DIR]:
        if not folder.exists():
            issues.append(f"フォルダが見つかりません：{folder}")

    return issues


# ===== サイト配信 =====
@app.route("/")
def index():
    """サイトのトップページを配信"""
    index_path = SITE_DIR / "index.html"
    if not index_path.exists():
        return (
            "<h1>サイトファイルがまだ作成されていません</h1>"
            "<p>site/index.html を作成してください。</p>",
            200,
        )
    return send_from_directory(SITE_DIR, "index.html")


@app.route("/<path:path>")
def static_files(path):
    """サイトの静的ファイル（CSS・JS など）を配信"""
    return send_from_directory(SITE_DIR, path)


# ===== API: ジャンル一覧 =====
@app.route("/api/genres")
def list_genres():
    """登録されているジャンル一覧を返す"""
    genres = []
    for f in sorted(GENRES_DIR.glob("*.json")):
        try:
            with open(f, encoding="utf-8") as fh:
                genres.append(json.load(fh))
        except Exception as e:
            print(f"[警告] {f.name} の読み込みに失敗：{e}")
    return jsonify(genres)


@app.route("/api/genres/<name>")
def get_genre(name):
    """指定されたジャンルの設定を返す"""
    f = GENRES_DIR / f"{name}.json"
    if not f.exists():
        return jsonify({"error": "ジャンルが見つかりません"}), 404
    with open(f, encoding="utf-8") as fh:
        return jsonify(json.load(fh))


# ===== API: リサーチ実行 =====
@app.route("/api/research/genre", methods=["POST"])
def start_genre_research():
    """ジャンルモードのリサーチを開始する"""
    data = request.json or {}
    genre_name = data.get("genre")
    keywords = data.get("keywords", [])

    if not genre_name:
        return jsonify({"error": "ジャンル名が指定されていません"}), 400
    if not keywords:
        return jsonify({"error": "キーワードが指定されていません"}), 400

    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
    research_id = f"genre_{genre_name}_{timestamp}"

    research_jobs[research_id] = {
        "id": research_id,
        "mode": "genre",
        "genre": genre_name,
        "keywords": keywords,
        "status": "running",
        "step": "起動準備中...",
        "started_at": datetime.now().isoformat(),
        "result": None,
        "error": None,
    }

    # バックグラウンドスレッドでリサーチ実行
    thread = threading.Thread(
        target=run_genre_research,
        args=(research_id, genre_name, keywords),
        daemon=True,
    )
    thread.start()

    return jsonify({"research_id": research_id})


@app.route("/api/research/account", methods=["POST"])
def start_account_research():
    """アカウントモードのリサーチを開始する"""
    data = request.json or {}
    account_url = data.get("account_url")

    if not account_url:
        return jsonify({"error": "アカウントURLが指定されていません"}), 400

    # URLからアカウント名を抽出（@xxx の部分）
    account_name = account_url.rstrip("/").split("@")[-1]
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
    research_id = f"account_{account_name}_{timestamp}"

    research_jobs[research_id] = {
        "id": research_id,
        "mode": "account",
        "account_url": account_url,
        "account_name": account_name,
        "status": "running",
        "step": "起動準備中...",
        "started_at": datetime.now().isoformat(),
        "result": None,
        "error": None,
    }

    thread = threading.Thread(
        target=run_account_research,
        args=(research_id, account_url, account_name),
        daemon=True,
    )
    thread.start()

    return jsonify({"research_id": research_id})


# ===== API: リサーチ進捗取得 =====
@app.route("/api/research/<research_id>/status")
def research_status(research_id):
    """リサーチの進捗・結果を返す（フロントエンドがポーリング）"""
    if research_id not in research_jobs:
        return jsonify({"error": "リサーチが見つかりません"}), 404
    return jsonify(research_jobs[research_id])


# ===== API: 結果のMDダウンロード =====
@app.route("/api/research/<research_id>/download")
def download_md(research_id):
    """リサーチ結果をMD形式でダウンロード"""
    if research_id not in research_jobs:
        return jsonify({"error": "リサーチが見つかりません"}), 404

    job = research_jobs[research_id]
    if job["status"] != "completed" or not job["result"]:
        return jsonify({"error": "リサーチがまだ完了していません"}), 400

    md_content = generate_md_from_result(job)
    md_path = ROOT / "tmp" / f"{research_id}.md"
    md_path.parent.mkdir(parents=True, exist_ok=True)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    return send_file(md_path, as_attachment=True, download_name=f"{research_id}.md")


def generate_md_from_result(job):
    """JSONの結果からMD形式の文字列を生成"""
    lines = []
    if job["mode"] == "genre":
        lines.append(f"# {job['genre']}ジャンル リサーチ結果")
        lines.append(f"")
        lines.append(f"- 検索キーワード: {', '.join(job['keywords'])}")
        lines.append(f"- 実行日時: {job['started_at']}")
    else:
        lines.append(f"# @{job['account_name']} アカウント分析結果")
        lines.append(f"")
        lines.append(f"- アカウントURL: {job['account_url']}")
        lines.append(f"- 実行日時: {job['started_at']}")

    lines.append("")
    posts = job.get("result", {}).get("posts", [])
    lines.append(f"取得投稿数: {len(posts)}件")
    lines.append("")

    for i, post in enumerate(posts, 1):
        lines.append(f"## 投稿{i}：@{post.get('author_name', '?')}（いいね {post.get('likes', '?')}）")
        lines.append("")
        lines.append(f"- 投稿日: {post.get('posted_at', '?')}")
        lines.append(f"- URL: {post.get('post_url', '?')}")
        lines.append("")
        lines.append("**本文：**")
        lines.append("")
        lines.append(post.get("post_text", ""))
        lines.append("")
        lines.append("---")
        lines.append("")

    return "\n".join(lines)


# ===== API: シャットダウン =====
@app.route("/api/shutdown", methods=["POST"])
def shutdown():
    """サーバーを停止する（サイトの終了ボタン用）"""
    print("\n🔻 シャットダウンリクエストを受信しました。サーバーを停止します。")

    # 1秒後にプロセスを終了させる
    def stop():
        time.sleep(1)
        os._exit(0)

    threading.Thread(target=stop, daemon=True).start()
    return jsonify({"status": "shutting down"})


# ===== リサーチ実行ロジック =====
def run_genre_research(research_id, genre_name, keywords):
    """ジャンルモードのリサーチをバックグラウンドで実行"""
    job = research_jobs[research_id]

    try:
        # ジャンル設定を読み込む
        job["step"] = "ジャンル設定を読み込み中..."
        genre_file = GENRES_DIR / f"{genre_name}.json"
        with open(genre_file, encoding="utf-8") as f:
            genre_config = json.load(f)

        # 手順テンプレートを読み込む
        job["step"] = "手順テンプレートを読み込み中..."
        with open(PROCEDURES_DIR / "genre-research.md", encoding="utf-8") as f:
            template = f.read()

        # 出力先パスを決定
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
        output_dir = RESULTS_DIR / "by-genre" / genre_name
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{timestamp}.json"

        # プロンプトを組み立て
        prompt = template.replace("{{genre}}", genre_name)
        prompt = prompt.replace("{{keywords}}", ", ".join(keywords))
        prompt = prompt.replace("{{judgment_file}}", genre_config["judgment_file"])
        prompt = prompt.replace("{{output_path}}", str(output_path))

        # Claude Code 起動
        job["step"] = "Claude in Chrome を起動中..."
        execute_claude(prompt, output_path, job)

    except Exception as e:
        job["status"] = "failed"
        job["error"] = str(e)
        job["step"] = "エラーが発生しました"


def run_account_research(research_id, account_url, account_name):
    """アカウントモードのリサーチをバックグラウンドで実行"""
    job = research_jobs[research_id]

    try:
        # 手順テンプレートを読み込む
        job["step"] = "手順テンプレートを読み込み中..."
        with open(PROCEDURES_DIR / "account-research.md", encoding="utf-8") as f:
            template = f.read()

        # 出力先パスを決定
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
        output_dir = RESULTS_DIR / "by-account" / account_name
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{timestamp}.json"

        # 判定ファイルはデフォルトでハウツー系（占い系判定は別途設計）
        # TODO: アカウントから占い系か判別して切り替える
        judgment_file = "criteria/howto-judgment.md"

        # プロンプトを組み立て
        prompt = template.replace("{{account_url}}", account_url)
        prompt = prompt.replace("{{account_name}}", account_name)
        prompt = prompt.replace("{{judgment_file}}", judgment_file)
        prompt = prompt.replace("{{output_path}}", str(output_path))

        job["step"] = "Claude in Chrome を起動中..."
        execute_claude(prompt, output_path, job)

    except Exception as e:
        job["status"] = "failed"
        job["error"] = str(e)
        job["step"] = "エラーが発生しました"


def execute_claude(prompt, output_path, job):
    """Claude Code をサブプロセスで起動して、結果ファイルが出るのを待つ"""
    job["step"] = "Threadsを巡回してリサーチ中..."

    try:
        # claude --chrome -p "<prompt>" を実行
        # cwd を ROOT にして、相対パスが正しく解決されるようにする
        process = subprocess.Popen(
            ["claude", "--chrome", "-p", prompt],
            cwd=str(ROOT),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        # プロセスの完了を待つ（最大30分でタイムアウト）
        try:
            stdout, stderr = process.communicate(timeout=1800)
        except subprocess.TimeoutExpired:
            process.kill()
            job["status"] = "failed"
            job["error"] = "リサーチが30分以内に完了しませんでした（タイムアウト）"
            job["step"] = "タイムアウト"
            return

        if process.returncode != 0:
            job["status"] = "failed"
            job["error"] = f"Claude Code の実行に失敗しました：\n{stderr}"
            job["step"] = "実行失敗"
            return

        # 結果ファイルを読み込む
        job["step"] = "結果を読み込み中..."
        if not output_path.exists():
            job["status"] = "failed"
            job["error"] = f"結果ファイルが生成されませんでした：{output_path}"
            job["step"] = "結果ファイル不在"
            return

        with open(output_path, encoding="utf-8") as f:
            result = json.load(f)

        job["result"] = result
        job["status"] = "completed"
        job["step"] = "完了"
        job["finished_at"] = datetime.now().isoformat()

    except FileNotFoundError:
        job["status"] = "failed"
        job["error"] = "claude コマンドが見つかりません。Claude Code がインストールされているか確認してください。"
        job["step"] = "Claude Code 未検出"


# ===== メイン =====
def main():
    """サーバーを起動する"""
    print("=" * 60)
    print("  🧵 Threads Research Studio")
    print("=" * 60)

    # 環境チェック
    print("\n[1/3] 環境チェック中...")
    issues = check_environment()
    if issues:
        print("\n⚠️  環境チェックで問題が見つかりました：\n")
        for issue in issues:
            print(f"  ❌ {issue}")
        print("\n上記を解決してから再度起動してください。")
        sys.exit(1)
    print("  ✅ Python OK")
    print("  ✅ Claude Code OK")
    print("  ✅ フォルダ構造 OK")

    # ブラウザを開く（少し遅延を入れてからサーバーが起動した後に開く）
    print(f"\n[2/3] ブラウザを開きます...")
    threading.Timer(1.5, lambda: webbrowser.open(f"http://localhost:{PORT}")).start()

    # サーバー起動
    print(f"\n[3/3] サーバーを起動します")
    print(f"  📍 URL: http://localhost:{PORT}")
    print(f"  💡 終了するには Ctrl+C またはサイトの終了ボタンを押してください")
    print("\n" + "=" * 60 + "\n")

    app.run(host="127.0.0.1", port=PORT, debug=False)


if __name__ == "__main__":
    main()
