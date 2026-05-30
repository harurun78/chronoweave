# Chronoweave speckit Handoff

## 概要

Chronoweave Phase 1 を speckit で実装開始できるように、仕様書、spec-id、初回タスク順、受け入れシナリオを整理する。

## 入力資料

### スコープ

speckit 実装リポジトリへ渡す最小資料セットを定義する。

### 受け入れ条件

- [ ] [README.md](README.md) が仕様ディレクトリの入口になっている
- [ ] [overview.md](overview.md) がプロダクト価値と Phase 1 方針を説明している
- [ ] [phase-roadmap.md](phase-roadmap.md) が Phase 1〜5 の境界を定義している
- [ ] Phase 1 詳細仕様が data model / analysis / UI / project file / testing に分かれている
- [ ] `ideas/draft/chronoweave.md` が背景と議論履歴として参照されている

### スコープ外

- speckit scaffold の生成
- GitHub Issue 作成
- 実装リポジトリへのコピー処理

### 依存関係

- [overview.md](overview.md)
- [phase-roadmap.md](phase-roadmap.md)

### 検証方法

- すべてのリンクが相対リンクとして解決できることを確認する

## Phase 1 spec-id 一覧

### スコープ

Phase 1 を 1 Issue / 1 PR で完結しやすい単位に分割する。

### 受け入れ条件

- [ ] 各 spec-id が対応する仕様書 H2 を持つ
- [ ] 依存順が明示されている
- [ ] 代表シナリオを最後に E2E で検証できる

### spec-id

| 順序 | spec-id | 対応仕様 | 目的 | 依存 |
|---:|---|---|---|---|
| 1 | `app-foundation` | [phase-1-product-spec.md](phase-1-product-spec.md) | Vite + React + TS + Jotai + 3 ペイン土台 | なし |
| 2 | `task-model` | [phase-1-data-model.md](phase-1-data-model.md) | TaskModel / GlobalSettings / 時間単位 | app-foundation |
| 3 | `project-file-schema` | [phase-1-project-file-schema.md](phase-1-project-file-schema.md) | YAML/JSON schema validation | task-model |
| 4 | `analysis-kernel` | [phase-1-analysis-engine.md](phase-1-analysis-engine.md) | LCM / RMA / 近似 RTA / buffer / Problems | task-model |
| 5 | `sample-scenarios` | [phase-1-project-file-schema.md](phase-1-project-file-schema.md) | Motor Control 1-axis sample | project-file-schema, analysis-kernel |
| 6 | `task-list-editor` | [phase-1-ui-interactions.md](phase-1-ui-interactions.md) | 左ペインのタスク一覧編集 | app-foundation, task-model |
| 7 | `gantt-svg-editor` | [phase-1-ui-interactions.md](phase-1-ui-interactions.md) | SVG ガントと WCET ドラッグ | analysis-kernel, task-list-editor |
| 8 | `property-panel` | [phase-1-ui-interactions.md](phase-1-ui-interactions.md) | 選択タスク詳細編集 | task-list-editor |
| 9 | `buffer-and-memory-panels` | [phase-1-analysis-engine.md](phase-1-analysis-engine.md) | バッファゲージ、非周期余力、メモリ波形 | analysis-kernel, gantt-svg-editor |
| 10 | `project-import-export` | [phase-1-project-file-schema.md](phase-1-project-file-schema.md) | YAML/JSON import/export UI | project-file-schema, task-list-editor |
| 11 | `undo-redo-history` | [phase-1-ui-interactions.md](phase-1-ui-interactions.md) | tasks/settings の履歴 | task-list-editor, gantt-svg-editor |
| 12 | `phase-1-acceptance-tests` | [phase-1-non-functional-testing.md](phase-1-non-functional-testing.md) | 計算・UI・schema・性能テスト | 1〜11 |

### スコープ外

- Phase 2 の `sporadic-server`
- Phase 2 の `codegen-plugin-freertos`
- Phase 3 の `trace-import`

### 依存関係

- [phase-1-product-spec.md](phase-1-product-spec.md)
- [phase-1-non-functional-testing.md](phase-1-non-functional-testing.md)

### 検証方法

- spec-id を上から順に実装したとき、途中段階でも unit test または表示確認が可能であることをレビューする

## Phase 1 完了シナリオ

### スコープ

Phase 1 の完了判定に使う代表 E2E シナリオを定義する。

### 受け入れ条件

- [ ] Motor Control 1-axis sample を読み込める
- [ ] `MotorCtrl_Y` を追加できる
- [ ] `MotorCtrl_Y` または `SensorFusion` の WCET をガント上で変更できる
- [ ] 変更後 100ms 以内を目標に、ガント、バッファ、メモリ、Problems が更新される
- [ ] YAML export が成功する
- [ ] 画面をリセットして export した YAML を import できる
- [ ] import 後の分析結果が export 前と一致する
- [ ] 近似 RTA の Info が常時表示される

### スコープ外

- 実機 RTOS との接続
- FreeRTOS コード生成

### 依存関係

- [phase-1-product-spec.md](phase-1-product-spec.md) の `代表ユーザーストーリー`
- [phase-1-non-functional-testing.md](phase-1-non-functional-testing.md)

### 検証方法

- Playwright 等の E2E で代表シナリオを自動化する
- analysis kernel の snapshot を export/import 前後で比較する

## 実装リポジトリ初期指示

### スコープ

実装 AI agent に最初に読ませる資料と作業順を定義する。

### 受け入れ条件

- [ ] 実装前に [overview.md](overview.md) と [phase-roadmap.md](phase-roadmap.md) を読む
- [ ] Phase 1 作業時は [phase-1-data-model.md](phase-1-data-model.md) を先に正本として扱う
- [ ] UI 実装前に [phase-1-non-functional-testing.md](phase-1-non-functional-testing.md) の性能目標を読む
- [ ] ProjectFile を編集する作業では [phase-1-project-file-schema.md](phase-1-project-file-schema.md) を正本にする

### スコープ外

- 実装 agent 用 custom skill の作成
- GitHub Actions の具体 YAML

### 依存関係

- [README.md](README.md)

### 検証方法

- speckit の task description に必要な正本リンクが含まれていることを確認する

## 未解決事項

- Phase 2 spec-id をいつ分割するか

## 解決済み事項

- 2026-05-30: speckit scaffold はこの仕様リポジトリ内の [`.specify/`](.specify/) と [specs/001-rtos-task-design-kernel](specs/001-rtos-task-design-kernel) に作成する。
- 2026-05-30: Phase 1 task list は [specs/001-rtos-task-design-kernel/tasks.md](specs/001-rtos-task-design-kernel/tasks.md) を正本とする。