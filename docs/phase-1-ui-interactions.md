# Chronoweave Phase 1 UI Interactions

## 概要

Phase 1 の UI は、タスク設計をレスポンシブに試行錯誤するための操作面である。ガント上の WCET ドラッグ、リストビュー直接編集、サイドプロパティ編集を同じ ProjectState に接続する。

## task-list-editor

### スコープ

左ペインのタスク一覧で、タスクの追加、削除、複製、基本フィールド編集を行う。

### 受け入れ条件

- [ ] タスク名、period、WCET、priority mode、stack、description を表示できる
- [ ] セル直接編集で period / WCET / stack を更新できる
- [ ] タスクを追加できる
- [ ] タスクを削除できる
- [ ] `MotorCtrl_X` を複製して `MotorCtrl_Y` を作れる
- [ ] 行選択が gantt と property panel の選択状態に反映される

### スコープ外

- 階層タスク
- タスク間依存編集
- multi-select bulk edit

### 依存関係

- [phase-1-data-model.md](phase-1-data-model.md)
- [phase-1-analysis-engine.md](phase-1-analysis-engine.md)

### 検証方法

- table edit integration test
- task duplicate test
- selection sync test

## gantt-svg-editor

### スコープ

周期タスクを LCM 基準の SVG ガントとして描画し、バー右端ドラッグで WCET を変更する。

### 受け入れ条件

- [ ] 各 task row に LCM 内の周期実行バーを描画できる
- [ ] バー長は WCET を表す
- [ ] バー右端に resize handle がある
- [ ] resize handle drag で WCET を更新できる
- [ ] drag 中もバー幅が即時更新される
- [ ] task に Error / Warning がある場合、バー枠で状態を表現できる
- [ ] double click または選択操作で property panel を開ける

### スコープ外

- プリエンプションによるバー分割描画
- timeline zoom / pan
- actual trace overlay

### 依存関係

- [phase-1-analysis-engine.md](phase-1-analysis-engine.md)
- [phase-1-non-functional-testing.md](phase-1-non-functional-testing.md)

### 検証方法

- WCET drag integration test
- SVG bar geometry unit test
- drag performance measurement

## property-panel

### スコープ

選択タスクの全属性をフォーム形式で編集する。Phase 1 では deadline と manual priority は主に property panel で扱う。

### 受け入れ条件

- [ ] 選択 task の name / period / WCET / deadline / priority mode / manual priority / stack / description を表示できる
- [ ] `deadline_ms` 未入力時は period と同値扱いであることが分かる
- [ ] `priority_mode: manual` のときだけ manual priority 入力を有効にできる
- [ ] 入力値の schema error を Problems または field error として表示できる
- [ ] property panel での変更が list / gantt / gauges / Problems に反映される

### スコープ外

- Phase 2 非周期タスク詳細
- Phase 4 domain/core assignment

### 依存関係

- [phase-1-data-model.md](phase-1-data-model.md)
- [phase-1-project-file-schema.md](phase-1-project-file-schema.md)

### 検証方法

- form edit integration test
- deadline default behavior test
- manual priority validation test

## buffer-and-memory-panels

### スコープ

task analysis をもとに、タスク別バッファゲージ、非周期受入余力ゲージ、メモリプロファイルを表示する。

### 受け入れ条件

- [ ] task ごとの buffer remaining percent を表示できる
- [ ] buffer 状態に応じて normal / warning / error の表示を変えられる
- [ ] 非周期受入余力ゲージを表示できる
- [ ] memory profile waveform と peak stack を表示できる
- [ ] RAM capacity が設定済みの場合 capacity line を表示できる
- [ ] WCET / stack / RAM 変更時に即時更新される

### スコープ外

- Phase 2 の非周期 task budget zone
- Phase 4 の per-core memory profile

### 依存関係

- [phase-1-analysis-engine.md](phase-1-analysis-engine.md)

### 検証方法

- gauge rendering test
- memory peak warning test
- WCET 変更後の panel update test

## problems-panel

### スコープ

Error / Warning / Info を一覧表示し、該当タスクへのフォーカス導線を提供する。

### 受け入れ条件

- [ ] Problems は level 順または発生順で一覧表示できる
- [ ] Error / Warning / Info が視覚的に区別できる
- [ ] Phase 1 近似 RTA 注意 Info が常時表示される
- [ ] taskId 付き Problem をクリックすると該当タスクが選択される
- [ ] schema import error を表示できる

### スコープ外

- 問題の自動修正
- IDE diagnostic protocol 連携

### 依存関係

- [phase-1-analysis-engine.md](phase-1-analysis-engine.md) の `problems-model`

### 検証方法

- Problems click integration test
- level rendering snapshot test

## undo-redo-history

### スコープ

ProjectState の永続対象部分を shallow history として保持し、Ctrl+Z / Ctrl+Shift+Z で戻せるようにする。

### 受け入れ条件

- [ ] task list edit を undo / redo できる
- [ ] gantt WCET drag の確定結果を undo / redo できる
- [ ] property panel edit を undo / redo できる
- [ ] import は history boundary として扱える
- [ ] transient UI state は history に含めない

### スコープ外

- collaborative editing
- infinite history
- command palette

### 依存関係

- [phase-1-data-model.md](phase-1-data-model.md) の `project-state`

### 検証方法

- undo / redo reducer unit test
- import 後 history behavior test

## 未解決事項

- WCET drag の snap 粒度を tick と同じにするか、より細かい UI step を許容するか
- Problems panel の配置を下部固定にするか、右ペイン内 tab にするか