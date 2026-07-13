import { expect, test } from '@playwright/test';

test.describe('ブラウザ互換性', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード').fill('test1234');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await page.waitForURL('/');
  });

  test('キーワードで検索し、候補を選択すると対応状況が表示される', async ({ page }) => {
    const input = page.getByPlaceholder('例: grid-template-columns, Promise.all');
    // ドロップダウンが viewport 内に収まるよう入力欄を上部にスクロール
    await input.scrollIntoViewIfNeeded();
    await input.fill('flex');

    // ドロップダウンの候補が表示されるのを待つ
    const dropdown = page.locator('ul').filter({ has: page.locator('li') });
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // 最初の候補をクリック（createPortal で body 直下に描画されるため force 指定）
    await dropdown.locator('li').first().click({ force: true });

    // 対応状況テーブルが表示される
    await expect(page.getByText('Chrome', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Safari', { exact: true })).toBeVisible();
    await expect(page.getByText('Firefox')).toBeVisible();
  });
});
