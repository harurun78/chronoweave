# Chronoweave Phase Roadmap

## 概要

Chronoweave は、MVP をゴールとして閉じるのではなく、最終構想を Phase 1〜5 に分割して実装可能な仕様へ落とす。Phase 1 は `RTOS Task Design Kernel / RTOSタスク設計中核` として、全体構想の最初の設計中核を作る。

## Phase 1: RTOSタスク設計中核

### スコープ

周期タスク、RMA、近似 RTA、バッファゲージ、非周期受入余力ゲージ、メモリプロファイル、Problems、YAML/JSON import/export、Undo/Redo、サンプル読み込みを実装対象とする。

### 受け入れ条件

- [ ] Motor Control 1-axis sample を import できる
- [ ] `MotorCtrl_Y` を追加し、WCET をガント上で調整できる
- [ ] ガント、バッファゲージ、メモリプロファイル、Problems が同一状態から更新される
- [ ] Phase 1 の近似 RTA 注意 Info が常時表示される
- [ ] YAML export/import により保存前と同じ設計状態を復元できる
- [ ] 描画応答の performance budget が定義され、計測できる

### スコープ外

- 非周期タスク入力
- Sporadic Server
- 反復 RTA
- RTOS コード生成
- トレースログ import
- マルチコア / 複数ドメイン

### 依存関係

- [phase-1-product-spec.md](phase-1-product-spec.md)
- [phase-1-data-model.md](phase-1-data-model.md)
- [phase-1-analysis-engine.md](phase-1-analysis-engine.md)
- [phase-1-ui-interactions.md](phase-1-ui-interactions.md)
- [phase-1-project-file-schema.md](phase-1-project-file-schema.md)
- [phase-1-non-functional-testing.md](phase-1-non-functional-testing.md)

### 検証方法

- [phase-1-product-spec.md](phase-1-product-spec.md) の代表シナリオを実行する
- [phase-1-non-functional-testing.md](phase-1-non-functional-testing.md) の性能計測を実施する

## Phase 2: 非周期・生成拡張

### スコープ

非周期タスク入力、Sporadic Server、バジェットゾーン、反復 RTA、コード生成 module/plugin を追加する。Phase 2 は必要に応じて `analysis upgrade` と `codegen plugin` に分割できる。

### 受け入れ条件

- [ ] 非周期タスクを入力できる
- [ ] Sporadic Server の予算と周期を設定できる
- [ ] 反復 RTA によって Phase 1 の近似より保守的な応答時間を算出できる
- [ ] FreeRTOS 生成 plugin が ProjectFile を入力として扱える
- [ ] コード生成は UI 中核から分離された module/plugin として実装できる

### スコープ外

- トレースログ import
- Linux の確率的スケジューリング
- マルチコア割当

### 依存関係

- [phase-1-data-model.md](phase-1-data-model.md)
- [phase-1-project-file-schema.md](phase-1-project-file-schema.md)

### 検証方法

- Phase 1 ProjectFile を Phase 2 でも読み込めることを確認する
- 近似 RTA と反復 RTA の比較テストを実施する

## Phase 3: 観測連携

### スコープ

Tracealyzer / SystemView / CSV 等のトレースログからタスク構造を抽出し、設計モデルとの差分を可視化する。

### 受け入れ条件

- [ ] トレースログから task name, period estimate, execution time estimate を抽出できる
- [ ] 設計上の TaskModel と観測由来 TaskModel を比較できる
- [ ] 差分を Problems または専用比較ビューで表示できる

### スコープ外

- 実機計測ツールそのものの実装
- RTOS vendor 固有 format の完全対応

### 依存関係

- Phase 1 ProjectFile schema
- Phase 1 Analysis Engine

### 検証方法

- fixture trace を読み込み、期待する TaskModel に変換されることを確認する

## Phase 4: ヘテロ SoC 設計

### スコープ

ベアメタル、RTOS、Linux、将来の FPGA を実行ドメインとして扱い、ドメイン間通信、マルチコア、メモリ領域、レイテンシ制約を設計対象にする。

### 受け入れ条件

- [ ] 複数実行ドメインをモデル化できる
- [ ] ドメイン間通信チャネルを定義できる
- [ ] マルチコア時のプリエンプションとスタック占有を区間単位で表現できる
- [ ] Linux 由来レスポンスを確率的または非周期入力として扱う方針が定義される

### スコープ外

- SoC vendor ごとの完全な board support package 生成
- Linux scheduler の完全シミュレーション

### 依存関係

- Phase 1 TaskModel
- Phase 2 非周期モデル
- Phase 3 観測モデル

### 検証方法

- 代表 SoC profile fixture を作成し、ドメイン間通信を含む設計を読み込めることを確認する

## Phase 5: DoktorMagus 連携

### スコープ

Chronoweave で定義したタスクの内部処理を DoktorMagus のノードグラフへ接続し、タスク構造と信号処理パイプラインを分担して設計できるようにする。

### 受け入れ条件

- [ ] TaskModel から DoktorMagus 側の pipeline reference を保持できる
- [ ] タスク単位で外部パイプライン定義を参照できる
- [ ] 連携なしでも Chronoweave 単体の ProjectFile が有効である

### スコープ外

- DoktorMagus 本体の仕様変更
- ノードグラフエディタの Chronoweave 内蔵

### 依存関係

- Phase 1 ProjectFile schema
- DoktorMagus 側の公開契約

### 検証方法

- pipeline reference を含む ProjectFile fixture を validate できることを確認する

## フェーズ間互換性

### スコープ

ProjectFile は Phase 1 から長期的な中間表現として扱う。後続 Phase は backward compatible な拡張を基本にし、破壊的変更が必要な場合は `version` を上げる。

### 受け入れ条件

- [ ] Phase 1 ProjectFile は Phase 2 以降でも読み込める
- [ ] 追加フィールドは optional または version migration で扱う
- [ ] canonical format は YAML、JSON は同型表現である

### スコープ外

- Phase 1 時点での全 Phase schema 完成

### 依存関係

- [phase-1-project-file-schema.md](phase-1-project-file-schema.md)

### 検証方法

- ProjectFile fixture に対して schema validation と migration test を実行する

## 未解決事項

- Phase 2 を `analysis upgrade` と `codegen plugin` に分割するか
- Phase 4 の SoC profile schema
- Phase 5 の DoktorMagus 連携契約