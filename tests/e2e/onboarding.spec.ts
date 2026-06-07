import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase getUser endpoint
    await page.route('**/auth/v1/user*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: {
          id: 'test-user-uuid',
          email: 'test@example.com',
          role: 'authenticated',
          aud: 'authenticated',
          user_metadata: { full_name: 'Test User' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      });
    });

    // Mock Supabase session cookie / auth storage
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'sb-yjevvqoxcoruilayumws-auth-token',
        JSON.stringify({
          access_token: 'fake-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'fake-refresh-token',
          user: { id: 'test-user-uuid', email: 'test@example.com' }
        })
      );
    });
  });

  test('Redirects un-onboarded user from /feed to /onboarding', async ({ page }) => {
    // Mock get profile returns profile_completed = false
    await page.route('**/rest/v1/profiles?id=eq.test-user-uuid&select=profile_completed', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: [{ profile_completed: false }]
      });
    });

    // Go to feed
    await page.goto('/feed');

    // Should be redirected to /onboarding
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.locator('h1', { hasText: "Let's Set Up Your Profile" })).toBeVisible();
  });

  test('Fills onboarding form manually and saves profile successfully', async ({ page }) => {
    // Mock get profile returns profile_completed = false
    await page.route('**/rest/v1/profiles?id=eq.test-user-uuid&select=*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: [{ id: 'test-user-uuid', email: 'test@example.com', profile_completed: false }]
      });
    });

    // Mock get profile completed check in middleware
    await page.route('**/rest/v1/profiles?id=eq.test-user-uuid&select=profile_completed', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: [{ profile_completed: false }]
      });
    });

    // Mock profile update API
    await page.route('/api/profile/update', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: { success: true }
      });
    });

    await page.goto('/onboarding');
    await expect(page.locator('h1', { hasText: "Let's Set Up Your Profile" })).toBeVisible();

    // Click "Fill Manually"
    await page.getByRole('button', { name: 'Fill Manually' }).click();

    // Verify Review step loads
    await expect(page.locator('h1', { hasText: 'Review Your Profile' })).toBeVisible();

    // Fill out Name
    const nameInput = page.locator('label:has-text("Full Name") + input');
    await nameInput.fill('Jane Doe');

    // Fill out Location
    const locInput = page.locator('label:has-text("Location") + input');
    await locInput.fill('Bangalore, India');

    // Add a skill
    const skillInput = page.getByPlaceholder('Add a skill...');
    await skillInput.fill('React');
    await page.getByRole('button', { name: 'Add' }).first().click();

    // Verify skill badge is added
    await expect(page.locator('span', { hasText: 'React' })).toBeVisible();

    // Mock subsequent profile completed checks to return true since profile is updated
    await page.route('**/rest/v1/profiles?id=eq.test-user-uuid&select=profile_completed', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: [{ profile_completed: true }]
      });
    });

    // Submit form
    await page.getByRole('button', { name: 'Save & Complete Onboarding' }).click();

    // Should redirect to dashboard /feed
    await expect(page).toHaveURL(/\/feed/);
  });
});
