# legacy-graph

複数の Android リポジトリから収集した **技術負債メトリクス(JSON)** を保存・公開するリポジトリです。
`android-legacy-metrics` の再利用ワークフローが、各対象リポで計測 → 本リポへ **`data/<org>/<repo>/latest.json`** と履歴をコミットします。
GitHub Pages を有効化すると、同梱のダッシュボード（`index.html`）で可視化できます。

---

## ディレクトリ構成

```
legacy-graph/
├─ data/
│  ├─ _registry.json            # 監視対象の一覧（任意）
│  └─ <org>/<repo>/
│       ├─ latest.json          # 最新スナップショット
│       ├─ 20250901T020000Z.json
│       ├─ 20250904T060000Z.json
│       └─ index.json           # 履歴ファイル名の配列（任意）
├─ index.html                    # ダッシュボード
├─ app.js                        # ダッシュボードロジック
└─ styles.css                    # ダッシュボードスタイル
```

> `index.html / app.js / styles.css` は本リポ直下に配置します（Pages ルート公開）。

---

## JSON 形式（例：`data/<org>/<repo>/latest.json`）

```json
{
  "generated_at": "2025-09-04T06:00:00Z",
  "files": { "kotlin": 123, "java": 45 },
  "ui": {
    "xml_layout_files": 60,
    "databinding_layout_files": 8,
    "composable_functions": 210,
    "kotlin_view_like_files": 52
  },
  "language": { "java_file_ratio": 0.268 },
  "events": {
    "rx_imports": 14, "eventbus_imports": 0, "flow_imports": 120, "livedata_imports": 18
  },
  "buildsys": {
    "kapt_plugins_count": 2, "kapt_deps_count": 5, "ksp_plugins_count": 1, "dataBinding_enabled_modules": 1
  },
  "legacy": {
    "asyncTask_usages": 0, "loader_usages": 3,
    "frameworkFragment_usages": 0, "supportFragment_usages": 2, "fragmentXml_tags": 6
  },
  "supportlib": { "support_code_refs": 12, "support_dep_refs": 0 }
}
```

任意ファイル：

* `data/_registry.json` … 表示用の候補リポ一覧
  `{"repos": ["takumi-saito/MinimalLauncherApp", "..."]}`
* `data/<org>/<repo>/index.json` … 履歴ファイル名の配列
  `{"history": ["20250901T020000Z.json","20250904T060000Z.json"]}`

---

## セットアップ

1. **このリポを作成**（Private で可）
2. **GitHub Pages を有効化**

   * Settings → Pages → Branch: `main` / Folder: `/`（Root）
3. ルートに **`index.html` / `app.js` / `styles.css`** を追加（ダッシュボード）
4. 各対象リポに、`android-legacy-metrics` の呼び出しワークフローを追加

   * Secret `LEGACY_GRAPH_TOKEN`（このリポへの Contents: Read/Write）を設定
   * 実行すると `data/<org>/<repo>/latest.json` と履歴が自動追加されます

> ダッシュボードのコードは `app.js` が `latest.json`／必要に応じて `index.json` を読み込み、
> **Java比率・Legacy合計の時系列**や主要指標を表示します。

---

## 運用メモ

* **増分管理**：毎回 `latest.json` を上書きしつつ、日付付き JSON を履歴として保存
* **レジストリ/インデックス自動更新**：`android-legacy-metrics` の再利用WFに同梱済み
* **セキュリティ**：書き込み用トークンは Fine-grained PAT か GitHub App を推奨（権限は `Contents: RW` の最小）
* **可視化の拡張**：必要に応じて Chart 追加・指標の追加に合わせた項目を `app.js` に追記

---

## トラブルシュート

* **latest.json が表示されない**: パス `data/<org>/<repo>/latest.json` が正しいか確認（大小文字・Org/Repo 名）
* **グラフが出ない**: `index.json` 未用意でも動作しますが、時系列は単発表示になります
* **Commit が増えない**: トークン権限/期限、デフォルトブランチ、保護ルールを確認

---

## 参照

* 計測ワークフロー／スクリプト：`android-legacy-metrics`
* ダッシュボード：本リポ直下の `index.html / app.js / styles.css`

---
