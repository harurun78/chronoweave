# Chronoweave Phase 1 Non-Functional Requirements and Testing

## 概要

Chronoweave の中心価値は、レスポンシブな UI 操作で RTOS タスク設計を試行錯誤できることである。Phase 1 から描画応答、派生値再計算、import/export、schema validation、E2E 代表シナリオを非機能要件とテスト対象に含める。

## rendering-performance-budget

### スコープ

WCET ドラッグ、派生値再計算、import/export の初期性能目標を定義する。

### 受け入れ条件

- [ ] WCET ドラッグ中のバー幅更新は 1 animation frame 以内を目標にする
- [ ] WCET ドラッグ中の体感応答は少なくとも 30fps 相当を下回らない
- [ ] 入力確定からガント・バッファ・メモリ・Problems 反映まで p95 100ms 以内を目標にする
- [ ] 100KB 以下の YAML/JSON import は 300ms 以内に validate + render することを目標にする
- [ ] export は 300ms 以内に完了することを目標にする
- [ ] 目標未達の場合、worker 化または描画差分最適化の検討を記録する

### スコープ外

- 60fps 絶対保証
- 低スペック端末やモバイル端末での保証
- 10,000 tick 超過ケースの高速化

### 依存関係

- [phase-1-ui-interactions.md](phase-1-ui-interactions.md)
- [phase-1-analysis-engine.md](phase-1-analysis-engine.md)

### 検証方法

- production build で browser performance marks を計測する
- Motor Control 1-axis + 2-axis extension を標準 fixture にする
- synthetic 10-task fixture で p95 を測る

## test-fixtures

### スコープ

Phase 1 の unit / integration / E2E / performance test に使う fixture を定義する。

### 受け入れ条件

- [ ] Motor Control 1-axis sample fixture がある
- [ ] 2-axis extension fixture がある
- [ ] high utilization optimistic-bias fixture がある
- [ ] invalid schema fixture がある
- [ ] LCM warning fixture がある
- [ ] memory warning fixture がある

### スコープ外

- 実機 RTOS trace fixture
- vendor-specific fixture

### 依存関係

- [phase-1-project-file-schema.md](phase-1-project-file-schema.md)
- [phase-1-analysis-engine.md](phase-1-analysis-engine.md)

### 検証方法

- fixture ごとの expected Problems snapshot を作る
- fixture ごとの expected AnalysisSnapshot を作る

## unit-tests

### スコープ

UI から独立して検証できる計算・schema・normalization を unit test 対象にする。

### 受け入れ条件

- [ ] time model の microseconds 変換を検証する
- [ ] LCM 計算を検証する
- [ ] RMA priority を検証する
- [ ] 近似 RTA と BufferRemaining を検証する
- [ ] Problems generation を検証する
- [ ] ProjectFile schema validation を検証する
- [ ] export/import normalization を検証する

### スコープ外

- browser rendering
- E2E 操作

### 依存関係

- [phase-1-data-model.md](phase-1-data-model.md)
- [phase-1-analysis-engine.md](phase-1-analysis-engine.md)
- [phase-1-project-file-schema.md](phase-1-project-file-schema.md)

### 検証方法

- Vitest 等の test runner で純粋関数を検証する

## integration-tests

### スコープ

ProjectState、Jotai derived state、主要 UI component の接続を検証する。

### 受け入れ条件

- [ ] task list edit が ProjectState を更新する
- [ ] property panel edit が ProjectState を更新する
- [ ] gantt WCET drag が ProjectState を更新する
- [ ] ProjectState 更新後に AnalysisSnapshot が再計算される
- [ ] Problems click が task selection を更新する
- [ ] failed import が現在状態を破壊しない

### スコープ外

- full browser E2E

### 依存関係

- [phase-1-ui-interactions.md](phase-1-ui-interactions.md)

### 検証方法

- React Testing Library 等で component integration を検証する

## e2e-tests

### スコープ

Phase 1 の代表ユーザーストーリーをブラウザ操作として検証する。

### 受け入れ条件

- [ ] Motor Control 1-axis sample を import できる
- [ ] `MotorCtrl_Y` を追加できる
- [ ] WCET をガント上で変更できる
- [ ] バッファゲージと Problems が更新される
- [ ] YAML export ができる
- [ ] 画面リセット後に YAML import で復元できる
- [ ] 復元後の Problems と AnalysisSnapshot が保存前と一致する

### スコープ外

- browser compatibility matrix の網羅
- mobile E2E

### 依存関係

- [phase-1-product-spec.md](phase-1-product-spec.md)
- [phase-1-project-file-schema.md](phase-1-project-file-schema.md)

### 検証方法

- Playwright 等で代表シナリオを自動化する

## accessibility-and-layout

### スコープ

Phase 1 desktop UI の最低限のアクセシビリティとレイアウト安定性を定義する。

### 受け入れ条件

- [ ] 主要ボタンに accessible name がある
- [ ] Problems level が色だけに依存しない
- [ ] キーボードで task row を選択できる
- [ ] Ctrl+Z / Ctrl+Shift+Z が Undo/Redo として動作する
- [ ] 1366px 幅以上でテーブル、SVG、property panel が重ならない
- [ ] ペインリサイズでレイアウトが破綻しない

### スコープ外

- スクリーンリーダー完全対応
- モバイル UI
- 多言語化

### 依存関係

- [phase-1-ui-interactions.md](phase-1-ui-interactions.md)

### 検証方法

- axe 等の基本チェック
- keyboard smoke test
- desktop viewport screenshot test

## release-gate

### スコープ

Phase 1 を完了とするための品質ゲートを定義する。

### 受け入れ条件

- [ ] unit tests が通る
- [ ] integration tests が通る
- [ ] representative E2E が通る
- [ ] performance budget の計測結果が記録される
- [ ] 未達の performance budget がある場合、原因と次アクションが記録される
- [ ] speckit の Phase 1 spec-id が完了状態になっている

### スコープ外

- Phase 2 以降の regression gate

### 依存関係

- [speckit-handoff.md](speckit-handoff.md)

### 検証方法

- CI または release checklist で上記を確認する

## 未解決事項

- performance budget の基準環境をどのブラウザ / CPU に固定するか
- screenshot test を Phase 1 必須にするか