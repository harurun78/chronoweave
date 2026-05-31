# Lessons

再発防止に有効な学びのみ記録する。各エントリは「再発条件 / 検知方法 / 防止ルール」で短く残す。

## Playwright app-shell smoke はシリアル実行する

- 再発条件: 性能 budget (例: gantt drag 応答時間) を assertion する Playwright テストを `fullyParallel: true` または複数 worker で実行している
- 検知方法: ローカルでは passing するが CI / 高負荷下で `expect.toBeLessThan(...)` が時間超過で散発的に失敗する
- 防止ルール: 性能 assertion を含む spec の冒頭で `test.describe.configure({ mode: 'serial' })` を宣言し、CPU 競合による flake を避ける

## Playwright で同名要素が複数ある場合は role/cell で絞り込む

- 再発条件: タスク名やラベルがパネルとテーブルの双方に出現するアプリで、`page.getByText('Foo')` を使っている
- 検知方法: Playwright が strict mode violation で複数マッチを報告する
- 防止ルール: 表中のセルを狙う場合は `getByRole('cell', { name: ... })`、パネル見出しは `getByRole('heading', ...)` のように role を明示する
