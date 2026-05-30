# Chronoweave Phase 1 Product Spec

## 概要

Phase 1 `RTOS Task Design Kernel / RTOSタスク設計中核` は、RTOS 周期タスク設計の中心体験を実装するフェーズである。ユーザーはサンプルを読み込み、タスクを追加・調整し、ガント、バッファ、メモリ、Problems の即時更新を確認し、YAML/JSON として保存・復元する。

## app-foundation

### スコープ

Chronoweave Phase 1 の静的 Web アプリ骨格を作る。3 ペイン UI、上部ツールバー、Problems 領域、サンプル読み込み導線、import/export 導線を配置できる土台を含む。

### 受け入れ条件

- [ ] Vite + React + TypeScript のアプリとして起動できる
- [ ] TypeScript strict を前提にできる
- [ ] Jotai による state / derived state の配置場所がある
- [ ] 3 ペイン構成（task list / gantt / property panel）を表示できる
- [ ] buffer gauges、memory profile、Problems を配置する下部または補助領域がある
- [ ] サンプル読み込み、import、export の導線がある

### スコープ外

- 個別計算ロジック
- ガントバーのドラッグ実装
- ProjectFile schema の詳細

### 依存関係

- [overview.md](overview.md)
- [phase-roadmap.md](phase-roadmap.md)

### 検証方法

- 開発サーバーで Phase 1 shell が表示できることを確認する
- production build が成功することを確認する

## 代表ユーザーストーリー

### スコープ

Phase 1 の完了判定に使う中心シナリオを定義する。白紙からの作成ではなく、Motor Control 1-axis sample を import し、1 軸追加して保存・復元する流れを代表シナリオにする。

### 受け入れ条件

- [ ] 起動時に Motor Control 1-axis sample を選べる
- [ ] sample import 後に `ISR_Timer`, `MotorCtrl_X`, `SensorFusion` が表示される
- [ ] `MotorCtrl_X` を複製または追加操作で `MotorCtrl_Y` を作れる
- [ ] `MotorCtrl_Y` は period 10ms、WCET 3ms、stack mid を初期値として設定できる
- [ ] `MotorCtrl_Y` 追加後に LCM、バッファ、非周期受入余力、メモリ、Problems が再計算される
- [ ] `SensorFusion` または `MotorCtrl_Y` の WCET をガント上で変更できる
- [ ] YAML export 後、画面リセットして同じ YAML を import すると同じ設計状態に戻る
- [ ] import 後の analysis result が export 前と一致する

### スコープ外

- 実機 RTOS への反映
- FreeRTOS コード生成
- トレースログ import

### 依存関係

- [phase-1-project-file-schema.md](phase-1-project-file-schema.md)
- [phase-1-analysis-engine.md](phase-1-analysis-engine.md)
- [phase-1-ui-interactions.md](phase-1-ui-interactions.md)

### 検証方法

- E2E テストで sample import、タスク追加、WCET 調整、export、import 復元を実行する
- export/import 前後で normalized ProjectFile と AnalysisSnapshot を比較する

## 画面構成

### スコープ

Phase 1 の画面は、タスク一覧、ガント、プロパティ、バッファゲージ、メモリプロファイル、Problems から構成する。表示は desktop viewport を主対象にする。

### 受け入れ条件

- [ ] 左ペインにタスク一覧がある
- [ ] 中央または右ペインに SVG ガントがある
- [ ] 右端に選択タスクの property panel を展開できる
- [ ] バッファゲージにはタスク別 BufferRemaining と非周期受入余力が表示される
- [ ] メモリプロファイルには peak stack と RAM capacity line が表示される
- [ ] Problems には Error / Warning / Info が表示される
- [ ] Problems のタスク行クリックで該当タスクを選択またはハイライトできる

### スコープ外

- モバイル最適化
- 複数プロジェクト同時編集
- timeline zoom / pan

### 依存関係

- [phase-1-ui-interactions.md](phase-1-ui-interactions.md)
- [phase-1-non-functional-testing.md](phase-1-non-functional-testing.md)

### 検証方法

- 1366px 幅以上の desktop viewport でレイアウトが破綻しないことを確認する
- 主要パネルが同一 ProjectState から描画されることを component test で確認する

## Phase 1 スコープ外

### スコープ

Phase 1 で扱わない機能を明示し、実装時のスコープクリープを防ぐ。

### 受け入れ条件

- [ ] 非周期タスク入力は Phase 2 に送られている
- [ ] 反復 RTA は Phase 2 に送られている
- [ ] コード生成は Phase 2 以降の generator module / plugin として扱われている
- [ ] トレースログ import は Phase 3 に送られている
- [ ] ヘテロ SoC / マルチコアは Phase 4 に送られている
- [ ] DoktorMagus 連携は Phase 5 に送られている

### スコープ外

- Phase 2 以降の詳細受け入れ条件

### 依存関係

- [phase-roadmap.md](phase-roadmap.md)

### 検証方法

- speckit task description に Phase 2 以降の機能が混入していないことをレビューする

## Phase 1 完了条件

### スコープ

Phase 1 を完了とみなす条件をユーザー価値ベースで定義する。

### 受け入れ条件

- [ ] 代表ユーザーストーリーを最初から最後まで実行できる
- [ ] 近似 RTA の Info が常時表示される
- [ ] 描画応答の performance budget を満たす、または未達項目と改善計画が記録される
- [ ] YAML/JSON schema validation error が Problems に表示される
- [ ] Phase 1 の spec-id すべてに unit / integration / E2E のいずれかの検証がある

### スコープ外

- 実運用レベルの全 RTOS ケース網羅

### 依存関係

- [speckit-handoff.md](speckit-handoff.md)
- [phase-1-non-functional-testing.md](phase-1-non-functional-testing.md)

### 検証方法

- `phase-1-acceptance-tests` spec-id の完了を確認する

## 未解決事項

- 初回起動時に空プロジェクトを表示するか、サンプル選択を前面に出すか
- sample import 導線を toolbar、sidebar、welcome panel のどこに置くか