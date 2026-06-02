import { test, expect } from '@playwright/test';

test.describe('Navigation and UI Elements', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user auth
    await page.route('**/auth/v1/user*', async route => {
      await route.fulfill({ status: 200, json: { id: 'mock-user' } });
    });
    // Mock initial feed data so page doesn't crash
    await page.route('**/rest/v1/jobs*', async route => {
      await route.fulfill({ status: 200, json: [] });
    });
    await page.route('**/rest/v1/profiles*', async route => {
      await route.fulfill({ status: 200, json: [{ id: 'mock-user' }] });
    });
    // Mock getSession
    await page.route('**/auth/v1/session*', async route => {
      await route.fulfill({ status: 200, json: { session: { user: { id: 'mock-user' } } } });
    });
    
    // Set dummy auth cookie and e2e bypass cookie
    await page.context().addCookies([
      {
        name: 'sb-localhost-auth-token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/'
      },
      {
        name: 'e2e-bypass',
        value: '1',
        domain: 'localhost',
        path: '/'
      }
    ]);

    await page.goto('/feed');
  });

  test('Sidebar buttons exist and trigger actions', async ({ page }) => {
    // Test clicking Add New Job
    page.on('dialog', dialog => {
      expect(dialog.message()).toBe('Custom job uploads coming soon!');
      dialog.accept();
    });
    await page.getByRole('button', { name: 'Add New Job' }).click();
    
    // Test Settings Modal
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.locator('h2', { hasText: 'Settings' })).toBeVisible();
    await expect(page.locator('text=This is a placeholder for your account settings')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    
    // Test Help Modal
    await page.getByRole('button', { name: 'Help' }).click();
    await expect(page.locator('h2', { hasText: 'Help Center' })).toBeVisible();
    await expect(page.locator('text=Need help? You can contact our support team')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
  });

  test('Top navigation elements', async ({ page }) => {
    // Search input
    // The search input might be hidden on mobile width but visible on desktop width. We can check if it exists in DOM.
    await expect(page.getByPlaceholder('Search roles...')).toBeAttached();
    
    // Notifications Modal
    await page.locator('header').locator('button').filter({ has: page.locator('svg.lucide-bell') }).click();
    await expect(page.locator('h2', { hasText: 'Notifications' })).toBeVisible();
    await expect(page.locator('text=New AI Match')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    
    // Profile Dropdown
    await page.locator('header').getByRole('button', { name: 'D', exact: true }).click();
    await expect(page.locator('text=dhruv258.kumar@gmail.com')).toBeVisible();
    await page.getByRole('button', { name: 'Sign Out' }).click();
  });

  test('Dark mode toggle', async ({ page }) => {
    // Click dark mode toggle in sidebar
    const toggleBtn = page.getByRole('button').filter({ hasText: /Light Mode|Dark Mode/ });
    await expect(toggleBtn).toBeVisible();
    
    const initialText = await toggleBtn.innerText();
    await toggleBtn.click();
    
    if (initialText.includes('Light Mode')) {
      await expect(page.getByRole('button', { name: 'Dark Mode' })).toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: 'Light Mode' })).toBeVisible();
    }
  });
});
