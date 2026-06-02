import { test, expect } from '@playwright/test';

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user auth
    await page.route('**/auth/v1/user*', async route => {
      await route.fulfill({ status: 200, json: { id: 'mock-user' } });
    });
    // Mock api/saved data
    await page.route('**/api/saved', async route => {
      await route.fulfill({ status: 200, json: { data: [] } });
    });
    // Mock profile
    await page.route('**/rest/v1/profiles*', async route => {
      await route.fulfill({ status: 200, json: [{ id: 'mock-user' }] });
    });
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

    await page.goto('/feed/kanban');
  });

  test('Renders all kanban columns', async ({ page }) => {
    await expect(page.locator('text=Bookmarked').first()).toBeVisible();
    await expect(page.locator('text=Applied').first()).toBeVisible();
    await expect(page.locator('text=Interviewing').first()).toBeVisible();
    await expect(page.locator('text=Closed').first()).toBeVisible();
  });
});
