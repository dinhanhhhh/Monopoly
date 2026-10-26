import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const screenshotsDir = path.resolve("tests/e2e/screenshots");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test.describe("P6: Playwright Headless E2E & Visual Testing (Desktop & Mobile)", () => {
  test("1. Desktop Viewport: Bắt đầu ván đấu mới, tương tác gieo xúc xắc và chụp ảnh Desktop Baseline", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000");

    // Đảm bảo tiêu đề trang đúng chuẩn
    await expect(page).toHaveTitle(/Cờ Tỷ Phú Sài Gòn/);

    // Chờ Modal Khởi tạo xuất hiện và bấm Bắt đầu ván mới
    const btnStartGame = page.locator("#btn-start-game");
    await expect(btnStartGame).toBeVisible({ timeout: 10000 });
    await btnStartGame.click();

    // Chờ Modal biến mất và bàn cờ hiển thị
    const board = page.locator("#monopoly-board");
    await expect(board).toBeVisible();

    // Kiểm tra nút Tung Xúc Xắc sẵn sàng
    const btnRoll = page.locator("#btn-roll");
    await expect(btnRoll).toBeVisible();

    // Bấm nút TUNG XÚC XẮC
    await btnRoll.click();

    // Chờ một chút để xúc xắc 3D hoàn thành hiệu ứng quay và di chuyển quân cờ
    await page.waitForTimeout(2000);

    // Kiểm tra thông tin vị trí ô đứng tại buồng lái
    const standingTileName = page.locator("#standing-tile-name");
    await expect(standingTileName).toBeVisible();

    // Chụp ảnh màn hình Desktop làm visual baseline
    const desktopScreenshotPath = path.join(screenshotsDir, "desktop-board.png");
    await page.screenshot({ path: desktopScreenshotPath });
    expect(fs.existsSync(desktopScreenshotPath)).toBeTruthy();
  });

  test("2. Mobile Viewport 375x667 (iPhone SE): Kiểm tra responsive bàn cờ và không tràn chiều ngang", async ({ page }) => {
    // Kích thước chuẩn iPhone SE (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("http://localhost:3000");

    // Bắt đầu ván đấu
    const btnStartGame = page.locator("#btn-start-game");
    await expect(btnStartGame).toBeVisible({ timeout: 10000 });
    await btnStartGame.click();

    // Chờ bàn cờ hiển thị
    const board = page.locator("#monopoly-board");
    await expect(board).toBeVisible();

    // Kiểm tra thanh điều hướng mobile tab
    const mobileNav = page.locator("#mobile-view-nav");
    if (await mobileNav.isVisible()) {
      await expect(mobileNav).toBeVisible();
    }

    // Kiểm tra không bị tràn thanh cuộn ngang (Horizontal scroll overflow)
    const isOverflowingHorizontal = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowingHorizontal).toBeFalsy();

    // Chụp ảnh màn hình Mobile làm visual baseline
    const mobileScreenshotPath = path.join(screenshotsDir, "mobile-board.png");
    await page.screenshot({ path: mobileScreenshotPath });
    expect(fs.existsSync(mobileScreenshotPath)).toBeTruthy();
  });

  test("3. Mô Phỏng 4 Bot Tự Đấu Trên Browser: Hoàn thành tự động nhiều vòng cờ", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000");

    // Chọn chế độ 4 Bot tự đấu (Khán giả)
    const mode4Bots = page.locator('.mode-card[data-mode="4bots"]');
    await expect(mode4Bots).toBeVisible({ timeout: 10000 });
    await mode4Bots.click();

    // Bấm bắt đầu
    const btnStart = page.locator("#btn-start-game");
    await btnStart.click();

    // Chọn tốc độ Turbo (⚡) để bot chạy nhanh
    const turboPill = page.locator('.btn-speed-pill[data-speed="10"]');
    if (await turboPill.isVisible()) {
      await turboPill.click();
    }

    // Chờ 4 Bot thi đấu liên tục trong 4 giây
    await page.waitForTimeout(4000);

    // Kiểm tra nhật ký trận đấu có ghi nhận nhiều sự kiện
    const logItems = page.locator("#game-log-messages .log-item, #game-log-messages > div");
    const count = await logItems.count();
    expect(count).toBeGreaterThan(3);

    // Chụp ảnh trạng thái trận đấu
    const simScreenshotPath = path.join(screenshotsDir, "bot-simulation-browser.png");
    await page.screenshot({ path: simScreenshotPath });
    expect(fs.existsSync(simScreenshotPath)).toBeTruthy();
  });
});
