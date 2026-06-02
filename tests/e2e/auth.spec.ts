import { test, expect } from '@playwright/test';

test.describe('Authentication Page - Exhaustive UI Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('Page renders correctly in login mode by default', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Welcome back' })).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeVisible();
  });

  test('Mode toggling (Login <-> Signup)', async ({ page }) => {
    // Switch to Signup
    await page.getByRole('button', { name: 'Sign up for free' }).click();
    await expect(page.locator('h2', { hasText: 'Create account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    
    // In Signup mode, "Forgot password" should not be visible
    await expect(page.getByRole('button', { name: 'Forgot password?' })).not.toBeVisible();

    // Switch back to Login
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('h2', { hasText: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('Password visibility toggle', async ({ page }) => {
    const passwordInput = page.getByPlaceholder('••••••••');
    
    // Type password
    await passwordInput.fill('secret123');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle button (it's the only button inside the relative div for the password input)
    // We can target it via the parent or icon
    const toggleBtn = page.locator('button').filter({ has: page.locator('svg.lucide-eye, svg.lucide-eye-off') });
    await toggleBtn.click();

    // Should now be visible
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('Forgot Password flow - empty email', async ({ page }) => {
    const forgotBtn = page.getByRole('button', { name: 'Forgot password?' });
    await forgotBtn.click();
    
    // Should show error for missing email
    await expect(page.locator('text=Please enter your email to reset password')).toBeVisible();
  });

  test('Forgot Password flow - valid email (mocked)', async ({ page }) => {
    // Intercept Supabase Auth reset password call
    await page.route('**/auth/v1/recover*', async route => {
      await route.fulfill({ status: 200, json: {} });
    });

    await page.getByPlaceholder('you@example.com').fill('test@example.com');
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    
    // Should show success message
    await expect(page.locator('text=Password reset instructions sent to your email.')).toBeVisible();
  });

  test('Sign In flow - empty fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.locator('text=Please fill in all fields')).toBeVisible();

    // Fill only email
    await page.getByPlaceholder('you@example.com').fill('test@example.com');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.locator('text=Please fill in all fields')).toBeVisible();
  });

  test('Sign In flow - invalid credentials (mocked)', async ({ page }) => {
    await page.route('**/auth/v1/token*', async route => {
      await route.fulfill({ 
        status: 400, 
        json: { error: 'invalid_grant', error_description: 'Invalid login credentials' } 
      });
    });

    await page.getByPlaceholder('you@example.com').fill('test@example.com');
    await page.getByPlaceholder('••••••••').fill('wrongpass');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.locator('text=Invalid login credentials')).toBeVisible();
  });

  test('Sign Up flow - valid input (mocked)', async ({ page }) => {
    await page.route('**/auth/v1/signup*', async route => {
      await route.fulfill({ status: 200, json: { id: '123' } });
    });

    await page.getByRole('button', { name: 'Sign up for free' }).click();
    await page.getByPlaceholder('you@example.com').fill('new@example.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.locator('text=Check your email to confirm your account.')).toBeVisible();
  });
});
