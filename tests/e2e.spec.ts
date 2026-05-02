import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';

const clearDatabase = async (page: Page) => {
  await page.request.delete('http://localhost:5000/api/clear-all-data');
};

const createTestBook = async (page: Page) => {
  await page.request.post('http://localhost:5000/api/books', {
    data: {
      title: 'Test Book',
      author: 'Test Author',
      totalPages: 100,
      status: 'reading',
      color: '#ff0000',
    },
  });
};

const addReadingSession = async (page: Page, bookId: number, date: string) => {
    await page.request.post('http://localhost:5000/api/reading-sessions', {
        data: {
            bookId,
            date,
            pagesRead: 10,
            duration: 30
        }
    })
};

const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const setupInitialState = async (page: Page) => {
  await clearDatabase(page);
  await createTestBook(page);

  const today = new Date('2025-12-24T12:00:00.000Z');
  const sessionDate = new Date(today);
  sessionDate.setDate(today.getDate() - 15); // Add a session 15 days ago
  await addReadingSession(page, 1, formatDate(sessionDate));
};


test.describe('Reading Timeline Component', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Mock the current date to a fixed value for consistent testing
      const mockDate = new Date('2025-12-24T12:00:00.000Z');
      Date.now = () => mockDate.getTime();
    });
    await setupInitialState(page);
  });

  test('should hide selector and show ribbon on standard mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:5000/');
    await page.waitForTimeout(500);

    const timeline = page.getByTestId('reading-timeline-section');

    await expect(timeline.getByRole('combobox')).toBeHidden();
    await expect(timeline.getByTestId('ribbon-view')).toBeVisible();
    await expect(timeline.getByTestId('grid-view')).toBeHidden();

    await page.screenshot({ path: '/home/jules/verification/mobile_view_standard.png' });
  });

  test('should show selector and grid on foldable mobile', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 912 });
    await page.goto('http://localhost:5000/');
    await page.waitForTimeout(500);

    const timeline = page.getByTestId('reading-timeline-section');

    await expect(timeline.getByRole('combobox')).toBeVisible();
    await expect(timeline.getByTestId('grid-view')).toBeVisible();
    await expect(timeline.getByTestId('ribbon-view')).toBeHidden();

    await page.screenshot({ path: '/home/jules/verification/mobile_view_foldable.png' });
  });

  test('should show selector and grid on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5000/');
    await page.waitForTimeout(500);

    const timeline = page.getByTestId('reading-timeline-section');

    await expect(timeline.getByRole('combobox')).toBeVisible();
    await expect(timeline.getByTestId('grid-view')).toBeVisible();
    await expect(timeline.getByTestId('ribbon-view')).toBeHidden();

    await page.screenshot({ path: '/home/jules/verification/desktop_view.png' });
  });

  test('should allow selecting 30-day ribbon view on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5000/');
    await page.waitForTimeout(500); // Wait for initial render and auto-switch to grid

    const timeline = page.getByTestId('reading-timeline-section');

    // The view should initially be the grid view
    await expect(timeline.getByTestId('grid-view')).toBeVisible();
    await expect(timeline.getByTestId('ribbon-view')).toBeHidden();

    // Find the selector and choose the "Last 30 days" option
    await timeline.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Last 30 days' }).click();

    // The view should now switch to the ribbon view
    await expect(timeline.getByTestId('ribbon-view')).toBeVisible();
    await expect(timeline.getByTestId('grid-view')).toBeHidden();

    await page.screenshot({ path: '/home/jules/verification/desktop_ribbon_view.png' });
  });

  test('should transition between views when resizing', async ({ page }) => {
    // Start with desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5000/');
    await page.waitForTimeout(500);

    const timeline = page.getByTestId('reading-timeline-section');
    await expect(timeline.getByTestId('grid-view')).toBeVisible();

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500); // Wait for ResizeObserver and useEffect

    await expect(timeline.getByTestId('ribbon-view')).toBeVisible();
    await expect(timeline.getByRole('combobox')).toBeHidden();

    // Resize back to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    await expect(timeline.getByTestId('grid-view')).toBeVisible();
    await expect(timeline.getByRole('combobox')).toBeVisible();
  });
});
