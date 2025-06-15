import { test, expect } from '@playwright/test'

test.describe('Calculator Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for tests
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('next-auth.session-token', 'mock-session-token')
    })
  })

  test('should complete full calculator flow', async ({ page }) => {
    await page.goto('/calculator')

    // Step 1: Personal Information
    await expect(page.getByRole('heading', { name: /personal information/i })).toBeVisible()
    
    await page.fill('[data-testid="spouse1-name"]', 'John Doe')
    await page.fill('[data-testid="spouse2-name"]', 'Jane Doe')
    await page.fill('[data-testid="marriage-date"]', '2015-01-01')
    await page.fill('[data-testid="separation-date"]', '2024-01-01')
    await page.selectOption('[data-testid="filing-state"]', 'PA')
    
    await page.click('[data-testid="next-button"]')

    // Step 2: Assets
    await expect(page.getByRole('heading', { name: /assets/i })).toBeVisible()
    
    await page.click('[data-testid="add-asset-button"]')
    await page.fill('[data-testid="asset-name-0"]', 'Family Home')
    await page.fill('[data-testid="asset-value-0"]', '500000')
    await page.selectOption('[data-testid="asset-type-0"]', 'real_estate')
    await page.check('[data-testid="asset-marital-0"]')
    
    await page.click('[data-testid="add-asset-button"]')
    await page.fill('[data-testid="asset-name-1"]', 'Investment Account')
    await page.fill('[data-testid="asset-value-1"]', '100000')
    await page.selectOption('[data-testid="asset-type-1"]', 'investment')
    await page.check('[data-testid="asset-marital-1"]')
    
    await page.click('[data-testid="next-button"]')

    // Step 3: Debts
    await expect(page.getByRole('heading', { name: /debts/i })).toBeVisible()
    
    await page.click('[data-testid="add-debt-button"]')
    await page.fill('[data-testid="debt-name-0"]', 'Mortgage')
    await page.fill('[data-testid="debt-amount-0"]', '200000')
    await page.selectOption('[data-testid="debt-type-0"]', 'mortgage')
    await page.check('[data-testid="debt-marital-0"]')
    
    await page.click('[data-testid="next-button"]')

    // Step 4: Special Circumstances
    await expect(page.getByRole('heading', { name: /special circumstances/i })).toBeVisible()
    
    await page.fill('[data-testid="income-spouse1"]', '75000')
    await page.fill('[data-testid="income-spouse2"]', '65000')
    await page.selectOption('[data-testid="health-spouse1"]', 'good')
    await page.selectOption('[data-testid="health-spouse2"]', 'good')
    
    await page.click('[data-testid="calculate-button"]')

    // Results Page
    await expect(page).toHaveURL(/\/calculator\/results/)
    await expect(page.getByRole('heading', { name: /property division results/i })).toBeVisible()
    
    // Check that results are displayed
    await expect(page.getByTestId('spouse1-share')).toBeVisible()
    await expect(page.getByTestId('spouse2-share')).toBeVisible()
    await expect(page.getByTestId('total-assets')).toHaveText('$600,000')
    await expect(page.getByTestId('total-debts')).toHaveText('$200,000')
    await expect(page.getByTestId('net-worth')).toHaveText('$400,000')
    
    // Check charts are displayed
    await expect(page.getByTestId('asset-distribution-chart')).toBeVisible()
    await expect(page.getByTestId('property-breakdown-chart')).toBeVisible()
    
    // Test PDF generation
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="download-pdf-button"]')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('should validate form fields', async ({ page }) => {
    await page.goto('/calculator')
    
    // Try to proceed without filling required fields
    await page.click('[data-testid="next-button"]')
    
    // Should show validation errors
    await expect(page.getByText(/spouse 1 name is required/i)).toBeVisible()
    await expect(page.getByText(/spouse 2 name is required/i)).toBeVisible()
    await expect(page.getByText(/marriage date is required/i)).toBeVisible()
    await expect(page.getByText(/filing state is required/i)).toBeVisible()
    
    // Should not proceed to next step
    await expect(page.getByRole('heading', { name: /personal information/i })).toBeVisible()
  })

  test('should save and restore progress', async ({ page }) => {
    await page.goto('/calculator')
    
    // Fill first step
    await page.fill('[data-testid="spouse1-name"]', 'John Doe')
    await page.fill('[data-testid="spouse2-name"]', 'Jane Doe')
    await page.fill('[data-testid="marriage-date"]', '2015-01-01')
    
    // Reload page
    await page.reload()
    
    // Data should be restored
    await expect(page.getByTestId('spouse1-name')).toHaveValue('John Doe')
    await expect(page.getByTestId('spouse2-name')).toHaveValue('Jane Doe')
    await expect(page.getByTestId('marriage-date')).toHaveValue('2015-01-01')
  })

  test('should handle community property states differently', async ({ page }) => {
    await page.goto('/calculator')
    
    // Fill personal info with California (community property state)
    await page.fill('[data-testid="spouse1-name"]', 'John Doe')
    await page.fill('[data-testid="spouse2-name"]', 'Jane Doe')
    await page.fill('[data-testid="marriage-date"]', '2015-01-01')
    await page.fill('[data-testid="separation-date"]', '2024-01-01')
    await page.selectOption('[data-testid="filing-state"]', 'CA')
    
    // Should show community property information
    await expect(page.getByText(/community property state/i)).toBeVisible()
    
    // Complete the flow with minimal data
    await page.click('[data-testid="next-button"]')
    
    // Add simple asset
    await page.click('[data-testid="add-asset-button"]')
    await page.fill('[data-testid="asset-name-0"]', 'House')
    await page.fill('[data-testid="asset-value-0"]', '400000')
    await page.selectOption('[data-testid="asset-type-0"]', 'real_estate')
    await page.check('[data-testid="asset-marital-0"]')
    
    await page.click('[data-testid="next-button"]')
    await page.click('[data-testid="next-button"]') // Skip debts
    await page.click('[data-testid="calculate-button"]')
    
    // Results should show 50/50 split for community property
    await expect(page.getByTestId('spouse1-percentage')).toHaveText('50%')
    await expect(page.getByTestId('spouse2-percentage')).toHaveText('50%')
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE size
    await page.goto('/calculator')
    
    // Mobile stepper should show condensed view
    await expect(page.getByTestId('mobile-stepper')).toBeVisible()
    
    // Form should be readable and usable
    await page.fill('[data-testid="spouse1-name"]', 'John')
    await page.fill('[data-testid="spouse2-name"]', 'Jane')
    
    // Touch targets should be appropriately sized (44px minimum)
    const nextButton = page.getByTestId('next-button')
    const box = await nextButton.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })

  test('should handle accessibility requirements', async ({ page }) => {
    await page.goto('/calculator')
    
    // Check for proper heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    expect(headings.length).toBeGreaterThan(0)
    
    // Check for form labels
    const inputs = await page.locator('input[type="text"], input[type="number"], select').all()
    for (const input of inputs) {
      const id = await input.getAttribute('id')
      if (id) {
        const label = page.locator(`label[for="${id}"]`)
        await expect(label).toBeVisible()
      }
    }
    
    // Check keyboard navigation
    await page.keyboard.press('Tab')
    const focusedElement = await page.locator(':focus').first()
    await expect(focusedElement).toBeVisible()
    
    // Check ARIA labels
    const buttons = await page.locator('button').all()
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label')
      const text = await button.textContent()
      expect(ariaLabel || text).toBeTruthy()
    }
  })

  test('should show proper loading states', async ({ page }) => {
    await page.goto('/calculator')
    
    // Mock slow API response
    await page.route('/api/calculate', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            spouse1Share: 0.5,
            spouse2Share: 0.5,
            totalMaritalAssets: 100000,
            totalMaritalDebts: 0,
            confidenceLevel: 0.8,
          },
        }),
      })
    })
    
    // Fill minimal form and submit
    await page.fill('[data-testid="spouse1-name"]', 'John')
    await page.fill('[data-testid="spouse2-name"]', 'Jane')
    await page.fill('[data-testid="marriage-date"]', '2020-01-01')
    await page.selectOption('[data-testid="filing-state"]', 'PA')
    await page.click('[data-testid="next-button"]')
    await page.click('[data-testid="next-button"]') // Skip assets
    await page.click('[data-testid="next-button"]') // Skip debts
    await page.click('[data-testid="calculate-button"]')
    
    // Should show loading state
    await expect(page.getByTestId('calculation-loading')).toBeVisible()
    await expect(page.getByText(/calculating/i)).toBeVisible()
    
    // Loading should disappear when complete
    await expect(page.getByTestId('calculation-loading')).not.toBeVisible({ timeout: 5000 })
  })

  test('should handle calculation errors gracefully', async ({ page }) => {
    await page.goto('/calculator')
    
    // Mock API error
    await page.route('/api/calculate', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error',
        }),
      })
    })
    
    // Fill minimal form and submit
    await page.fill('[data-testid="spouse1-name"]', 'John')
    await page.fill('[data-testid="spouse2-name"]', 'Jane')
    await page.fill('[data-testid="marriage-date"]', '2020-01-01')
    await page.selectOption('[data-testid="filing-state"]', 'PA')
    await page.click('[data-testid="next-button"]')
    await page.click('[data-testid="next-button"]') // Skip assets
    await page.click('[data-testid="next-button"]') // Skip debts
    await page.click('[data-testid="calculate-button"]')
    
    // Should show error message
    await expect(page.getByText(/error occurred/i)).toBeVisible()
    await expect(page.getByTestId('retry-calculation-button')).toBeVisible()
  })
})