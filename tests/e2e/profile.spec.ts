import { test, expect } from '@playwright/test';

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/v1/user*', async route => {
      await route.fulfill({ status: 200, json: { id: 'mock-user' } });
    });
    await page.route('**/rest/v1/profiles*', async route => {
      await route.fulfill({ status: 200, json: [{ 
        id: 'mock-user',
        full_name: 'Test Profile',
        resume_text: 'My resume text',
        skills: ['react'],
        experience_years: 2
      }] });
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

    await page.goto('/feed/profile');
  });

  test('Renders profile page and elements', async ({ page }) => {
    await expect(page.locator('text=Alex Chen')).toBeVisible();
    await expect(page.locator('text=Senior Frontend Engineer')).toBeVisible();
    
    // Save button (Now it's "Edit Profile")
    await expect(page.getByRole('button', { name: 'Edit Profile' }).first()).toBeVisible();
  });
});
