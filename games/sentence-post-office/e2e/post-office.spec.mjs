import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { ALL_MISSIONS, missionsFor } from "../public/post-office/curriculum.js";
import { STORAGE_KEY } from "../public/post-office/engine.js";

test("separate entrance, strict case gate, delivery, reward and saved progress", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("link", { name: /键盘小岛/ })).toHaveAttribute(
    "href",
    "https://keyboard-island-doudou.groovy-river-7567.chatgpt.site/",
  );
  await page.getByRole("link", { name: /进入句子邮局/ }).click();
  await page.getByTestId("route-capital").click();
  const paper = page.getByRole("textbox", { name: "我的信纸" });
  await expect(paper).toHaveValue("");
  await paper.press("KeyT");
  await expect(paper).toHaveValue("");
  await expect(page.locator(".blocked-error")).toBeVisible();
  await expect(page.locator(".case-demo")).toContainText("t→T");
  await paper.press("KeyH");
  await expect(paper).toHaveValue("");
  await paper.press("Shift+KeyT");
  await expect(paper).toHaveValue("T");
  await expect(page.locator(".blocked-error")).toHaveCount(0);
  await paper.pressSequentially("he sun is up.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Delivered!" })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await paper.fill("The cat can jump.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Delivered!" })).toBeVisible();
  await page.getByRole("button", { name: /集邮册/ }).click();
  await expect(page.locator("dialog")).toContainText("1 / 16");
  await page.getByRole("button", { name: "关闭" }).click();
  await page.reload();
  await expect(page.locator(".progress-pill")).toContainText("2");
  const save = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    STORAGE_KEY,
  );
  expect(save.records["capital-1"].lastIndependent).toBe(false);
  expect(errors).toEqual([]);
});

test("all 32 missions complete and replay cannot duplicate rewards", async ({
  page,
}) => {
  await page.goto("/post-office/");
  for (const mission of ALL_MISSIONS) {
    if (mission.index === 0)
      await page.getByTestId(`route-${mission.routeId}`).click();
    const paper = page.getByRole("textbox", { name: "我的信纸" });
    await paper.fill(mission.target);
    await expect(paper, mission.id).toHaveValue(mission.target);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Delivered!" }),
    ).toBeVisible();
    if (mission.index === 7)
      await page.getByRole("button", { name: "Home", exact: true }).click();
    else await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).completed.length,
      STORAGE_KEY,
    ),
  ).toBe(32);
  await page.getByTestId("route-capital").click();
  await page
    .getByRole("textbox", { name: "我的信纸" })
    .fill(missionsFor("capital")[0].target);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Delivered!" })).toBeVisible();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).completed.length,
      STORAGE_KEY,
    ),
  ).toBe(32);
});

test("missing spaces and wrong punctuation cannot advance; native input and draft survive reload", async ({
  page,
}) => {
  await page.goto("/post-office/");
  await page.evaluate(() =>
    localStorage.setItem("keyboard-island-v1", '{"chapter":18,"shells":321}'),
  );
  await page.getByTestId("route-letters").click();
  const paper = page.getByRole("textbox", { name: "我的信纸" });
  await paper.press("Shift+KeyT");
  await paper.pressSequentially("he");
  await paper.press("KeyC");
  await expect(paper).toHaveValue("The");
  await expect(page.locator(".word-bridge-demo")).toContainText("The");
  await page
    .getByRole("button", { name: "Send", exact: true })
    .isDisabled()
    .then((value) => expect(value).toBe(true));
  await paper.press("Space");
  await paper.pressSequentially("cat is happy");
  await paper.press("Shift+Digit1");
  await expect(paper).toHaveValue("The cat is happy");
  await expect(page.locator(".punctuation-demo")).toContainText(".");
  await page.reload();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(paper).toHaveValue("The cat is happy");
  await paper.press("Period");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Delivered!" })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("keyboard-island-v1")),
  ).toBe('{"chapter":18,"shells":321}');
  const save = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    STORAGE_KEY,
  );
  expect(save.records["letters-1"].lastIndependent).toBe(false);
  expect(save.records["letters-1"].mistakes).toEqual(["space", "punctuation"]);
});

test("desktop and small-screen fit, sound controls and reset cancellation", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /进入句子邮局/ }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto("/post-office/");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight &&
          document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByTestId("route-space").click();
    await expect(
      page.getByRole("button", { name: "Send", exact: true }),
    ).toBeInViewport();
    await expect(
      page.getByRole("textbox", { name: "我的信纸" }),
    ).toBeInViewport();
  }
  await page.getByRole("button", { name: "声音：开" }).click();
  await expect(page.getByRole("button", { name: "声音：关" })).toBeVisible();
  await page.getByRole("button", { name: "家长" }).click();
  await page.getByRole("button", { name: "重新开始邮局" }).click();
  await page.getByRole("button", { name: "先不清空" }).click();
  await expect(page.locator("dialog")).toContainText("练习记录");
});

test("blocked browser storage still allows play and reduced motion retains a visible error", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("blocked", "SecurityError");
    };
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/post-office/");
  await page.getByTestId("route-punctuation").click();
  const paper = page.getByRole("textbox", { name: "我的信纸" });
  await paper.press("Shift+Digit1");
  await expect(page.locator(".blocked-error")).toBeVisible();
  await expect(paper).toHaveValue("The bear is sleepy");
  await paper.press("Period");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Delivered!" })).toBeVisible();
});

test("visual review artifacts, no external resources or browser errors", async ({
  page,
}) => {
  const errors = [],
    failed = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (response) => {
    if (response.status() >= 400) failed.push(response.url());
  });
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4188/"))
      external.push(request.url());
  });
  await mkdir("docs/images", { recursive: true });
  await page.goto("/");
  await page.screenshot({
    path: "docs/images/series.png",
    animations: "disabled",
  });
  await page.getByRole("link", { name: /进入句子邮局/ }).click();
  await page.screenshot({
    path: "docs/images/post-office.png",
    animations: "disabled",
  });
  await page.getByTestId("route-letters").click();
  const paper = page.getByRole("textbox", { name: "我的信纸" });
  await paper.press("KeyT");
  await page.screenshot({
    path: "docs/images/capital-hint.png",
    animations: "disabled",
  });
  await paper.fill("The cat is happy.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Delivered!" })).toBeVisible();
  await page.screenshot({
    path: "docs/images/delivery.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByTestId("route-space").click();
  await paper.press("KeyB");
  await expect(page.locator(".word-bridge-demo")).toBeVisible();
  await expect(paper).toHaveValue("The");
  await expect(page.locator(".error-key-guide")).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/images/space-hint-mobile.png",
    animations: "disabled",
  });
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
  expect(external).toEqual([]);
});

test("a pending render frame cannot steal the native text replacement selection", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__postFocusFrames = [];
    window.requestAnimationFrame = (callback) => {
      window.__postFocusFrames.push(callback);
      return window.__postFocusFrames.length;
    };
  });
  await page.goto("/post-office/");
  await page.getByTestId("route-punctuation").click();
  const paper = page.getByRole("textbox", { name: "我的信纸" });
  await paper.selectText();
  await page.evaluate(() =>
    window.__postFocusFrames
      .splice(0)
      .forEach((callback) => callback(performance.now())),
  );
  await page.keyboard.insertText("The bear is sleepy.");
  await expect(paper).toHaveValue("The bear is sleepy.");
  await expect(
    page.getByRole("button", { name: "Send", exact: true }),
  ).toBeEnabled();
});

test.describe("Enter on the Delivered screen", () => {
  const [first, second] = missionsFor("capital");
  const delivered = (page) => page.getByRole("heading", { name: "Delivered!" });
  const paperOf = (page) => page.getByRole("textbox", { name: "我的信纸" });
  const next = (page) =>
    page.getByRole("button", { name: "Next", exact: true });
  const sendWithEnter = async (page, target) => {
    await paperOf(page).fill(target);
    await paperOf(page).press("Enter");
    await expect(delivered(page)).toBeVisible();
  };

  test.beforeEach(async ({ page }) => {
    await page.goto("/post-office/");
    await page.getByTestId("route-capital").click();
  });

  test("goes to the next letter with an empty, focused paper", async ({
    page,
  }) => {
    await sendWithEnter(page, first.target);
    await expect(next(page)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator(".route-title")).toContainText("2 / 8");
    await expect(paperOf(page)).toBeFocused();
    await expect(paperOf(page)).toHaveValue("");
  });

  test("also works after sending with the mouse", async ({ page }) => {
    await paperOf(page).fill(first.target);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(delivered(page)).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator(".route-title")).toContainText("2 / 8");
  });

  test("a double tap moves on only one letter", async ({ page }) => {
    await sendWithEnter(page, first.target);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(page.locator(".route-title")).toContainText("2 / 8");
    await expect(paperOf(page)).toHaveValue("");
  });

  test("holding Enter down through sending does not skip the celebration", async ({
    page,
  }) => {
    await paperOf(page).fill(first.target);
    await page.keyboard.down("Enter");
    await expect(delivered(page)).toBeVisible();
    // Further down() calls without an up() are auto-repeat keydowns.
    await page.keyboard.down("Enter");
    await page.keyboard.down("Enter");
    await page.keyboard.up("Enter");
    await expect(delivered(page)).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator(".route-title")).toContainText("2 / 8");
  });

  test("still works after clicking the background", async ({ page }) => {
    await sendWithEnter(page, first.target);
    await delivered(page).click();
    await expect(next(page)).not.toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator(".route-title")).toContainText("2 / 8");
  });

  test("still works after looking at a new stamp", async ({ page }) => {
    await sendWithEnter(page, first.target);
    await page.keyboard.press("Enter");
    await sendWithEnter(page, second.target);
    await page.getByRole("button", { name: /New stamp/ }).click();
    await expect(page.locator("dialog")).toContainText("1 / 16");
    // Enter must not reach the Next button behind the open album.
    await page.getByRole("heading", { name: "My stamps" }).click();
    await page.keyboard.press("Enter");
    await expect(page.locator("dialog")).toBeVisible();
    await expect(delivered(page)).toBeAttached();
    await page.getByRole("button", { name: "关闭" }).click();
    await expect(page.locator("dialog")).toBeHidden();
    await expect(next(page)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator(".route-title")).toContainText("3 / 8");
  });

  test("leaves other focused buttons alone", async ({ page }) => {
    await sendWithEnter(page, first.target);
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("button", { name: "Home", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("route-capital")).toBeVisible();
  });

  test("opens the stamps after the last letter of a path", async ({ page }) => {
    await page.getByRole("button", { name: /^Letter 8/ }).click();
    await sendWithEnter(page, missionsFor("capital")[7].target);
    await expect(
      page.getByRole("button", { name: "Stamps", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("dialog")).toContainText("My stamps");
  });
});
