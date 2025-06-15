import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('should redirect unauthenticated users to sign in', async ({ page }) => {
    await page.goto('/calculator')
    
    // Should redirect to sign in page
    await expect(page).toHaveURL(/\/auth\/signin/)
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('should display sign in options', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Should show OAuth providers
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with apple/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with microsoft/i })).toBeVisible()
    
    // Should show email option
    await expect(page.getByLabelText(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in with email/i })).toBeVisible()
  })

  test('should handle email sign in flow', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Enter email
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.click('[data-testid="email-signin-button"]')
    
    // Should show verification message
    await expect(page.getByText(/check your email/i)).toBeVisible()
    await expect(page.getByText(/verification link/i)).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Enter invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.click('[data-testid="email-signin-button"]')
    
    // Should show validation error
    await expect(page.getByText(/valid email address/i)).toBeVisible()
  })

  test('should handle OAuth provider sign in', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Mock OAuth redirect
    await page.route('**/api/auth/signin/google*', route => {
      route.fulfill({
        status: 302,
        headers: {
          'Location': '/auth/callback/google?code=mock-auth-code'
        }
      })
    })
    
    // Click Google sign in
    await page.click('[data-testid="google-signin-button"]')
    
    // Should redirect to OAuth provider (mocked)
    await expect(page).toHaveURL(/auth\/callback\/google/)
  })

  test('should show loading state during authentication', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Mock slow response
    await page.route('**/api/auth/signin/email*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      })
    })
    
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.click('[data-testid="email-signin-button"]')
    
    // Should show loading state
    await expect(page.getByTestId('signin-loading')).toBeVisible()
    await expect(page.getByText(/signing in/i)).toBeVisible()
  })

  test('should handle authentication errors', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Mock authentication error
    await page.route('**/api/auth/signin/email*', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Invalid email address',
          success: false 
        })
      })
    })
    
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.click('[data-testid="email-signin-button"]')
    
    // Should show error message
    await expect(page.getByText(/authentication failed/i)).toBeVisible()
    await expect(page.getByTestId('error-message')).toBeVisible()
  })

  test('should redirect to intended page after sign in', async ({ page }) => {
    // Try to access protected page
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/signin/)
    
    // Mock successful authentication
    await page.evaluate(() => {
      localStorage.setItem('next-auth.session-token', 'mock-session-token')
    })
    
    // Navigate back to intended page
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('should sign out successfully', async ({ page }) => {
    // Mock authenticated session
    await page.evaluate(() => {
      localStorage.setItem('next-auth.session-token', 'mock-session-token')
    })
    
    await page.goto('/dashboard')
    
    // Click sign out
    await page.click('[data-testid="user-menu-button"]')
    await page.click('[data-testid="signout-button"]')
    
    // Should redirect to home page
    await expect(page).toHaveURL('/')
    
    // Should clear session
    const sessionToken = await page.evaluate(() => 
      localStorage.getItem('next-auth.session-token')
    )
    expect(sessionToken).toBeNull()
  })

  test('should handle session expiration', async ({ page }) => {
    // Mock expired session
    await page.route('**/api/auth/session', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Session expired' })
      })
    })
    
    await page.goto('/dashboard')
    
    // Should redirect to sign in
    await expect(page).toHaveURL(/\/auth\/signin/)
    await expect(page.getByText(/session expired/i)).toBeVisible()
  })

  test('should show user profile information when authenticated', async ({ page }) => {
    // Mock authenticated session
    await page.route('**/api/auth/session', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            image: 'https://example.com/avatar.jpg'
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      })
    })
    
    await page.goto('/dashboard')
    
    // Should show user information
    await expect(page.getByText('Test User')).toBeVisible()
    await expect(page.getByText('test@example.com')).toBeVisible()
    
    // User menu should be accessible
    await page.click('[data-testid="user-menu-button"]')
    await expect(page.getByTestId('user-menu')).toBeVisible()
  })

  test('should enforce role-based access control', async ({ page }) => {
    // Mock regular user session
    await page.route('**/api/auth/session', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-123',
            email: 'user@example.com',
            role: 'user'
          }
        })
      })
    })
    
    await page.goto('/admin')
    
    // Should show access denied
    await expect(page.getByText(/access denied/i)).toBeVisible()
    await expect(page.getByText(/insufficient permissions/i)).toBeVisible()
  })

  test('should allow admin access for admin users', async ({ page }) => {
    // Mock admin user session
    await page.route('**/api/auth/session', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'admin-123',
            email: 'admin@example.com',
            role: 'admin'
          }
        })
      })
    })
    
    await page.goto('/admin')
    
    // Should show admin dashboard
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible()
  })

  test('should handle 2FA setup and verification', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Sign in with email
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.click('[data-testid="email-signin-button"]')
    
    // Mock 2FA required response
    await page.route('**/api/auth/verify*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          requires2FA: true,
          qrCode: 'data:image/png;base64,mock-qr-code'
        })
      })
    })
    
    // Should show 2FA setup
    await expect(page.getByText(/two-factor authentication/i)).toBeVisible()
    await expect(page.getByTestId('qr-code')).toBeVisible()
    
    // Enter TOTP code
    await page.fill('[data-testid="totp-input"]', '123456')
    await page.click('[data-testid="verify-totp-button"]')
    
    // Should complete authentication
    await expect(page).toHaveURL(/\/dashboard/)
  })
})