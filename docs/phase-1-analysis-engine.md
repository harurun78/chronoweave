# Chronoweave Phase 1 Analysis Engine

## 概要

Phase 1 の解析エンジンは、ProjectState から AnalysisSnapshot を生成する純粋関数群である。目的は厳密な全ケース解析ではなく、UI 操作に即応する RMA + 近似 RTA + バッファ可視化を成立させることにある。

## analysis-kernel

### スコープ

LCM、effective priority、近似応答時間、バッファ、Problems、メモリプロファイルをまとめて計算する analysis kernel を定義する。

### 受け入れ条件

- [ ] `ProjectState -> AnalysisSnapshot` の純粋関数がある
- [ ] タスク数 10 個以下、LCM 10,000 tick 以下を初期ターゲットにする
- [ ] 入力エラーがある場合も Problems として返し、UI を落とさない
- [ ] 解析結果はガント、バッファ、メモリ、Problems で共有される
- [ ] Phase 1 の近似 RTA Info が常時 Problems に含まれる

### スコープ外

- 反復 RTA
- Sporadic Server
- マルチコア解析
- context switch overhead δ

### 依存関係

- [phase-1-data-model.md](phase-1-data-model.md)

### 検証方法

- fixture ごとの AnalysisSnapshot snapshot test
- 不正入力時も Problems を返す unit test

## lcm-and-priority

### スコープ

周期タスクの LCM と RMA priority を計算する。

### 受け入れ条件

- [ ] `periodMs / tickMs` が整数 tick として扱える場合に LCM を計算する
- [ ] LCM が 10,000 tick を超える場合 Warning を出す
- [ ] `priorityMode: auto` のタスクは period が短いほど高優先度になる
- [ ] period が同じ auto priority タスクは stable order で tie break する
- [ ] manual priority タスクは validation 後に effective priority へ反映される

### Phase 1 priority semantics

- `effective_priority` は小さい整数ほど高優先度とする。
- manual priority の許容範囲は `1..taskCount` とする。
- manual priority の重複は Error Problem として扱う。
- auto/manual 混在時は manual priority を固定枠として先に割り当て、auto task は残りの priority 番号へ RMA order（period 昇順、同 period は入力順）で割り当てる。
- manual priority が auto task と同じ番号になることは、auto 割り当て側が空き番号を選ぶことで避ける。

### スコープ外

- Deadline Monotonic priority
- priority ceiling protocol

### 依存関係

- [phase-1-data-model.md](phase-1-data-model.md) の `time-model` と `task-model`

### 検証方法

- LCM unit test
- 同一 period の stable ordering test
- manual priority validation test

## approximate-rta-and-buffer

### スコープ

Phase 1 の近似 RTA とバッファ消費モデルを定義する。

### 計算方針

```text
Buffer(task) = period_ms - wcet_ms
BufferConsumed(task) = sum(wcet_ms of higher priority tasks that can preempt once)
BufferRemaining(task) = Buffer(task) - BufferConsumed(task)
ApproxResponseTime(task) = wcet_ms + BufferConsumed(task)
```

Phase 1 では、higher priority task は対象 task の response window 内で最大 1 回だけ preempt できる近似として扱う。これは反復 RTA より楽観的なため、Info Problem を常時表示する。

初期 Warning 閾値:

- `bufferRemainingMs / periodMs <= 10%` の task は Warning。
- `bufferRemainingMs < 0` または `approximateResponseTimeMs > effectiveDeadlineMs` は Error。

### 受け入れ条件

- [ ] `wcet_ms > period_ms` は Error になる
- [ ] `approximateResponseTimeMs > effectiveDeadlineMs` は Error になる
- [ ] `bufferRemainingMs < 0` は Error になる
- [ ] `bufferRemainingMs / periodMs` が閾値以下なら Warning になる
- [ ] 近似 RTA は楽観バイアスを持つため Info が常時表示される

### スコープ外

- 天井関数を使った反復 RTA
- context switch overhead δ
- blocking time

### 依存関係

- [phase-1-data-model.md](phase-1-data-model.md)
- [phase-1-non-functional-testing.md](phase-1-non-functional-testing.md)

### 検証方法

- 低利用率 fixture で期待値を検証する
- 高利用率 fixture で楽観バイアスがあることを test case として明示する
- Error / Warning / Info の Problems snapshot を確認する

## aperiodic-capacity-gauge

### スコープ

Phase 1 では非周期タスク入力を扱わないが、周期タスクの BufferRemaining から非周期受入余力ゲージを表示する。

### 受け入れ条件

- [ ] 非周期受入余力は最も低優先度の周期タスクの BufferRemaining から導出される
- [ ] 余力は percent 表示できる
- [ ] `MotorCtrl_Y` 追加前後で余力が低下することを確認できる
- [ ] 非周期タスク入力が未実装であることが UI から誤解されない

### スコープ外

- 非周期タスク作成 UI
- Sporadic Server

### 依存関係

- [phase-1-ui-interactions.md](phase-1-ui-interactions.md)

### 検証方法

- Motor Control 1-axis sample と 2-axis 拡張後の gauge 値を比較する

## memory-profile

### スコープ

Phase 1 では stack preset を必須にし、tick ごとのスタック同時占有量を波形表示する。目的は正確な RTOS stack lifetime の完全再現ではなく、UI パイプライン全体の一気通貫検証である。

### 受け入れ条件

- [ ] 各 task の `stack` から bytes を算出できる
- [ ] tick ごとの memory usage series を生成できる
- [ ] peak stack bytes を表示できる
- [ ] `ramCapacityBytes` がある場合 capacity line を表示できる
- [ ] peak が RAM の閾値を超える場合 Warning を出す

### Phase 1 sampling policy

- memory profile は LCM window 内の tick ごとの近似 stack usage とする。
- 各 tick では、周期 offset が `wcet_ms` 未満の task を active とみなし、その stack preset bytes を加算する。
- LCM が 10,000 tick を超える場合は LCM Warning を出し、series は最初の 10,000 tick に cap する。
- `peak_bytes / ram_capacity >= 90%` の場合 Warning。

### スコープ外

- 実 RTOS の exact stack lifetime
- ISR stack / heap / static allocation
- per-core memory profile

### 依存関係

- [phase-1-data-model.md](phase-1-data-model.md) の `global-settings`

### 検証方法

- stack preset の unit test
- peak warning の unit test
- memory series の snapshot test

## problems-model

### スコープ

Problems パネルに表示する Error / Warning / Info の構造と生成条件を定義する。

### データ構造

```typescript
type ProblemLevel = 'error' | 'warning' | 'info';

type Problem = {
  id: string;
  level: ProblemLevel;
  message: string;
  taskId?: string;
  source: 'schema' | 'analysis' | 'performance' | 'import';
};
```

### 受け入れ条件

- [ ] Error は設計が成立しない条件を表す
- [ ] Warning は余力低下、LCM 過大、メモリ逼迫などを表す
- [ ] Info は近似 RTA 注意、全タスクスケジューラブル等を表す
- [ ] `taskId` 付き Problem は UI で該当タスクにフォーカスできる
- [ ] import/schema error は Problems に表示される

### スコープ外

- IDE diagnostic protocol 互換
- 多言語化

### 依存関係

- [phase-1-ui-interactions.md](phase-1-ui-interactions.md)
- [phase-1-project-file-schema.md](phase-1-project-file-schema.md)

### 検証方法

- Problems generation unit test
- Problems click integration test

## 未解決事項

- Buffer warning threshold の初期値
- RAM warning threshold の初期値
- Phase 2 で反復 RTA を追加した際の AnalysisSnapshot 拡張形式
