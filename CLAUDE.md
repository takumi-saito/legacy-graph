# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## リポジトリ概要

Android リポジトリから収集した技術負債メトリクス（JSON）を保存・可視化するダッシュボードリポジトリです。`android-legacy-metrics` ワークフローが各対象リポジトリで計測し、このリポジトリへデータをコミットします。

## アーキテクチャ

### データフロー
1. 各 Android リポジトリで `android-legacy-metrics` ワークフローが実行
2. メトリクス JSON が `data/<org>/<repo>/` に自動コミット
3. GitHub Pages で静的ダッシュボードとして公開
4. Chart.js による可視化（時系列グラフ、メトリクスカード）

### ディレクトリ構造
- `data/` - メトリクスデータ格納
  - `_registry.json` - 監視対象リポジトリ一覧
  - `<org>/<repo>/` - リポジトリごとのメトリクス
    - `latest.json` - 最新スナップショット
    - `YYYYMMDDTHHMMSSZ.json` - 履歴データ
    - `index.json` - 履歴ファイル名配列
- ルート直下 - GitHub Pages 用ダッシュボード
  - `index.html` - メインページ
  - `app.js` - データ取得・グラフ描画ロジック
  - `styles.css` - スタイルシート

## 開発コマンド

### ローカルサーバー起動
```bash
# Python 3
python3 -m http.server 8000

# Node.js (npx)
npx http-server -p 8000

# ブラウザで http://localhost:8000 を開く
```

### データファイル検証
```bash
# JSON 形式確認
cat data/takumi-saito/MinimalLauncherApp/latest.json | jq .

# レジストリ確認
cat data/_registry.json | jq .
```

## メトリクス JSON スキーマ

各メトリクスファイルは以下の構造を持ちます：

```json
{
  "generated_at": "ISO 8601 形式の日時",
  "files": { "kotlin": 数値, "java": 数値 },
  "ui": {
    "xml_layout_files": 数値,
    "databinding_layout_files": 数値,
    "composable_functions": 数値,
    "kotlin_view_like_files": 数値
  },
  "language": { "java_file_ratio": 小数 },
  "events": {
    "rx_imports": 数値,
    "eventbus_imports": 数値,
    "flow_imports": 数値,
    "livedata_imports": 数値
  },
  "buildsys": {
    "kapt_plugins_count": 数値,
    "kapt_deps_count": 数値,
    "ksp_plugins_count": 数値,
    "dataBinding_enabled_modules": 数値
  },
  "legacy": {
    "asyncTask_usages": 数値,
    "loader_usages": 数値,
    "frameworkFragment_usages": 数値,
    "supportFragment_usages": 数値,
    "fragmentXml_tags": 数値
  },
  "supportlib": {
    "support_code_refs": 数値,
    "support_dep_refs": 数値
  }
}
```

## ダッシュボードの拡張

### 新しいメトリクスを追加する場合

1. `app.js` の `renderLatest()` 関数にカード表示を追加
2. 時系列グラフが必要な場合は `renderTimeSeries()` 関数を更新
3. スタイルが必要な場合は `styles.css` に追加

### グラフのカスタマイズ

Chart.js を使用。`app.js` 内のチャート設定オブジェクトを編集：
- `legacyChart` - Legacy/Support 指標の棒グラフ
- `ratioChart` - Java 比率の時系列折れ線グラフ  
- `legacyTrendChart` - Legacy 合計の時系列折れ線グラフ

## トラブルシューティング

### CORS エラーが発生する場合
ローカル開発時は必ず HTTP サーバー経由でアクセスしてください（`file://` プロトコルは使用不可）。

### データが表示されない場合
1. ブラウザのデベロッパーツールでネットワークエラーを確認
2. `data/<org>/<repo>/latest.json` のパスが正しいか確認（大文字小文字に注意）
3. JSON ファイルの形式が正しいか `jq` コマンドで検証

### グラフが更新されない場合
ブラウザキャッシュをクリアするか、デベロッパーツールで「キャッシュを無効化」を有効にしてリロード。