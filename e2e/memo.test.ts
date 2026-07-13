import { expect, test } from '@playwright/test';

test.describe('メモ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード').fill('test1234');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await page.waitForURL('/');
  });

  test('テキストを入力して保存され、リロード後も残っている', async ({ page }) => {
    const memo = page.locator('#memo-content');
    const testText = `E2Eテスト ${Date.now()}`;

    await memo.fill(testText);

    // デバウンス（1500ms）後のServer Action保存完了を待つ
    await expect(page.getByText('たった今保存')).toBeVisible({ timeout: 5000 });

    await page.reload();
    await expect(memo).toHaveValue(testText, { timeout: 5000 });
  });
});
