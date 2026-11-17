import { test, expect } from "@playwright/test";

for (const javaScriptEnabled of [false, true]) {
  test(`credentials cannot navigate by GET before hydration (JS ${javaScriptEnabled})`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled });
    const page = await context.newPage();
    if (javaScriptEnabled) await page.route("**/*.js*", route => route.abort());
    await page.goto("http://localhost:3200/");
    const form = page.locator("form");
    await expect(form).toHaveAttribute("method", "post");
    await expect(form.locator("input[name=password]")).toBeDisabled();
    await expect(form.locator("button")).toBeDisabled();
    const request = page.waitForRequest(req => req.isNavigationRequest() && req.method() === "POST");
    await form.evaluate(el => (el as HTMLFormElement).submit());
    const submitted = await request;
    expect(new URL(submitted.url()).search).toBe("");
    expect(submitted.postData() || "").not.toMatch(/email|password/);
    await context.close();
  });
}
