import { test, expect } from '@playwright/test';
import fs from 'fs';

test('Debug auth bypass', async ({ page }) => {
  await page.context().addCookies([
    { name: 'e2e-bypass', value: '1', domain: 'localhost', path: '/' }
  ]);
  await page.goto('/feed/kanban');
  const url = page.url();
  console.log('Final URL:', url);
  const html = await page.content();
  fs.writeFileSync('debug-output.html', html);
});
