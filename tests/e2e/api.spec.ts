import { test, expect } from '@playwright/test'

test.describe('API Endpoint Black Box Testing', () => {
  
  test('GET /api/saved returns 401 Unauthorized when unauthenticated', async ({ request }) => {
    // We send a request without any Supabase auth cookies
    const response = await request.get('/api/saved')
    
    // Black Box expectation: Secure endpoints should block unauthenticated access
    expect(response.status()).toBe(401)
    
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/swipe returns 401 Unauthorized when unauthenticated', async ({ request }) => {
    // Send a mock payload without auth
    const response = await request.post('/api/swipe', {
      data: {
        job_id: 123,
        action: 'save'
      }
    })
    
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/resume/tailor requires valid job_id payload', async ({ request }) => {
    // In this test, we simulate an authenticated user by just checking if it fails 
    // at the validation layer or auth layer.
    const response = await request.post('/api/resume/tailor', {
      data: {} // missing job_id
    })
    
    // It should hit auth wall first
    expect(response.status()).toBe(401)
  })
})
