# PROJECT_ARCHITECTURE

このドキュメントは、Chronoweave Phase 1 の Spec Kit 成果物を実装開始用に反映したアーキテクチャ要約です。

---

## 1. プロジェクト概要

- 名称: `chronoweave`
- 目的: RTOS 周期タスク設計を、編集 -> 解析 -> 可視化の短いループで検討できる静的 Web アプリを実装する。
- 主要ユースケース: Motor Control 1-axis sample を読み込み、`MotorCtrl_Y` を追加し、WCET を SVG Gantt で調整し、バッファ・メモリ・Problems の変化を確認して YAML/JSON として保存・復元する。
- 想定ユーザー: 組み込み/RTOS 設計者と Phase 1 実装者。

## 2. 技術スタック

- 言語: TypeScript
- ランタイム: Node.js 20
- フレームワーク: React + Vite
- 状態管理/主要ライブラリ: Jotai, @use-gesture/react, @tanstack/react-table, react-resizable-panels, Zod, yaml
- ストレージ/ミドルウェア: Phase 1 はブラウザ内のファイル import/export のみ。バックエンドなし。
- テスト/品質: Vitest, React Testing Library, Playwright, eslint, prettier

## 3. 実行コマンド

- Install: `npm ci`
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- TypeCheck: `npm run type-check`
- Unit Test: `npm run test:run`
- Integration Test: `npm run test:integration`

## 4. ディレクトリ構成

```text
src/
├── app/        # React app shell and composition
├── state/      # Jotai ProjectState and derived AnalysisSnapshot atoms
├── model/      # ProjectFile, ProjectState, task, analysis, Problem types
├── schema/     # ProjectFile v0.1 validation and normalization
├── analysis/   # Pure analysis kernel
├── samples/    # Motor Control fixtures
├── ui/         # Task list, Gantt, panels, gauges, Problems
└── io/         # YAML/JSON import/export

test/
├── fixtures/
├── model/
├── schema/
├── analysis/
├── ui/
└── e2e/
```

## 5. 責務分離

- `src/`: `アプリケーション実装`
- `tests/`: `検証コード`
- `docs/`: `仕様・運用ドキュメント`

## 6. アーキテクチャ制約

- 変更禁止領域: `vendor/, build生成物`
- 互換性方針: `仕様書の決定事項を優先`
- 外部公開契約: `docs/contracts/ または仕様書定義`

## 7. テスト戦略要約

- 最低限実行する検証: `npm run lint, npm run test:run, npm run test:integration`
- 重要な非機能要件: `性能・可観測性・保守性を仕様準拠で担保`
- 失敗時の復旧方針: `失敗時はロールバック手順に従う`

## 8. 参照仕様

- 生成元仕様: `specs/001-rtos-task-design-kernel/spec.md`, `specs/001-rtos-task-design-kernel/plan.md`, `specs/001-rtos-task-design-kernel/data-model.md`, `specs/001-rtos-task-design-kernel/research.md`, `specs/001-rtos-task-design-kernel/tasks.md`, `specs/001-rtos-task-design-kernel/contracts/project-file.schema.json`
- ADR/補足: `docs/adr/`
