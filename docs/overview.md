# Chronoweave Overview

## 概要

Chronoweave は、RTOS タスク設計を「触って確かめる」ための Web ツールである。ユーザーはガントチャート上で WCET を操作し、タスク別バッファ余力、非周期受入余力、メモリプロファイル、Problems をリアルタイムに確認する。

Phase 1 は `RTOS Task Design Kernel / RTOSタスク設計中核` として、周期タスク・RMA・近似 RTA・YAML/JSON import/export・レスポンシブな UI 操作を完成させる。

## 背景と目的

### スコープ

既存の RTOS ツールは Tracealyzer / SystemView のような事後観測、Cheddar / SimSo のような解析、STM32CubeMX のような設定に寄っている。Chronoweave は、タスク構造を最初からインタラクティブに設計し、制約を即時フィードバックする設計ツールを目指す。

### 受け入れ条件

- [ ] Phase 1 の中心価値が「レスポンシブな UI 操作による RTOS タスク設計」で説明されている
- [ ] MVP 境界ではなく Phase 1 として仕様化する方針が明記されている
- [ ] コード生成は Phase 1 ではなく Phase 2 以降の generator module / plugin として扱う
- [ ] YAML/JSON import/export が Phase 1 に含まれる

### スコープ外

- 実装コード
- 実際の FreeRTOS / Zephyr コード生成
- トレースログ import
- ヘテロ SoC / マルチコアの詳細仕様

### 依存関係

- [phase-roadmap.md](phase-roadmap.md)
- [phase-1-product-spec.md](phase-1-product-spec.md)

### 検証方法

- [speckit-handoff.md](speckit-handoff.md) の spec-id が Phase 1 要件を過不足なく参照していることを確認する
- [phase-1-product-spec.md](phase-1-product-spec.md) の代表シナリオが Phase 1 完了判定として使えることを確認する

## プロダクト価値

### スコープ

Chronoweave の差別化は、インタラクティブ Gantt、リアルタイム制約ソルバ、タスク別バッファゲージの三位一体にある。Phase 1 では、計算精度の完成よりも、全表示パネルが同一モデルから派生し、編集に即応する設計ループを成立させる。

### 受け入れ条件

- [ ] WCET を変更すると、ガント、バッファゲージ、メモリプロファイル、Problems が同じ設計状態から更新される
- [ ] Problems には近似 RTA の楽観バイアスを知らせる Info が常時表示される
- [ ] 保存した YAML を import すると、保存前と同じ設計状態と分析結果を再現できる
- [ ] 代表シナリオは Motor Control 1-axis sample の import から始まる

### スコープ外

- 業務用プロジェクト管理ガントの機能再現
- AUTOSAR / AMALTHEA 互換
- 実機トレースとの同期

### 依存関係

- [phase-1-analysis-engine.md](phase-1-analysis-engine.md)
- [phase-1-ui-interactions.md](phase-1-ui-interactions.md)
- [phase-1-project-file-schema.md](phase-1-project-file-schema.md)

### 検証方法

- Phase 1 acceptance scenario を手動または E2E で実行する
- ユーザー操作ごとに派生値が stale にならないことを確認する

## ターゲットユーザー

### スコープ

Phase 1 の主要ユーザーは、FreeRTOS / Zephyr 等を使う組み込みエンジニアである。最終ペルソナはヘテロジニアス SoC 全体のタスク配置を考えるシステムアーキテクトだが、Phase 1 は RTOS 単体の設計体験に集中する。

### 受け入れ条件

- [ ] Phase 1 の UI と用語は RTOS 現場のエンジニアが理解できる粒度である
- [ ] `period_ms`, `wcet_ms`, `deadline_ms`, `priority`, `stack` が主要入力として扱われる
- [ ] 低負荷の学習用サンプルではなく、1 軸から 2 軸へ拡張する実務寄りのシナリオが用意される

### スコープ外

- 初学者向け RTOS 教材としての完全なチュートリアル
- 非エンジニア向けプロジェクト管理ツール

### 依存関係

- [phase-1-product-spec.md](phase-1-product-spec.md)

### 検証方法

- Motor Control 1-axis sample のフィールド名と Problems 表示が RTOS タスク設計の文脈に合っていることをレビューする

## 技術方針

### スコープ

Phase 1 は静的サイトとして動作する React + TypeScript アプリを前提にする。タスク数 O(10)、LCM 10,000 tick 以下を初期ターゲットとし、React + SVG + Jotai derived atom で即応性を検証する。

### 受け入れ条件

- [ ] 実装リポジトリは Vite + React + TypeScript で開始できる
- [ ] 解析ロジックは UI から分離され、unit test 可能である
- [ ] ProjectFile schema は UI と import/export validation で共有できる
- [ ] 描画応答の非機能要件が Phase 1 からテスト対象になっている

### スコープ外

- Phase 1 での Web Worker 必須化
- Phase 1 での Wasm 導入
- Phase 1 でのサーバー永続化

### 依存関係

- [phase-1-data-model.md](phase-1-data-model.md)
- [phase-1-non-functional-testing.md](phase-1-non-functional-testing.md)

### 検証方法

- [phase-1-non-functional-testing.md](phase-1-non-functional-testing.md) の performance budget を満たすか確認する

## 未解決事項

- コンテキストスイッチオーバーヘッド δ の具体的な Phase
- Phase 1 のタスク数上限の実測値
- CCW 観測ツールの正式名称

## 参考資料

- [ideas/draft/chronoweave.md](../../ideas/draft/chronoweave.md)