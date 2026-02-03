# personal-health-dashboard

Self-use dashboard for life, health, and training logs. It reads Google Sheets + OMRON CSV data and visualizes trends with Chart.js.

Live site
- https://oru-sudo.github.io/personal-health-dashboard/

Overview
- Google Sheets (フォームの回答 1 / 2) の記録を可視化
- 体重・体脂肪・体組成、睡眠、日次評価、アクティビティ、体調症状を表示
- OMRON CSV（体温 / SpO2 / 血圧 / 体重）をカードで表示
- 合計・平均・移動平均・レンジバーなどの簡易計算
- OMRON 取得は非同期で実行し、グラフ上にローディング表示
- 更新ボタンは押下時にスピナー表示

Data sources
- Google Sheets CSV (read-only)
  - CSV_URL: フォームの回答 1
  - COMPOSITION_URL: フォームの回答 2
- OMRON CSV (Google Drive folder)
  - Google Apps Script (GAS) が Drive フォルダから最新 CSV を取得
  - ファイル名の正規表現でマッチして最新ファイルを返却

OMRON GAS endpoint
- 例: https://script.google.com/macros/s/DEPLOY_ID/exec?type=bodyTemperature&token=YOUR_TOKEN
- type は以下を使用
  - bodyTemperature
  - spo2
  - bloodPressure
  - bodyComposition

UI notes
- OMRON カードの各グラフ上にローディングスピナーを表示
- 更新ボタン押下時は該当ボタンにスピナー表示

Local development
```
python -m http.server
```
Open http://localhost:8000

Deployment
- GitHub Pages で公開
- main への push で Actions デプロイ (設定済みの場合)

Configuration
- app.js 内の以下を環境に合わせて更新
  - CSV_URL
  - COMPOSITION_URL
  - OMRON_GAS_URL
  - OMRON_GAS_TOKEN
  - USER_HEIGHT_CM
