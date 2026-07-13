import { expect, test } from '@playwright/test';

test.describe('税計算・割引計算', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード').fill('test1234');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await page.waitForURL('/');
  });

  test('金額を入力すると8%/10%の税込価格が表示される', async ({ page }) => {
    const input = page.getByPlaceholder('元金額を入力');
    await input.fill('1000');

    await expect(page.getByText('1,080 円')).toBeVisible();
    await expect(page.getByText('（税 80 円）')).toBeVisible();
    await expect(page.getByText('1,100 円')).toBeVisible();
    await expect(page.getByText('（税 100 円）')).toBeVisible();
  });

  test('割引モードで金額と割引率を入力すると割引後価格が表示される', async ({ page }) => {
    await page.getByRole('button', { name: '割引価格' }).click();

    const priceInput = page.getByPlaceholder('元金額を入力');
    const discountInput = page.getByPlaceholder('割引率を入力');

    await priceInput.fill('2000');
    await discountInput.fill('30');

    await expect(page.getByText('1,400 円')).toBeVisible();
    await expect(page.getByText('（-600 円）')).toBeVisible();
  });
});
