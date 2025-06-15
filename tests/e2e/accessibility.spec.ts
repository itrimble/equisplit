import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('next-auth.session-token', 'mock-session-token')
    })
  })

  test('should not have any automatically detectable accessibility issues on home page', async ({ page }) => {
    await page.goto('/')
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should not have accessibility issues on calculator page', async ({ page }) => {
    await page.goto('/calculator')
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should not have accessibility issues on results page', async ({ page }) => {
    // Setup calculator data
    await page.evaluate(() => {
      const mockData = {
        personalInfo: {
          spouse1Name: 'John',
          spouse2Name: 'Jane',
          marriageDate: '2020-01-01',
          separationDate: '2024-01-01',
          filingState: 'PA',
          hasChildren: false
        },
        assets: [{ id: '1', name: 'House', value: 400000, type: 'real_estate', isMarital: true }]
      }
      localStorage.setItem('equisplit-calculator-v1', JSON.stringify(mockData))
    })
    
    await page.goto('/calculator/results')
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/calculator')
    
    // Start keyboard navigation
    await page.keyboard.press('Tab')
    
    // Should focus on first interactive element
    const firstFocused = await page.locator(':focus').first()
    await expect(firstFocused).toBeVisible()
    
    // Continue tabbing through form
    const tabbableElements = []
    for (let i = 0; i < 10; i++) {
      const focused = await page.locator(':focus').first()
      const tagName = await focused.evaluate(el => el.tagName)
      tabbableElements.push(tagName)
      await page.keyboard.press('Tab')
    }
    
    // Should have focused on form elements
    expect(tabbableElements).toContain('INPUT')
    expect(tabbableElements).toContain('SELECT')
    expect(tabbableElements).toContain('BUTTON')
  })

  test('should support screen reader navigation with proper headings', async ({ page }) => {
    await page.goto('/calculator')
    
    // Check heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    const headingLevels = []
    
    for (const heading of headings) {
      const level = await heading.evaluate(el => parseInt(el.tagName.charAt(1)))
      headingLevels.push(level)
    }
    
    // Should start with h1
    expect(headingLevels[0]).toBe(1)
    
    // Should not skip heading levels
    for (let i = 1; i < headingLevels.length; i++) {
      const diff = headingLevels[i] - headingLevels[i - 1]
      expect(diff).toBeLessThanOrEqual(1)
    }
  })

  test('should have proper form labels and ARIA attributes', async ({ page }) => {
    await page.goto('/calculator')
    
    // Check all form inputs have labels
    const inputs = await page.locator('input, select, textarea').all()
    
    for (const input of inputs) {
      const id = await input.getAttribute('id')
      const ariaLabel = await input.getAttribute('aria-label')
      const ariaLabelledby = await input.getAttribute('aria-labelledby')
      
      if (id) {
        const label = page.locator(`label[for="${id}"]`)
        const labelExists = await label.count() > 0
        expect(labelExists || ariaLabel || ariaLabelledby).toBeTruthy()
      } else {
        expect(ariaLabel || ariaLabelledby).toBeTruthy()
      }
    }
  })

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/calculator')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    
    const colorContrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    )
    
    expect(colorContrastViolations).toEqual([])
  })

  test('should support high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' })
    await page.goto('/calculator')
    
    // Check that content is still visible and usable
    await expect(page.getByRole('heading', { name: /personal information/i })).toBeVisible()
    await expect(page.getByLabelText(/spouse 1 name/i)).toBeVisible()
    
    // Form should still be functional
    await page.fill('[data-testid="spouse1-name"]', 'Test')
    await expect(page.getByTestId('spouse1-name')).toHaveValue('Test')
  })

  test('should work with reduced motion preferences', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/calculator')
    
    // Animations should be disabled or reduced
    const animatedElements = await page.locator('[class*="animate"], [class*="transition"]').all()
    
    for (const element of animatedElements) {
      const styles = await element.evaluate(el => getComputedStyle(el))
      const animationDuration = styles.animationDuration
      const transitionDuration = styles.transitionDuration
      
      // Should use reduced animations
      expect(animationDuration === '0s' || transitionDuration === '0s').toBeTruthy()
    }
  })

  test('should have descriptive link text', async ({ page }) => {
    await page.goto('/')
    
    const links = await page.locator('a').all()
    
    for (const link of links) {
      const text = await link.textContent()
      const ariaLabel = await link.getAttribute('aria-label')
      const title = await link.getAttribute('title')
      
      const linkText = text || ariaLabel || title
      
      // Link text should be descriptive (not just "click here", "read more", etc.)
      expect(linkText).toBeTruthy()
      expect(linkText?.toLowerCase()).not.toContain('click here')
      expect(linkText?.toLowerCase()).not.toContain('read more')
      expect(linkText?.toLowerCase()).not.toContain('here')
    }
  })

  test('should have proper focus indicators', async ({ page }) => {
    await page.goto('/calculator')
    
    // Tab to first focusable element
    await page.keyboard.press('Tab')
    
    const focusedElement = await page.locator(':focus').first()
    
    // Check that focus is visible
    const outline = await focusedElement.evaluate(el => getComputedStyle(el).outline)
    const boxShadow = await focusedElement.evaluate(el => getComputedStyle(el).boxShadow)
    const border = await focusedElement.evaluate(el => getComputedStyle(el).border)
    
    // Should have some form of focus indicator
    expect(outline !== 'none' || boxShadow !== 'none' || border !== 'none').toBeTruthy()
  })

  test('should handle error messages accessibly', async ({ page }) => {
    await page.goto('/calculator')
    
    // Trigger validation error
    await page.click('[data-testid="next-button"]')
    
    // Error messages should be announced to screen readers
    const errorMessages = await page.locator('[role="alert"], .error-message').all()
    
    expect(errorMessages.length).toBeGreaterThan(0)
    
    for (const error of errorMessages) {
      const role = await error.getAttribute('role')
      const ariaLive = await error.getAttribute('aria-live')
      
      // Should have alert role or aria-live
      expect(role === 'alert' || ariaLive === 'polite' || ariaLive === 'assertive').toBeTruthy()
    }
  })

  test('should support voice control and speech recognition', async ({ page }) => {
    await page.goto('/calculator')
    
    // Check for voice control landmarks
    const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]').all()
    expect(landmarks.length).toBeGreaterThan(0)
    
    // Buttons should have accessible names for voice commands
    const buttons = await page.locator('button').all()
    
    for (const button of buttons) {
      const text = await button.textContent()
      const ariaLabel = await button.getAttribute('aria-label')
      
      const accessibleName = text || ariaLabel
      expect(accessibleName).toBeTruthy()
      expect(accessibleName?.trim().length).toBeGreaterThan(0)
    }
  })

  test('should work with magnification tools', async ({ page }) => {
    await page.goto('/calculator')
    
    // Simulate 200% zoom
    await page.setViewportSize({ width: 640, height: 480 })
    
    // Content should still be usable
    await expect(page.getByRole('heading', { name: /personal information/i })).toBeVisible()
    
    // Form elements should not overlap
    const formElements = await page.locator('input, select, button').all()
    
    for (let i = 0; i < formElements.length - 1; i++) {
      const element1 = formElements[i]
      const element2 = formElements[i + 1]
      
      const box1 = await element1.boundingBox()
      const box2 = await element2.boundingBox()
      
      if (box1 && box2) {
        // Elements should not overlap significantly
        const overlap = !(box1.x + box1.width <= box2.x || 
                         box2.x + box2.width <= box1.x || 
                         box1.y + box1.height <= box2.y || 
                         box2.y + box2.height <= box1.y)
        
        if (overlap) {
          const overlapArea = Math.max(0, Math.min(box1.x + box1.width, box2.x + box2.width) - Math.max(box1.x, box2.x)) *
                             Math.max(0, Math.min(box1.y + box1.height, box2.y + box2.height) - Math.max(box1.y, box2.y))
          const smallerArea = Math.min(box1.width * box1.height, box2.width * box2.height)
          
          // Overlap should be minimal (less than 10% of smaller element)
          expect(overlapArea / smallerArea).toBeLessThan(0.1)
        }
      }
    }
  })

  test('should have proper table accessibility', async ({ page }) => {
    // Navigate to results page with table data
    await page.evaluate(() => {
      const mockData = {
        personalInfo: {
          spouse1Name: 'John',
          spouse2Name: 'Jane',
          marriageDate: '2020-01-01',
          separationDate: '2024-01-01',
          filingState: 'PA',
          hasChildren: false
        },
        assets: [
          { id: '1', name: 'House', value: 400000, type: 'real_estate', isMarital: true },
          { id: '2', name: 'Car', value: 25000, type: 'vehicle', isMarital: true }
        ]
      }
      localStorage.setItem('equisplit-calculator-v1', JSON.stringify(mockData))
    })
    
    await page.goto('/calculator/results')
    
    // Check table accessibility
    const tables = await page.locator('table').all()
    
    for (const table of tables) {
      // Should have caption or aria-label
      const caption = await table.locator('caption').count()
      const ariaLabel = await table.getAttribute('aria-label')
      expect(caption > 0 || ariaLabel).toBeTruthy()
      
      // Headers should be properly marked
      const headers = await table.locator('th').all()
      expect(headers.length).toBeGreaterThan(0)
      
      // Data cells should be associated with headers
      const dataCells = await table.locator('td').all()
      if (dataCells.length > 0) {
        for (const cell of dataCells.slice(0, 3)) { // Check first few cells
          const scope = await cell.getAttribute('scope')
          const headers = await cell.getAttribute('headers')
          const ariaDescribedBy = await cell.getAttribute('aria-describedby')
          
          // Should have some association with headers
          expect(scope || headers || ariaDescribedBy || headers.length > 0).toBeTruthy()
        }
      }
    }
  })
})