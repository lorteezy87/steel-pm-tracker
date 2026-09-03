// One-off smoke test (not part of the app / CI) for the relational-upgrade
// concurrency fix: two browser tabs add DIFFERENT RFIs at the same time and
// both must land, with neither clobbering the other's row or any
// pre-existing data (proves per-record writes, not a whole-table replace).
//
// Run against a dev server started with VITE_AUTH_ENABLED=false (the app's
// built-in disabled-auth dev-user fallback — see src/lib/auth/verify.server.ts)
// because __Host- prefixed session cookies require a real HTTPS origin and
// this sandbox's plain http://localhost dev server can't hold a Better Auth
// session (a pre-existing environment constraint, unrelated to this fix;
// verified separately that email/password sign-up itself returns 200 and
// that server-side write authorization correctly requires a session — see
// PR notes). The per-record CRUD path exercised here is identical either way.
//
// Run with: VITE_AUTH_ENABLED=false npm run dev &  then  node test-concurrent-edit.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:8080";

async function addRfi(page, tag, rfiNumber, subject) {
  await page.goto(`${BASE}/rfis`, { waitUntil: "load", timeout: 20000 });
  const addButton = page.locator("text=Add RFI");
  await addButton.waitFor({ state: "visible", timeout: 20000 });
  // SSR renders the button before client hydration attaches its onClick —
  // wait for that (retry the click until the dialog actually shows up).
  for (let attempt = 0; attempt < 8; attempt++) {
    await addButton.click();
    await page.waitForTimeout(150);
    if (await page.locator('[role="dialog"]').count()) break;
  }
  const dialog = page.locator('[role="dialog"]');
  // The label's " *" required-marker renders as a second text node, so
  // match on the label's FULL concatenated text (normalize-space(.)), not
  // just its first text node (normalize-space(text())).
  const fieldByLabel = (label) =>
    dialog.locator(`xpath=.//label[normalize-space(.)="${label}"]/parent::div`);
  await fieldByLabel("Project *").locator("select").selectOption({ index: 0 });
  await fieldByLabel("RFI # *").locator("input").fill(rfiNumber);
  await fieldByLabel("Subject *").locator("input").fill(subject);
  await dialog.getByRole("button", { name: "Create" }).click();
  await page.waitForTimeout(1000); // let the optimistic + server round trip settle
}

async function main() {
  const stamp = Date.now();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const [pageA, pageB] = await Promise.all([context.newPage(), context.newPage()]);

    // Bootstrap the seeded demo projects into the (fresh, empty) server once,
    // via the same additive import endpoint the app's own Team Access
    // "Import JSON" flow and first-run bootstrap use — see
    // src/lib/pm/api/import.ts. Real usage triggers this automatically on
    // sign-in (src/components/workspace-sync.tsx); done directly here only
    // because auth is disabled for this smoke test.
    await pageA.goto(BASE, { waitUntil: "load" });
    await fetch(`${BASE}/api/pm/workspace`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          projects: [
            { id: "p1", code: "PHX-2401", name: "Phoenix Logistics Hub", client: "Desert Logistics LLC", status: "Active", startDate: "2026-03-15", targetComplete: "2026-09-30", owner: "Nick L.", notes: "" },
            { id: "p2", code: "TUC-2408", name: "Tucson Medical Expansion", client: "Banner Health", status: "Active", startDate: "2026-05-01", targetComplete: "2026-11-15", owner: "Nick L.", notes: "" },
          ],
          workPackages: [],
          drawingSets: [],
          drawingSheets: [],
          fab: [],
          deliveries: [],
          install: [],
          rfis: [],
          cos: [],
          roadblocks: [],
          tasks: [],
        },
      }),
    });

    const before = await (await fetch(`${BASE}/api/pm/workspace`)).json();
    const beforeCount = before.data ? before.data.rfis.length : 0;
    console.log("RFIs on server before:", beforeCount, "projects:", before?.data?.projects?.length ?? 0);

    await Promise.all([
      addRfi(pageA, "A", `CONC-A-${stamp}`, "Tab A's concurrent RFI"),
      addRfi(pageB, "B", `CONC-B-${stamp}`, "Tab B's concurrent RFI"),
    ]);

    await new Promise((r) => setTimeout(r, 600));
    const after = await (await fetch(`${BASE}/api/pm/workspace`)).json();
    const rfis = after.data.rfis;
    const rowA = rfis.find((r) => r.rfiNumber === `CONC-A-${stamp}`);
    const rowB = rfis.find((r) => r.rfiNumber === `CONC-B-${stamp}`);

    console.log("RFIs on server after:", rfis.length, "(expected", beforeCount + 2, ")");
    console.log("Tab A's RFI present:", Boolean(rowA), rowA?.subject);
    console.log("Tab B's RFI present:", Boolean(rowB), rowB?.subject);

    const ok =
      rfis.length === beforeCount + 2 &&
      Boolean(rowA) &&
      Boolean(rowB) &&
      rowA.subject === "Tab A's concurrent RFI" &&
      rowB.subject === "Tab B's concurrent RFI";

    console.log(ok ? "PASS: both concurrent per-record writes landed intact" : "FAIL: see counts/rows above");
    process.exitCode = ok ? 0 : 1;

    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
