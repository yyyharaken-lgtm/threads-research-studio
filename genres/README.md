# genres/

ジャンル別の設定ファイルを置く場所。

## 予定されるファイル

9ジャンル分のJSONファイル：

- `美容.json`
- `育児.json`
- `お金.json`
- `恋愛.json`
- `占い.json`
- `AI.json`
- `転職.json`
- `健康.json`
- `ダイエット.json`

## 各ファイルの中身（予定）

```json
{
  "name": "美容",
  "icon": "💄",
  "judgment_file": "criteria/howto-judgment.md",
  "core_keywords": ["スキンケア", "美容", "コスメ", "クレンジング"],
  "pain_keywords": ["シミ", "ニキビ", "毛穴", "くすみ", "たるみ"]
}
```

- `core_keywords`: ジャンル判定用（裏で使う）
- `pain_keywords`: チップ選択UIで表示する候補
- `judgment_file`: 占い系だけ別ファイルを指定

## 役割

ジャンルクリック時に、サーバーがこの設定を読んで：

1. プロンプト生成に使う
2. キーワード候補チップをUIに表示する
3. ハウツー系／占い系の判定基準を切り替える
