import { expect, test } from '@playwright/test';

test.describe('認証', () => {
  test('正しい認証情報でログインするとダッシュボードに遷移する', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード').fill('test1234');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });

  test('誤ったパスワードでエラーが表示される', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード').fill('wrongpassword');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page.getByText('メールアドレスまたはパスワードが違います')).toBeVisible();
  });

  test('未ログインで / にアクセスすると /login にリダイレクトされる', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('ログイン済みで /login にアクセスすると / にリダイレクトされる', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード').fill('test1234');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await page.waitForURL('/');

    await page.goto('/login');
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });
});
