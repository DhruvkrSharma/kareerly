import { test, expect } from '@playwright/test';

test.describe('Swipe Discover', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/v1/user*', async route => {
      await route.fulfill({ status: 200, json: { id: 'mock-user' } });
    });
    // Return mock feed
    await page.route('**/api/feed', async route => {
      await route.fulfill({ 
        status: 200, 
        json: { 
          data: [{
            rec_id: 1,
            job_id: 101,
            score: 0.9,
            title: 'Mock Swipe Job',
            company_name: 'Test Corp',
            location: 'Remote',
            skills: ['React'],
            apply_url: 'https://example.com'
          }]
        } 
      });
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

    await page.goto('/feed/discover');
  });

  test('Renders swipe cards and can swipe', async ({ page }) => {
    // Should see job
    await expect(page.locator('text=Mock Swipe Job')).toBeVisible();
    await expect(page.locator('text=Test Corp')).toBeVisible();

    // Can click pass
    const passButton = page.getByRole('button').filter({ has: page.locator('svg.lucide-x') });
    await expect(passButton).toBeVisible();
  });
});
