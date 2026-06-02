# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scraper.test.ts >> E2E Scraper Career Pages Test >> Test career page: Zepto
- Location: tests/e2e/scraper.test.ts:23:9

# Error details

```
Test timeout of 30000ms exceeded.
```

```
TimeoutError: page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://careers.zeptonow.com/", waiting until "domcontentloaded"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | import { createClient } from '@supabase/supabase-js'
  3  | import { execSync } from 'child_process'
  4  | import { resolve } from 'path'
  5  | import { readFileSync } from 'fs'
  6  | import ws from 'ws'
  7  | 
  8  | const TARGETS = [
  9  |   { name: 'Razorpay', url: 'https://razorpay.com/jobs/' },
  10 |   { name: 'Zepto', url: 'https://careers.zeptonow.com/' },
  11 |   { name: 'CRED', url: 'https://careers.cred.club/' },
  12 |   { name: 'Meesho', url: 'https://careers.meesho.com/' },
  13 |   { name: 'Swiggy', url: 'https://careers.swiggy.com/' },
  14 |   { name: 'BrowserStack', url: 'https://www.browserstack.com/careers' },
  15 |   { name: 'PhonePe', url: 'https://careers.phonepe.com/' },
  16 |   { name: 'Flipkart', url: 'https://careers.flipkart.com/' },
  17 |   { name: 'Zomato', url: 'https://www.zomato.com/careers' },
  18 |   { name: 'Paytm', url: 'https://careers.paytm.com/' }
  19 | ]
  20 | 
  21 | test.describe('E2E Scraper Career Pages Test', () => {
  22 |   for (const target of TARGETS) {
  23 |     test(`Test career page: ${target.name}`, async ({ page }) => {
  24 |       // Test that each career page URL returns status 200
> 25 |       const response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
     |                                   ^ TimeoutError: page.goto: Timeout 30000ms exceeded.
  26 |       expect(response?.status()).toBe(200)
  27 | 
  28 |       // Test that at least 1 job is found per page
  29 |       const links = await page.$$eval('a', (anchors) => anchors.map(a => a.href))
  30 |       
  31 |       const jobLinks = links.filter(href => {
  32 |         const lower = href.toLowerCase()
  33 |         if (lower.startsWith('mailto:') || lower.startsWith('tel:')) return false
  34 |         if (href === target.url || href + '/' === target.url) return false
  35 |         return lower.includes('/job') || lower.includes('/careers/') || lower.includes('/openings/') || lower.includes('gh_jid') || lower.includes('req') || lower.includes('position') || /\d{5,}/.test(lower)
  36 |       })
  37 | 
  38 |       // We expect at least one job link to be found (most career pages will have at least 1 job)
  39 |       expect(jobLinks.length).toBeGreaterThan(0)
  40 | 
  41 |       // Take the first job link to test validity
  42 |       const applyUrl = jobLinks[0]
  43 | 
  44 |       // Test that extracted apply_url is a valid URL (not homepage)
  45 |       expect(applyUrl).toMatch(/^https?:\/\//)
  46 |       
  47 |       // Test that apply_url is different from the career page root URL
  48 |       expect(applyUrl).not.toBe(target.url)
  49 |       expect(applyUrl).not.toBe(target.url + '/')
  50 |     })
  51 |   }
  52 | })
  53 | 
```