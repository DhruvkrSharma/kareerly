import { test, expect } from '@playwright/test';

test.describe('Kareerly App E2E', () => {
  test('Redirects to login if not authenticated', async ({ page }) => {
    await page.goto('/feed');
    // It should redirect to login since we are not authenticated
    await expect(page).toHaveURL(/.*\/auth\/login/);
    
    // Verify login page elements
    await expect(page.locator('h1', { hasText: 'Kareerly' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('Login page edge cases - empty fields', async ({ page }) => {
    await page.goto('/auth/login');
    // Try to login without filling anything
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Should show error message
    await expect(page.locator('text=Please fill in all fields')).toBeVisible();
  });

  test('Signup mode toggles correctly', async ({ page }) => {
    await page.goto('/auth/login');
    // Click 'Sign up for free'
    await page.getByRole('button', { name: 'Sign up for free' }).click();
    
    // Verify heading changes
    await expect(page.locator('h2', { hasText: 'Create account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });
});
