# Feature Specification: RTOS Task Design Kernel

**Feature Branch**: `001-rtos-task-design-kernel`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "Build Chronoweave Phase 1 as the RTOS Task Design Kernel: a responsive React/TypeScript web app for importing a motor-control sample, adding one axis, adjusting WCET on an SVG Gantt, seeing buffer/memory/Problems update immediately, and exporting/importing YAML/JSON ProjectFiles."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Motor Control sample を読み込む (Priority: P1)

組み込みエンジニアとして、Motor Control 1-axis sample を読み込み、既存タスクセットの周期、WCET、stack、バッファ余力、メモリ使用量をすぐ確認したい。

**Why this priority**: Phase 1 の価値は白紙入力ではなく、実務寄りの既存構成を触って検討できることにある。sample import は代表シナリオの入口である。

**Independent Test**: sample YAML を import し、`ISR_Timer`, `MotorCtrl_X`, `SensorFusion` が表示され、AnalysisSnapshot に Error がないことを確認する。

**Acceptance Scenarios**:

1. **Given** Motor Control 1-axis sample, **When** user imports it, **Then** task list, Gantt, buffer gauges, memory profile, and Problems render from the same ProjectState.
2. **Given** imported sample, **When** analysis runs, **Then** approximate RTA disclosure Info is always visible.

---

### User Story 2 - 1 軸追加して余力低下を見る (Priority: P1)

組み込みエンジニアとして、`MotorCtrl_X` を複製して `MotorCtrl_Y` を追加し、2 軸化によるバッファ余力とメモリ peak の変化を確認したい。

**Why this priority**: 1 軸追加は Phase 1 の中心的な設計変更であり、リアクティブな再計算とパネル同期を検証できる。

**Independent Test**: imported sample に `MotorCtrl_Y` を追加し、LCM、BufferRemaining、aperiodic capacity、memory profile、Problems が更新されることを確認する。

**Acceptance Scenarios**:

1. **Given** imported sample, **When** user duplicates `MotorCtrl_X` as `MotorCtrl_Y`, **Then** the task appears in list and Gantt with period 10ms, WCET 3ms, stack mid.
2. **Given** `MotorCtrl_Y` was added, **When** analysis recomputes, **Then** low-priority buffer remaining and aperiodic capacity decrease compared with the 1-axis baseline.

---

### User Story 3 - WCET をドラッグして即時に確かめる (Priority: P1)

組み込みエンジニアとして、Gantt 上のバー右端をドラッグして WCET を調整し、ガント、バッファ、メモリ、Problems が即時更新されることを確認したい。

**Why this priority**: Chronoweave の核心体験は、数値を眺めることではなく、操作しながら余力を体感する設計ループである。

**Independent Test**: `SensorFusion` または `MotorCtrl_Y` の WCET を drag 操作で変更し、ProjectState と AnalysisSnapshot が更新されることを確認する。

**Acceptance Scenarios**:

1. **Given** 2-axis task set, **When** user drags a WCET resize handle, **Then** the SVG bar width updates during drag.
2. **Given** drag ends, **When** WCET is committed, **Then** derived panels update with target p95 <= 100ms for Phase 1 fixture scale.

---

### User Story 4 - YAML/JSON として保存・復元する (Priority: P1)

組み込みエンジニアとして、調整後の設計を YAML として export し、後で import して同じ分析結果を再現したい。

**Why this priority**: ProjectFile は Phase 1 の保存契約であり、Phase 2 以降のコード生成 plugin 入力にもなる。

**Independent Test**: 2-axis edited state を YAML export し、画面リセット後に import して normalized ProjectFile と AnalysisSnapshot が一致することを確認する。

**Acceptance Scenarios**:

1. **Given** edited 2-axis state, **When** user exports YAML, **Then** file conforms to ProjectFile v0.1 schema.
2. **Given** exported YAML, **When** user imports it after reset, **Then** tasks, settings, and analysis results match the exported state.

---

### User Story 5 - エラーと注意を Problems で見る (Priority: P2)

実装者およびユーザーとして、schema error、WCET > period、deadline miss、buffer warning、memory warning、approximate-RTA info を Problems で確認したい。

**Why this priority**: Problems は設計制約の説明面であり、解析結果を UI に閉じ込めず検証可能にする。

**Independent Test**: invalid schema fixture、LCM warning fixture、high utilization fixture、memory warning fixture を読み込み、期待 Problems が表示されることを確認する。

**Acceptance Scenarios**:

1. **Given** invalid ProjectFile, **When** import is attempted, **Then** current ProjectState is preserved and import/schema problem is shown.
2. **Given** a task-specific Problem, **When** user clicks it, **Then** the corresponding task is selected or highlighted.

### Edge Cases

- `wcet_ms` is fractional while `tick_ms` is 1.
- `deadline_ms` is omitted and defaults to `period_ms`.
- LCM exceeds 10,000 ticks.
- `ram_capacity` is omitted.
- invalid YAML/JSON is imported.
- unknown fields appear in ProjectFile.
- duplicate task names exist but task IDs remain distinct.
- `priority_mode: manual` is set without `manual_priority`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST run as a static React + TypeScript + Vite web app without a backend server.
- **FR-002**: System MUST represent editable design state as ProjectState containing GlobalSettings and TaskModel records.
- **FR-003**: System MUST use microseconds internally for time calculations while displaying ms in UI.
- **FR-004**: System MUST preserve fractional `wcet_ms` such as 0.05ms even when `tick_ms` is 1.
- **FR-005**: System MUST import and validate ProjectFile v0.1 from YAML and JSON.
- **FR-006**: System MUST export ProjectFile v0.1 to YAML and JSON, excluding transient UI state.
- **FR-007**: System MUST provide Motor Control 1-axis sample with `ISR_Timer`, `MotorCtrl_X`, and `SensorFusion`.
- **FR-008**: System MUST allow adding or duplicating `MotorCtrl_X` as `MotorCtrl_Y`.
- **FR-009**: System MUST calculate LCM ticks from periodic task periods and `tick_ms`.
- **FR-010**: System MUST calculate RMA auto priority for tasks with `priority_mode: auto`.
- **FR-011**: System MUST calculate Phase 1 approximate response time, buffer consumed, and buffer remaining.
- **FR-012**: System MUST always show Info that Phase 1 approximate response time may be optimistic.
- **FR-013**: System MUST display task list, SVG Gantt, property panel, buffer gauges, memory profile, and Problems from the same ProjectState/AnalysisSnapshot.
- **FR-014**: System MUST support WCET resize by dragging the right edge of a Gantt bar.
- **FR-015**: System MUST support task list editing and property panel editing for Phase 1 task fields.
- **FR-016**: System MUST support Undo/Redo for task/settings changes.
- **FR-017**: System MUST surface schema, import, analysis, and performance-related issues as Problems.
- **FR-018**: System MUST treat non-periodic task input, iterative RTA, RTOS code generation, trace import, multi-core modeling, and heterogeneous SoC modeling as out of Phase 1 scope.

### Key Entities *(include if feature involves data)*

- **ProjectFile**: YAML/JSON persistence contract, versioned as `0.1` in Phase 1.
- **ProjectState**: In-memory editable state derived from ProjectFile plus transient UI selection.
- **GlobalSettings**: Tick, stack presets, and optional RAM capacity.
- **TaskModel**: Periodic RTOS task with period, WCET, optional deadline, priority mode, stack preset, and description.
- **AnalysisSnapshot**: Derived LCM, task analyses, aperiodic capacity, memory profile, and Problems.
- **Problem**: Error/Warning/Info entry associated with schema, import, analysis, or performance source.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Representative E2E scenario import -> add axis -> drag WCET -> export -> reset -> import passes.
- **SC-002**: Export/import roundtrip preserves normalized ProjectFile and produces the same AnalysisSnapshot for representative fixture.
- **SC-003**: WCET drag keeps visible response at least 30fps equivalent for Phase 1 representative fixture.
- **SC-004**: ProjectState commit to panel redraw p95 is <= 100ms for task count <= 10 and LCM <= 10,000 ticks, or measurements and remediation plan are recorded.
- **SC-005**: YAML/JSON import/export of <= 100KB ProjectFile completes within 300ms target on the chosen baseline environment, or measurements and remediation plan are recorded.
- **SC-006**: Unit tests cover time conversion, schema validation, LCM, priority, approximate RTA, buffer, memory profile, and Problems generation.

## Assumptions

- Implementation repository will use React + TypeScript + Vite and npm unless plan review changes it.
- Phase 1 targets desktop browser viewports, starting at 1366px width.
- Phase 1 task count target is 10 or fewer periodic tasks.
- YAML is the canonical human-editable ProjectFile format; JSON is isomorphic.
- Web Worker and Wasm are optimization options, not Phase 1 prerequisites.

## Scope Boundaries

### 受け入れ条件

- [ ] Phase 1 is limited to single-core periodic RTOS task design.
- [ ] ProjectFile import/export is included in Phase 1.
- [ ] Code generation is explicitly deferred to Phase 2+ generator module/plugin.
- [ ] Approximate RTA disclosure Info is always present.

### スコープ外

- Non-periodic task input and Sporadic Server.
- Iterative RTA.
- FreeRTOS / Zephyr code generation.
- Trace log import.
- Multi-core and heterogeneous SoC modeling.
- DoktorMagus integration.

### 依存関係

- [Data Model](data-model.md) defines normative entities and ProjectFile fields.
- [ProjectFile Schema](contracts/project-file.schema.json) defines machine-readable v0.1 contract.
- [Research](research.md) records technology and phase decisions.
- [Plan](plan.md) records implementation module boundaries.

### 検証方法

- Validate representative fixtures against [contracts/project-file.schema.json](contracts/project-file.schema.json).
- Execute tasks in [tasks.md](tasks.md) through the Phase 1 acceptance scenario.