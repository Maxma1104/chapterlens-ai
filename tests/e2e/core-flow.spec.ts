import { expect, test } from "@playwright/test";

test("visitor can open the review desk and inspect grounded evidence", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /See the story/i })).toBeVisible();
  await page.getByRole("link", { name: /Analyze a chapter/i }).click();
  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("button", { name: /Run evidence-grounded review/i }).click();

  await expect(page.getByRole("heading", { name: "The Archive Key" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/grounded/).first()).toBeVisible();
  await page.getByRole("button", { name: "Show evidence 1" }).first().click();
  await expect(page.getByText(/Source evidence 1/i)).toBeVisible();
});

test("invalid file type produces a useful error", async ({ page }) => {
  await page.goto("/analyze");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Upload .txt/i }).click();
  const fileChooser = await chooser;
  await fileChooser.setFiles({ name: "chapter.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a pdf") });
  await expect(page.getByText(/accepts plain-text/i)).toBeVisible();
});
