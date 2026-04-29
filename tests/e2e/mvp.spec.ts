import { expect, test } from "@playwright/test";

declare const process: {
  readonly env: Readonly<Record<string, string | undefined>>;
};

interface SavedMutation {
  readonly block: number;
}

async function savedMutationBlocks(page: import("@playwright/test").Page): Promise<number[]> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("blockstead:mvp-save");

    if (raw === null) {
      return [];
    }

    const parsed = JSON.parse(raw) as { mutations?: SavedMutation[] };

    return parsed.mutations?.map((mutation) => mutation.block) ?? [];
  });
}

test("satisfies the constitution MVP gameplay loop", async ({ page }) => {
  const runtimeErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    runtimeErrors.push(error.message);
  });

  await page.goto(
    process.env.BLOCKSTEAD_BASE_URL ??
      process.env.CONTRIBUTE_VERIFY_URL ??
      process.env.PLAYWRIGHT_BASE_URL ??
      process.env.BASE_URL ??
      "/"
  );
  await page.evaluate(() => {
    localStorage.removeItem("blockstead:mvp-save");
  });
  await page.reload();

  await expect(page.locator("[data-testid='canvas-host']")).toBeVisible();
  await expect(page.locator("[data-testid='hud-root']")).toBeVisible();
  await expect(page.locator("[data-testid='hud-hotbar']")).toBeVisible();

  const coordinates = page.locator("[data-testid='hud-coordinates']");
  await expect(coordinates).toBeVisible();
  const initialCoordinates = await coordinates.textContent();

  await page.keyboard.down("KeyW");
  await page.waitForTimeout(750);
  await page.keyboard.up("KeyW");

  await expect
    .poll(() => coordinates.textContent(), {
      message: "player coordinates should change after holding W",
      timeout: 2_000
    })
    .not.toBe(initialCoordinates);

  await page.mouse.click(400, 300, { button: "left" });
  await expect(page.locator("[data-testid='hud-world-status']")).toContainText(/mined/i);

  await page.keyboard.press("Digit2");
  await expect(page.locator("[data-testid='hud-hotbar-slot-1']")).toHaveAttribute(
    "data-selected",
    "true"
  );

  await page.mouse.click(400, 300, { button: "right" });
  await expect(page.locator("[data-testid='hud-world-status']")).toContainText(/placed/i);

  await page.keyboard.press("KeyE");
  await expect(page.locator("[data-testid='hud-crafting-panel']")).toBeVisible();
  await page.locator("[data-testid='craft-recipe-planks']").click();
  await expect(page.locator("[data-testid='hud-inventory']")).toContainText(/planks/i);

  await page.keyboard.press("KeyP");
  await expect(page.locator("[data-testid='hud-save-status']")).toContainText(/saved/i);
  await expect.poll(() => savedMutationBlocks(page)).toEqual(
    expect.arrayContaining([0, 2])
  );

  await page.reload();
  await expect(page.locator("[data-testid='hud-save-status']")).toContainText(/loaded/i);
  await expect(page.locator("[data-testid='hud-inventory']")).toContainText(/planks/i);
  await page.keyboard.press("KeyP");
  await expect.poll(() => savedMutationBlocks(page)).toEqual(
    expect.arrayContaining([0, 2])
  );
  expect(runtimeErrors).toEqual([]);
});
