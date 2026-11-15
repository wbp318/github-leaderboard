// Opens the built page in a real browser and checks that it works: no script errors, the tornado
// draws, the views change and links to them work, Find yourself and "where you'd rank" work, and
// nothing scrolls sideways on a phone. CI runs it on every pull request and before every deploy.
//   npm i --no-save --no-package-lock playwright && npx playwright install chromium   (once)
//   npm run build && npm run e2e
import { chromium } from "playwright";

const url = new URL("../site/leaderboard.html", import.meta.url).href;
const errors = [];
let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failed++;
};

const browser = await chromium.launch();
const watch = (page, name) => {
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${name}: ${m.text()}`);
  });
};
// Lit pixels on the tornado's canvas: zero means it drew nothing.
const lit = (page) =>
  page.evaluate(() => {
    const c = document.querySelector("#cv");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++;
    return n;
  });
const viewName = (page) => page.locator("#view").evaluate((s) => s.options[s.selectedIndex]?.text ?? "");

const page = await browser.newPage({ viewport: { width: 1340, height: 900 } });
watch(page, "desktop");
await page.goto(url);
await page.waitForTimeout(800);
check((await page.title()).startsWith("GitHub Contribution Tornado"), "the page loads");
check(/^Data refreshed .+ next refresh around/.test(await page.locator("#fresh").innerText()), "the top says when the data was refreshed and when it next will be");
await page.locator("#cv").scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
check((await lit(page)) > 1000, "the tornado draws");
check((await page.locator("#you .tile").count()) === 0, "a first visit shows no one as you");

// Someone to be: the busiest person in the data, and a state that is not theirs.
const [login, home, away] = await page.evaluate(() => {
  const me = [...D.P].sort((a, b) => b[3] - a[3])[0];
  const other = D.states.find((s) => s.counted && s.ab !== me[2] && s.people > 0);
  return [me[0], me[2], other.ab];
});

await page.fill("#me", login);
await page.click("#findme .go");
await page.waitForTimeout(600);
check((await page.locator("#you .tile").count()) >= 3, `finding ${login} shows their ranks`);
check((await page.evaluate(() => new URLSearchParams(location.search).get("me"))) === login, "the address gets ?me=");
check((await page.locator("#view").inputValue()) === `state:${home}`, "the tornado turns to their state");
check((await page.locator("#board tr.me").count()) === 1, "their row is highlighted in the leaderboard");
check(/^Found \S+: .+, #[\d,]+ of [\d,]+ in /.test(await page.locator("#findmsg").textContent()), "a screen reader is told who was found and their rank");

await page.selectOption("#view", `state:${away}`);
await page.waitForTimeout(700);
const side = await page.locator("#side").innerText();
check(/If you lived here/i.test(side) && /\(home\)/.test(side), `in another state (${away}) the side panel says where they would rank`);
check((await lit(page)) > 1000, "and the tornado still draws");
const ranksThere = await page.locator("#stateTable thead th", { hasText: "Your rank there" }).count();
check(ranksThere === 1, "the states table has a Your rank there column");

for (const view of ["us", "all", `division:${await page.evaluate(() => D.divisions[0].name)}`, "parish:LA"]) {
  if (!(await page.locator(`#view option[value="${view}"]`).count())) continue;
  await page.selectOption("#view", view);
  await page.waitForTimeout(500);
  check((await lit(page)) > 1000, `the ${await viewName(page)} view draws`);
}

// Links to a view: the hash follows the view, and opens it.
await page.selectOption("#view", `state:${away}`);
await page.waitForTimeout(200);
check((await page.evaluate(() => location.hash)) === `#state:${away}`, "changing the view puts it in the address");
check((await page.evaluate(() => new URLSearchParams(location.search).get("me"))) === login, "and keeps ?me=");
await page.evaluate((v) => (location.hash = v), `#state:${home}`);
await page.waitForTimeout(300);
check((await page.locator("#view").inputValue()) === `state:${home}`, "a view link opened on the page turns the tornado");
const division = await page.evaluate(() => D.divisions.at(-1).name);
const linked = await browser.newPage({ viewport: { width: 1340, height: 900 } });
watch(linked, "linked");
await linked.goto(`${url}#division:${encodeURIComponent(division)}`);
await linked.waitForTimeout(500);
check((await linked.locator("#view").inputValue()) === `division:${division}`, `a link to #division:${division} opens it`);
await linked.goto("about:blank");
await linked.goto(`${url}#nonsense`);
await linked.waitForTimeout(500);
check(["us", "all"].includes(await linked.locator("#view").inputValue()), "a link to an unknown view opens the default");
await linked.close();

await page.fill("#me", "nobody-here-zz9");
await page.click("#findme .go");
await page.waitForTimeout(300);
check((await page.locator("#findmsg").innerText()).includes("is not on the leaderboard"), "an unknown login is explained");
check(((await page.locator("#findmsg a.addme").getAttribute("href")) ?? "").includes("template=add-me.yml"), "and offered Add me");
await page.click("#forget");
await page.waitForTimeout(300);
check((await page.locator("#you .tile").count()) === 0, "Forget me clears you");
await page.close();

const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
watch(phone, "phone");
await phone.goto(`${url}?me=${encodeURIComponent(login)}`);
await phone.waitForTimeout(800);
check((await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, "nothing scrolls sideways on a phone");
await phone.locator("#cv").scrollIntoViewIfNeeded();
await phone.waitForTimeout(800);
check((await lit(phone)) > 1000, "the tornado draws on a phone");

// Download CSV: the leaderboard as filtered, every row and not only the 100 shown, ready for a spreadsheet.
{
  const { readFile } = await import("node:fs/promises");
  const sheet = await browser.newPage({ viewport: { width: 1340, height: 900 } });
  watch(sheet, "csv");
  await sheet.goto(url);
  await sheet.waitForTimeout(500);
  const download = () =>
    Promise.all([sheet.waitForEvent("download", { timeout: 5000 }), sheet.click("#csv", { timeout: 5000 })])
      .then(async ([d]) => ({ name: d.suggestedFilename(), text: await readFile(await d.path(), "utf8") }))
      .catch(() => ({ name: "", text: "" }));
  // RFC 4180: a quoted cell can hold commas, line breaks, and "" for a quote; rows end in CRLF.
  const parse = (text) => {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\r" && text[i + 1] === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        i++;
      } else cell += c;
    }
    if (cell || row.length) rows.push([...row, cell]);
    return rows;
  };

  // Someone whose profile has a comma, quotes, and a formula in it.
  const odd = await sheet.evaluate(() => {
    const p = D.P.find((p) => p[F.fair] === 1);
    p[F.name] = 'Lee, "Jo" Smith';
    p[F.location] = '=HYPERLINK("https://example.com","click")';
    return { login: p[F.login], total: String(p[F.total]) };
  });
  const all = await download();
  const rows = parse(all.text.replace(/^\ufeff/, ""));
  const people = Number((await sheet.locator("#count").innerText()).replace(/\D/g, ""));
  check(all.text.startsWith("\ufeff"), "Download CSV starts with a byte-order mark, so Excel reads UTF-8");
  check(rows[0]?.join(",") === "Rank,Login,Name,Location,State,Parish,Total contributions,Public commits,Private contributions,Pull requests,Code reviews,Issues,New repositories,Followers", "the CSV has rank, login, name, location, state, parish, and every category");
  check(/^[^\n]*\r\n/.test(all.text), "its rows end in CRLF");
  check(people > 100 && rows.length - 1 === people, `it has every row, not only the 100 shown (${rows.length - 1} of ${people})`);
  check(/^github-leaderboard-[a-z0-9-]+-total-\d{4}-\d{2}-\d{2}\.csv$/.test(all.name), `its file name says what is in it (${all.name})`);
  const row = rows.find((r) => r[1] === odd.login);
  check(row?.[2] === 'Lee, "Jo" Smith', "a name with a comma and quotes comes back whole");
  check(row?.[3] === `'=HYPERLINK("https://example.com","click")`, "a location that starts with = gets a leading ' so it is not run as a formula");
  check(row?.[6] === odd.total, "numbers stay plain numbers");

  // Filtered: a category and a search download only the people who match, with the ranks the page shows.
  await sheet.locator("#cats button", { hasText: "Public commits" }).click();
  await sheet.fill("#find", "san");
  await sheet.waitForTimeout(200);
  const some = await download();
  const found = parse(some.text.replace(/^\ufeff/, "")).slice(1);
  const matching = await sheet.evaluate(() => D.P.filter((p) => p[F.fair] === 1 && [p[F.login], p[F.name] || "", p[F.location] || ""].some((s) => s.toLowerCase().includes("san"))).length);
  check(matching > 0 && found.length === matching, `searching "san" downloads the ${matching} people who match (${found.length})`);
  const shown = await sheet.locator("#board tbody tr").evaluateAll((trs) => trs.map((tr) => `${tr.cells[0].textContent.replace(/,/g, "")} ${tr.cells[1].textContent}`));
  check(shown.length > 0 && shown.join("|") === found.slice(0, shown.length).map((r) => `${r[0]} ${r[1]}`).join("|"), "with the same ranks and logins as the list on the page");
  check(some.name.includes("-commits-matching-san-"), `and a file name that says so (${some.name})`);
  await sheet.close();
}

// A light theme: a light system gets a light page, and the switch at the top overrides it and is
// remembered. Brightness is the page background's average of red, green, and blue (0 to 255).
{
  const lightSystem = await browser.newContext({ colorScheme: "light", viewport: { width: 1340, height: 900 } });
  const day = await lightSystem.newPage();
  watch(day, "light");
  const brightness = () => day.evaluate(() => getComputedStyle(document.body).backgroundColor.match(/\d+/g).slice(0, 3).reduce((a, n) => a + Number(n), 0) / 3);
  const themeSwitch = (name) => day.locator("#theme button", { hasText: name });
  await day.goto(url);
  await day.waitForTimeout(500);
  check((await brightness()) > 200, "a light system gets a light page");
  await day.locator("#cv").scrollIntoViewIfNeeded();
  await day.waitForTimeout(800);
  check((await lit(day)) > 1000 && (await day.evaluate(() => document.documentElement.dataset.theme)) === "light", "the tornado draws in the light theme");
  check((await themeSwitch("Light").getAttribute("aria-pressed").catch(() => null)) === "true", "the theme switch shows Light as on");
  await themeSwitch("Dark").click({ timeout: 2000 }).catch(() => {});
  await day.waitForTimeout(300);
  check((await brightness()) < 60 && (await themeSwitch("Dark").getAttribute("aria-pressed").catch(() => null)) === "true", "the theme switch turns the page dark");
  await day.reload();
  await day.waitForTimeout(500);
  check((await brightness()) < 60 && (await themeSwitch("Dark").getAttribute("aria-pressed").catch(() => null)) === "true", "and the choice survives a reload");
  check(!errors.some((e) => e.startsWith("light:")), "no script errors in the light theme");
  await lightSystem.close();
}

// The tornado from the keyboard and a screen reader: Tab into its rings, move with the arrow keys,
// Enter to go down a level and Escape to come back up, with the focused ring drawn on the canvas
// and each change said aloud. Reduced motion holds the canvas still.
{
  const kb = await browser.newPage({ viewport: { width: 1340, height: 900 }, reducedMotion: "reduce" });
  watch(kb, "keyboard");
  await kb.goto(url);
  await kb.waitForTimeout(500);
  // What a screen reader hears for the focused ring; empty when no ring has focus.
  const heard = async () => {
    const f = kb.locator("#rings :focus");
    return (await f.count()) ? await f.ariaSnapshot() : "";
  };
  const viewNow = () => kb.locator("#view").inputValue();
  const hashView = () => kb.evaluate(() => decodeURIComponent(location.hash.slice(1)));
  const said = () => kb.evaluate(() => document.querySelector("#said")?.textContent ?? "");
  // Lit pixels just left of ring i's name, where the focus box's left side is drawn.
  const boxLit = (i) =>
    kb.evaluate((i) => {
      const G = geom();
      const s = cv.width / storm.W;
      const d = cx2.getImageData(Math.round((G.labelX - 8) * s), Math.round((G.rings[i].y - 10) * s), Math.round(4 * s), Math.round(7 * s)).data;
      let n = 0;
      for (let j = 3; j < d.length; j += 4) if (d[j] > 150) n++;
      return n;
    }, i);
  const start = await viewNow();
  const [first, second, down] = await kb.evaluate((top) => {
    const by = [...(top === "us" ? D.divisions : D.states.filter((s) => s.counted))].sort((a, b) => b.total - a.total);
    return [by[0].name, by[1].name, top === "us" ? `division:${by[1].name}` : `state:${by[1].ab}`];
  }, start);

  await kb.focus("#view");
  for (let i = 0; i < 12 && !(await heard()); i++) await kb.keyboard.press("Tab");
  check((await heard()).includes(`"#1 ${first}:`), `Tab reaches the tornado's rings, and a screen reader hears the busiest first: ${first}`);
  check((await kb.locator("#stip").isVisible()) && /Enter to open it/.test(await kb.locator("#stip").innerText()), "the focused ring shows its numbers and the keys to press");
  await kb.waitForTimeout(150);
  check((await boxLit(0)) > 0, "and a focus ring is drawn on the canvas");
  await kb.keyboard.press("ArrowDown");
  check((await heard()).includes(`"#2 ${second}:`), "ArrowDown moves to the next ring");
  const before = await said();
  await kb.keyboard.press("Enter");
  await kb.waitForTimeout(500);
  check((await viewNow()) === down && (await hashView()) === down, `Enter goes down a level: the view and the address are ${down}`);
  check((await heard()).includes('"#1 '), "and focus lands on the new view's first ring");
  const after = await said();
  check(after !== before && after.includes(second), `the new view is said aloud: "${after}"`);
  await kb.keyboard.press("Escape");
  await kb.waitForTimeout(500);
  check((await viewNow()) === start && (await hashView()) === start, "Escape goes back up a level");
  check((await heard()).includes(`"#2 ${second}:`), "with focus on the ring it came from");
  check((await said()) !== after, "and that is said aloud too");
  await kb.keyboard.press("End");
  check(await kb.evaluate(() => document.activeElement === document.querySelector("#rings li:last-child button")), "End moves to the last ring");
  await kb.keyboard.press("Home");
  check((await heard()).includes(`"#1 ${first}:`), "Home moves back to the first");
  await kb.keyboard.press("Shift+Tab");
  await kb.waitForTimeout(150);
  check(!(await kb.locator("#stip").isVisible()) && (await boxLit(0)) === 0, "leaving the tornado clears its focus ring");
  await kb.fill("#find", "ab");
  await kb.keyboard.press("Backspace");
  await kb.keyboard.press("Escape");
  check((await viewNow()) === start && (await kb.evaluate(() => document.activeElement?.id)) === "find", "Backspace and Escape typed in the search box leave the tornado alone");

  await kb.goto(`${url}?me=${encodeURIComponent(login)}#state:${away}`);
  await kb.waitForTimeout(500);
  const ringsThere = (await kb.locator("#rings").count()) ? await kb.locator("#rings").ariaSnapshot() : "";
  check(/\(if here\)[^"]*, you:/.test(ringsThere), `in ${away}, a screen reader hears where you would rank`);
  await kb.close();
}

// History: a sparkline for each state and a chart beside a state's tornado. The page is built again,
// into a temporary folder, from a small history made here, so the test does not depend on how many
// days the data branch has; then from one day and from none, when a note says when history starts.
{
  const { execFileSync } = await import("node:child_process");
  const { mkdtempSync, rmSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { fileURLToPath, pathToFileURL } = await import("node:url");
  const { NAMES } = await import("../src/states.mjs");
  const dir = mkdtempSync(join(tmpdir(), "history-"));
  const build = (days, name) => {
    let history = join(dir, "none.json");
    if (days.length) {
      history = join(dir, `${name}.json`);
      const each = (f) => Object.fromEntries(NAMES.map(([ab]) => [ab, days.map(f)]));
      writeFileSync(history, JSON.stringify({ dates: days.map((d) => d[0]), people: each(() => 80), total: each((d) => d[1]) }));
    }
    const out = join(dir, `${name}.html`);
    execFileSync(process.execPath, [fileURLToPath(new URL("../scripts/build.mjs", import.meta.url))], { env: { ...process.env, HISTORY: history, OUT: out }, stdio: ["ignore", "ignore", "inherit"] });
    return pathToFileURL(out).href;
  };
  // Without waiting for what is not there: a missing element is a failed check, not a timeout.
  const attr = async (loc, name) => ((await loc.count()) ? loc.first().getAttribute(name) : null);
  const text = async (loc) => ((await loc.count()) ? loc.first().innerText() : "");
  // Every state: 100,000 on Jan 5, then up 4% by Jan 8, with Jan 7 missing.
  const three = build([["2026-01-05", 100000], ["2026-01-06", 101000], ["2026-01-08", 104000]], "three");
  const hist = await browser.newPage({ viewport: { width: 1340, height: 900 } });
  watch(hist, "history");
  await hist.goto(three);
  await hist.waitForTimeout(500);
  const ab = await hist.evaluate(() => D.states.find((s) => s.counted && s.people > 0).ab);
  check((await hist.locator("#stateTable thead th", { hasText: "Since Jan 5" }).count()) === 1, "with a history, the states table has a Since column");
  const rows = await hist.locator("#stateTable tbody tr").count();
  check(rows > 0 && (await hist.locator("#stateTable td.spark svg[role=img] polyline").count()) === rows, `every state in it has a sparkline (${rows})`);
  check((await attr(hist.locator("#stateTable td.spark svg"), "aria-label")) === "Contributions up 4.0% since Jan 5", "a sparkline says how the state moved, in words");
  check((await hist.locator("#histNote").count()) === 1 && (await hist.locator("#histNote").isHidden()), "and there is no note about when history starts");
  await hist.evaluate((v) => (location.hash = v), `#state:${ab}`);
  await hist.waitForTimeout(400);
  const points = await attr(hist.locator("#side svg.chart polyline.line"), "points");
  check(points?.trim().split(/\s+/).length === 3, `a state's tornado (${ab}) has a chart of its total, a point a day`);
  const readout = () => text(hist.locator("#side p.readout"));
  check((await readout()) === "104,000 on Jan 8 · up 4.0% since Jan 5", "under it, the latest day and the change since the first");
  const chart = hist.locator("#side svg.chart");
  if (await chart.count()) {
    await chart.focus();
    await hist.keyboard.press("Home");
  }
  check((await readout()) === "100,000 on Jan 5 · 80 people, 1,250 average", "the arrow keys read each day");
  await hist.keyboard.press("ArrowRight");
  check((await readout()).startsWith("101,000 on Jan 6"), "one day at a time");
  await hist.close();

  const histPhone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  watch(histPhone, "history phone");
  await histPhone.goto(`${three}#state:${ab}`);
  await histPhone.waitForTimeout(500);
  check((await histPhone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, "with the history, nothing scrolls sideways on a phone");
  const box = (await histPhone.locator("#side svg.chart").count()) ? await histPhone.locator("#side svg.chart").boundingBox() : null;
  check(box !== null && box.width > 200 && box.x + box.width <= 390, "and the chart fits the phone");
  await histPhone.close();

  for (const [days, start] of [[[["2026-01-05", 100000]], "History starts Jan 5."], [[], "History starts with the next daily refresh."]]) {
    const one = await browser.newPage({ viewport: { width: 1340, height: 900 } });
    watch(one, `history, ${days.length} days`);
    await one.goto(`${build(days, `days${days.length}`)}#state:${ab}`);
    await one.waitForTimeout(400);
    const note = await text(one.locator("#histNote"));
    check(note.startsWith(start) && (await one.locator("#stateTable td.spark").count()) === 0, `with ${days.length ? "one day" : "no history"}, the table says "${start}" instead of drawing lines`);
    check((await one.locator("#side").innerText()).includes(`${start} The chart appears after a second day.`) && (await one.locator("#side svg.chart").count()) === 0, "and so does the side panel, with no chart");
    check((await lit(one)) > 1000, "and the tornado still draws");
    await one.close();
  }
  rmSync(dir, { recursive: true, force: true });
}
await browser.close();

check(errors.length === 0, `no script errors${errors.length ? `:\n  ${errors.join("\n  ")}` : ""}`);
if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log("all checks passed");
