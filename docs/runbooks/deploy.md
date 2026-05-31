# Deploy runbook (GitHub Pages)

Chronoweave is a fully static Vite build. The default deploy target is GitHub
Pages of `harurun78/chronoweave`. The expected public URL is
`https://harurun78.github.io/chronoweave/`.

## 前提

- GitHub リポジトリの **Settings → Pages → Build and deployment** で `Source`
  を `GitHub Actions` に設定済み
- GitHub Environment `github-pages` が `deploy` job により自動作成される
  （初回 deploy で確定）
- `main` ブランチ保護を有効にし、CI (`.github/workflows/ci.yml`) のグリーン
  を必須にすることを推奨

## 通常デプロイ

1. PR をマージし `main` を進める
2. `.github/workflows/deploy.yml` が自動実行され `dist/` を Pages へ配布
3. Actions → `Deploy to GitHub Pages` のログ末尾の `page_url` で公開先を確認
4. ブラウザで開き、ガント・パネル・サンプル import が壊れていないことを確認

`workflow_dispatch` を手動トリガすれば任意のタイミングで再 deploy できる。

## ロールバック

最後に成功した状態に戻す手順:

1. ロールバック先のコミット `<sha>` を特定する (`git log main --oneline`)
2. 安全な復旧コミットを作成する（`git revert` を推奨）:

   ```bash
   git switch -c hotfix/rollback-<short-sha> main
   git revert <bad-sha>..main
   git push -u upstream hotfix/rollback-<short-sha>
   ```

3. PR を作成し CI を通したうえで `main` にマージ。マージで deploy が再実行
   され GitHub Pages が前の状態に戻る
4. 必要であれば `Deploy to GitHub Pages` を `workflow_dispatch` で手動再走

緊急時は GitHub UI から `actions/deploy-pages` の過去成功 run を
`Re-run all jobs` することで一時的に旧バンドルへ戻す手もある
（履歴に残らないため監査用途には revert を推奨）。

## ローカル検証

ローカルで本番ビルドを確認する:

```bash
VITE_BASE_PATH=/chronoweave/ npm run build
npx vite preview --base=/chronoweave/
```

ローカル開発時 (`npm run dev`) は `base=/` のため `VITE_BASE_PATH` を
未設定のまま使う。

## トラブルシューティング

- **404 of asset paths**: `VITE_BASE_PATH` が `/chronoweave/` で build できて
  いない可能性。`deploy.yml` の `env` を確認
- **Pages が無効**: Settings → Pages の Source が `GitHub Actions` でない場合
  は `actions/configure-pages` が失敗するので設定し直す
- **CI と Deploy が衝突**: `concurrency: pages` で deploy は逐次化される。
  CI 側は別 group のため衝突しない
