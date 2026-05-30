# chronoweave

Chronoweave Phase 1 is an RTOS Task Design Kernel: a static React + TypeScript app for editing periodic task sets, deriving an approximate RTA/buffer/memory snapshot, and round-tripping YAML/JSON ProjectFiles.

## コンポーネント

- frontend: React + Vite + TypeScript (`src/`)
- tests: Vitest/React Testing Library and Playwright (`test/`)

## クイックスタート

### 必要な環境

- Node.js 20
- npm

### インストール

```bash
npm install
npm run dev
```

### 使い方

```bash
npm run lint
npm run type-check
npm run test:run
npm run test:e2e
npm run build
```

## ドキュメント

- [仕様書一覧](docs/)
- [仕様検討ログ](docs/specification-discussion-log.md)
- [Spec Kit feature](specs/001-rtos-task-design-kernel/)

## ライセンス

TODO: ライセンスを記載
