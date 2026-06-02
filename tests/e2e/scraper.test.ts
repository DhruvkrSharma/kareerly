import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import ws from 'ws'

const TARGETS = [
  { name: 'Razorpay', url: 'https://razorpay.com/jobs/' },
  { name: 'Zepto', url: 'https://careers.zeptonow.com/' },
  { name: 'CRED', url: 'https://careers.cred.club/' },
  { name: 'Meesho', url: 'https://careers.meesho.com/' },
  { name: 'Swiggy', url: 'https://careers.swiggy.com/' },
  { name: 'BrowserStack', url: 'https://www.browserstack.com/careers' },
  { name: 'PhonePe', url: 'https://careers.phonepe.com/' },
  { name: 'Flipkart', url: 'https://careers.flipkart.com/' },
  { name: 'Zomato', url: 'https://www.zomato.com/careers' },
  { name: 'Paytm', url: 'https://careers.paytm.com/' }
]

test.describe('E2E Scraper Career Pages Test', () => {
  for (const target of TARGETS) {
    test(`Test career page: ${target.name}`, async ({ page }) => {
      // Test that each career page URL returns status 200
      const response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      expect(response?.status()).toBe(200)

      // Test that at least 1 job is found per page
      const links = await page.$$eval('a', (anchors) => anchors.map(a => a.href))
      
      const jobLinks = links.filter(href => {
        const lower = href.toLowerCase()
        if (lower.startsWith('mailto:') || lower.startsWith('tel:')) return false
        if (href === target.url || href + '/' === target.url) return false
        return lower.includes('/job') || lower.includes('/careers/') || lower.includes('/openings/') || lower.includes('gh_jid') || lower.includes('req') || lower.includes('position') || /\d{5,}/.test(lower)
      })

      // We expect at least one job link to be found (most career pages will have at least 1 job)
      expect(jobLinks.length).toBeGreaterThan(0)

      // Take the first job link to test validity
      const applyUrl = jobLinks[0]

      // Test that extracted apply_url is a valid URL (not homepage)
      expect(applyUrl).toMatch(/^https?:\/\//)
      
      // Test that apply_url is different from the career page root URL
      expect(applyUrl).not.toBe(target.url)
      expect(applyUrl).not.toBe(target.url + '/')
    })
  }
})
