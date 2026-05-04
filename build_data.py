"""
build_data.py — リサーチ結果をマージして site/data.json を生成

results/by-genre/*/*.json と results/by-account/*/*.json を全部読み込み、
1つの site/data.json にまとめる。

使い方：
    python3 build_data.py

このスクリプトを実行すると、site/data.json が更新されます。
git push すれば Vercel が自動デプロイ → サイトに反映されます。
"""

import json
import sys
from datetime import datetime
from pathlib import Path

# ===== 設定 =====
ROOT = Path(__file__).resolve().parent
RESULTS_DIR = ROOT / "results"
SITE_DIR = ROOT / "site"
OUTPUT_FILE = SITE_DIR / "data.json"

# ジャンルアイコンの定義（site/script.js と揃える）
GENRE_ICONS = {
    "美容": "💄",
    "お金": "💰",
    "育児": "👶",
    "恋愛": "💕",
    "占い": "🔮",
    "AI": "🤖",
    "転職": "💼",
    "健康": "🌿",
    "ダイエット": "💪",
}


def load_all_results():
    """results/ 配下の全JSONファイルを読み込んで投稿リストを返す"""
    all_posts = []

    if not RESULTS_DIR.exists():
        print(f"⚠️  results/ フォルダが見つかりません：{RESULTS_DIR}")
        return all_posts

    # ジャンル別の結果を読む
    by_genre_dir = RESULTS_DIR / "by-genre"
    if by_genre_dir.exists():
        for genre_dir in by_genre_dir.iterdir():
            if not genre_dir.is_dir():
                continue
            genre_name = genre_dir.name
            for json_file in sorted(genre_dir.glob("*.json")):
                try:
                    with open(json_file, encoding="utf-8") as f:
                        data = json.load(f)
                    added_at = json_file.stem.split("_")[0]  # ファイル名先頭の日付
                    for post in data.get("posts", []):
                        post = post.copy()
                        post["genre"] = post.get("genre") or genre_name
                        post["genre_icon"] = GENRE_ICONS.get(genre_name, "📁")
                        post["added_at"] = post.get("added_at") or added_at
                        post["source_file"] = str(json_file.relative_to(ROOT))
                        all_posts.append(post)
                except Exception as e:
                    print(f"❌ {json_file.name} の読み込みに失敗：{e}")

    # アカウント別の結果を読む
    by_account_dir = RESULTS_DIR / "by-account"
    if by_account_dir.exists():
        for account_dir in by_account_dir.iterdir():
            if not account_dir.is_dir():
                continue
            for json_file in sorted(account_dir.glob("*.json")):
                try:
                    with open(json_file, encoding="utf-8") as f:
                        data = json.load(f)
                    added_at = json_file.stem.split("_")[0]
                    # アカウントモードの結果はジャンルが無い場合がある
                    genre_name = data.get("genre", "（その他）")
                    for post in data.get("posts", []):
                        post = post.copy()
                        post["genre"] = post.get("genre") or genre_name
                        post["genre_icon"] = GENRE_ICONS.get(genre_name, "📁")
                        post["added_at"] = post.get("added_at") or added_at
                        post["source_file"] = str(json_file.relative_to(ROOT))
                        all_posts.append(post)
                except Exception as e:
                    print(f"❌ {json_file.name} の読み込みに失敗：{e}")

    return all_posts


def deduplicate(posts):
    """同じ投稿URLが複数回登場した場合は最初の1件だけ残す"""
    seen = set()
    unique = []
    for post in posts:
        url = post.get("post_url", "")
        if url and url in seen:
            continue
        if url:
            seen.add(url)
        unique.append(post)
    return unique


def main():
    print("=" * 50)
    print("  📦 build_data.py — データ統合スクリプト")
    print("=" * 50)
    print()

    # 1. 全結果を読み込む
    print("[1/4] results/ 配下の全JSONを読み込み中...")
    posts = load_all_results()
    print(f"  → {len(posts)} 件の投稿を読み込みました")

    # 2. 重複を除く
    print()
    print("[2/4] 重複を除去中...")
    posts = deduplicate(posts)
    print(f"  → 重複除去後：{len(posts)} 件")

    # 3. 並び順を整える（新着順 = added_at の降順）
    print()
    print("[3/4] 新着順にソート中...")
    posts.sort(
        key=lambda p: (p.get("added_at", ""), p.get("posted_at", "")),
        reverse=True,
    )

    # 4. data.json を出力
    print()
    print("[4/4] site/data.json を出力中...")
    SITE_DIR.mkdir(parents=True, exist_ok=True)
    output = {
        "updated_at": datetime.now().strftime("%Y-%m-%d"),
        "total_posts": len(posts),
        "posts": posts,
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"  ✅ {OUTPUT_FILE.relative_to(ROOT)} を更新しました")
    print()

    # ジャンル別の集計を表示
    print("=" * 50)
    print("  📊 ジャンル別の集計")
    print("=" * 50)
    by_genre = {}
    for p in posts:
        g = p.get("genre", "?")
        by_genre[g] = by_genre.get(g, 0) + 1
    for genre, count in sorted(by_genre.items(), key=lambda x: -x[1]):
        icon = GENRE_ICONS.get(genre, "📁")
        print(f"  {icon} {genre}: {count} 件")

    print()
    print("✨ 完了！次のコマンドで Vercel にデプロイできます：")
    print("  git add . && git commit -m 'update data' && git push")
    print()


if __name__ == "__main__":
    main()
