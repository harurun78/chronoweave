# Chronoweave Phase 1 Data Model

## 概要

Phase 1 のデータモデルは、UI 入力、解析エンジン、ProjectFile import/export を分離しつつ接続する。正本は ProjectState であり、表示パネルは ProjectState から派生する AnalysisSnapshot を描画する。

## time-model

### スコープ

Phase 1 の時間単位と丸め規則を定義する。内部計算は microseconds、UI 表示は ms、`tick_ms` は RTOS tick とガント grid/snap の単位として扱う。

### 受け入れ条件

- [ ] `wcet_ms: 0.05` は内部値 50us として保持できる
- [ ] `tick_ms: 1` でも WCET 表現を 1ms に丸めない
- [ ] `period_ms` と `deadline_ms` は tick grid に対する validation 対象になる
- [ ] LCM 計算は tick grid に基づいて行う
- [ ] 表示時は ms、小数入力を許容する

### スコープ外

- ns 精度
- tickless RTOS の詳細モデル

### 依存関係

- [phase-1-analysis-engine.md](phase-1-analysis-engine.md)
- [phase-1-project-file-schema.md](phase-1-project-file-schema.md)

### 検証方法

- 0.05ms WCET を export/import して同じ値で復元できることを unit test で確認する
- period が tick grid に合わない ProjectFile を validation error にできることを確認する

## task-model

### スコープ

1 タスクあたりの Phase 1 入力モデルを定義する。

### データ構造

```typescript
type StackPresetName = 'low' | 'mid' | 'high';
type PriorityMode = 'auto' | 'manual';

type TaskModel = {
  id: string;
  name: string;
  periodMs: number;
  wcetMs: number;
  deadlineMs?: number;
  priorityMode: PriorityMode;
  manualPriority?: number;
  stack: StackPresetName;
  description?: string;
};
```

### 受け入れ条件

- [ ] `id` は UI 内部の安定キーとして使える
- [ ] `name` はユーザー表示名として使える
- [ ] `periodMs` と `wcetMs` は正の数である
- [ ] `deadlineMs` 未指定時は `deadlineMs = periodMs` として解析する
- [ ] `priorityMode: auto` では RMA によって優先度を算出する
- [ ] `priorityMode: manual` では `manualPriority` を validation する
- [ ] `stack` は Phase 1 で必須である

### スコープ外

- 非周期タスク
- タスク間依存
- ドメイン / コア割当
- DoktorMagus pipeline reference

### 依存関係

- [phase-1-ui-interactions.md](phase-1-ui-interactions.md)
- [phase-1-analysis-engine.md](phase-1-analysis-engine.md)

### 検証方法

- TaskModel schema unit test
- `deadlineMs` 省略時の normalize test
- manual priority の validation test

## global-settings

### スコープ

Phase 1 のプロジェクト全体設定を定義する。

### データ構造

```typescript
type StackPresets = {
  low: number;
  mid: number;
  high: number;
};

type GlobalSettings = {
  tickMs: number;
  stackPresets: StackPresets;
  ramCapacityBytes?: number;
};
```

### 受け入れ条件

- [ ] `tickMs` の既定値は 1 である
- [ ] stack preset の既定値は low=512, mid=2048, high=4096 bytes である
- [ ] `ramCapacityBytes` がある場合、memory profile に capacity line を表示する
- [ ] `ramCapacityBytes` がない場合でも peak stack は表示できる

### スコープ外

- context switch overhead δ
- CPU clock / utilization のハードウェア換算
- per-core stack preset

### 依存関係

- [phase-1-analysis-engine.md](phase-1-analysis-engine.md)

### 検証方法

- default settings normalize test
- RAM capacity 有無で Problems が変わることを unit test する

## project-state

### スコープ

UI 操作中の正本状態を定義する。Jotai atom はこの ProjectState を保持し、AnalysisSnapshot は派生値として計算する。

### データ構造

```typescript
type ProjectState = {
  version: '0.1';
  global: GlobalSettings;
  tasks: TaskModel[];
  selectedTaskId?: string;
};
```

### 受け入れ条件

- [ ] `tasks` の順序はリスト表示順として保持される
- [ ] RMA auto priority は `periodMs` と `tasks` から派生し、ProjectState に重複保存しない
- [ ] `selectedTaskId` は export 対象にしない
- [ ] Undo/Redo は ProjectState の永続対象部分を snapshot として扱う

### スコープ外

- UI パネルの開閉状態の永続化
- viewport / scroll position の永続化

### 依存関係

- [phase-1-ui-interactions.md](phase-1-ui-interactions.md)
- [phase-1-project-file-schema.md](phase-1-project-file-schema.md)

### 検証方法

- ProjectState 変更時に AnalysisSnapshot が再計算されることを state test で確認する
- export 対象から transient UI state が除外されることを確認する

## analysis-snapshot

### スコープ

解析エンジンから UI に渡す派生状態を定義する。

### データ構造

```typescript
type TaskAnalysis = {
  taskId: string;
  effectiveDeadlineMs: number;
  effectivePriority: number;
  bufferMs: number;
  bufferConsumedMs: number;
  bufferRemainingMs: number;
  approximateResponseTimeMs: number;
  schedulable: boolean;
};

type AnalysisSnapshot = {
  lcmTicks: number;
  lcmMs: number;
  tasks: TaskAnalysis[];
  aperiodicCapacityPercent: number;
  memoryProfile: MemoryProfile;
  problems: Problem[];
};
```

### 受け入れ条件

- [ ] AnalysisSnapshot は ProjectState から純粋関数で生成できる
- [ ] UI component は AnalysisSnapshot を mutate しない
- [ ] Problems と task analysis は `taskId` で関連付く
- [ ] export/import 前後で AnalysisSnapshot が一致することを比較できる

### スコープ外

- Phase 2 の反復 RTA 結果
- Phase 4 の per-core analysis

### 依存関係

- [phase-1-analysis-engine.md](phase-1-analysis-engine.md)

### 検証方法

- Motor Control 1-axis fixture の snapshot test

## 未解決事項

- `manualPriority` の数値方向を高いほど高優先度にするか、低いほど高優先度にするか
- ProjectFile に task `id` を含めるか、import 時に再生成するか