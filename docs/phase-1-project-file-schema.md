# Chronoweave Phase 1 Project File Schema

## 概要

Phase 1 では、ProjectFile を Chronoweave の保存・復元・将来のコード生成入力に使う中間表現として定義する。YAML を人間向け canonical format、JSON を機械連携用の同型表現とする。

## project-file-schema

### スコープ

ProjectFile v0.1 のトップレベル構造を定義する。

### データ構造

```yaml
version: "0.1"
global:
  tick_ms: 1
  stack_presets:
    low: 512
    mid: 2048
    high: 4096
  ram_capacity: 65536
tasks:
  - id: isr-timer
    name: ISR_Timer
    period_ms: 1
    wcet_ms: 0.05
    deadline_ms: 1
    priority_mode: auto
    stack: low
```

### 受け入れ条件

- [ ] `version` は必須で、Phase 1 では `"0.1"` である
- [ ] `global.tick_ms` は必須である
- [ ] `global.stack_presets.low/mid/high` は必須である
- [ ] `global.ram_capacity` は optional である
- [ ] `tasks` は 1 件以上を許容する
- [ ] task `period_ms` と `wcet_ms` は正の数である
- [ ] task `stack` は `low | mid | high` のいずれかである
- [ ] YAML と JSON は同じ logical schema を共有する

### スコープ外

- Phase 2 非周期タスク schema
- Phase 4 domain/core schema
- codegen plugin metadata

### 依存関係

- [phase-1-data-model.md](phase-1-data-model.md)

### 検証方法

- schema validation unit test
- YAML parse -> normalize -> JSON serialize の roundtrip test

## validation-and-normalization

### スコープ

ProjectFile import 時の validation、default 補完、内部 ProjectState への変換を定義する。

### 受け入れ条件

- [ ] `deadline_ms` 未指定時は `period_ms` に補完される
- [ ] `priority_mode` 未指定時は `auto` に補完できる
- [ ] `id` 未指定の legacy input は import 時に安定 ID を生成できる
- [ ] unknown top-level field は Warning または無視方針を明示する
- [ ] validation error は Problems に `source: import` または `source: schema` として表示される
- [ ] invalid file import は現在の ProjectState を破壊しない

### スコープ外

- 複数 version migration の完全実装
- 外部 schema registry

### 依存関係

- [phase-1-analysis-engine.md](phase-1-analysis-engine.md) の `problems-model`
- [phase-1-ui-interactions.md](phase-1-ui-interactions.md) の `problems-panel`

### 検証方法

- invalid YAML / invalid JSON の import test
- default normalization test
- failed import does not mutate state test

## project-import-export

### スコープ

現在の ProjectState を YAML/JSON として export し、保存済みファイルを import して復元する UI と処理を定義する。

### 受け入れ条件

- [ ] YAML export ができる
- [ ] JSON export ができる
- [ ] YAML import ができる
- [ ] JSON import ができる
- [ ] export には transient UI state を含めない
- [ ] import 後に AnalysisSnapshot が再計算される
- [ ] export/import 前後で normalized ProjectFile が一致する

### スコープ外

- cloud save
- browser storage auto save
- multi-file project

### 依存関係

- [phase-1-data-model.md](phase-1-data-model.md) の `project-state`
- [phase-1-ui-interactions.md](phase-1-ui-interactions.md)

### 検証方法

- export/import roundtrip test
- representative scenario E2E test

## sample-scenarios

### スコープ

Phase 1 の代表シナリオに使う Motor Control 1-axis sample を定義する。

### サンプル初期値

```yaml
version: "0.1"
global:
  tick_ms: 1
  stack_presets:
    low: 512
    mid: 2048
    high: 4096
  ram_capacity: 65536
tasks:
  - id: isr-timer
    name: ISR_Timer
    period_ms: 1
    wcet_ms: 0.05
    deadline_ms: 1
    priority_mode: auto
    stack: low
  - id: motorctrl-x
    name: MotorCtrl_X
    period_ms: 10
    wcet_ms: 3
    deadline_ms: 10
    priority_mode: auto
    stack: mid
  - id: sensor-fusion
    name: SensorFusion
    period_ms: 20
    wcet_ms: 6
    deadline_ms: 20
    priority_mode: auto
    stack: mid
    description: "IMU + encoder fusion"
```

### 受け入れ条件

- [ ] sample は schema validation に通る
- [ ] sample import 後に Problems は Error を含まない
- [ ] `MotorCtrl_Y` を追加した 2-axis variant を E2E で作成できる
- [ ] sample は Phase 1 performance test の標準 fixture として使える

### スコープ外

- 大規模 synthetic benchmark fixture
- Phase 2 非周期 sample

### 依存関係

- [phase-1-product-spec.md](phase-1-product-spec.md) の `代表ユーザーストーリー`

### 検証方法

- sample schema test
- sample analysis snapshot test
- 2-axis extension E2E test

## schema-versioning

### スコープ

Phase 1 以降の ProjectFile 互換性方針を定義する。

### 受け入れ条件

- [ ] Phase 1 schema version は `0.1` である
- [ ] 後続 Phase の追加フィールドは backward compatible を基本にする
- [ ] breaking change は version bump と migration 方針を要求する
- [ ] YAML canonical / JSON isomorphic の関係を維持する

### スコープ外

- Phase 2 以降の migration 実装

### 依存関係

- [phase-roadmap.md](phase-roadmap.md) の `フェーズ間互換性`

### 検証方法

- version mismatch error / warning test

## 未解決事項

- unknown field を warning にするか strict error にするか
- ProjectFile 内の `id` をユーザー編集可能にするか