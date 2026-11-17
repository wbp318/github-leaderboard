// Opens the built page in a real browser and checks that it works: no script errors, the tornado
// draws, the views change and links to them work, Find yourself and "where you'd rank" work, the
// game at the top plays, and nothing scrolls sideways on a phone. CI runs it on every pull request and before every deploy.
//   npm i --no-save --no-package-lock playwright && npx playwright install chromium   (once)
//   npm run build && npm run e2e
import { readFileSync } from "node:fs";
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
// Storm Cellar's picture, read from its canvas. A screenshot of the element waits for it to stand
// still, and while the game plays it sometimes never does, which timed the test out in CI.
const gameFrame = async (page) => Buffer.from(await page.evaluate(() => document.querySelector("#game").toDataURL()));
const viewName = (page) => page.locator("#view").evaluate((s) => s.options[s.selectedIndex]?.text ?? "");

const page = await browser.newPage({ viewport: { width: 1340, height: 900 } });
watch(page, "desktop");
await page.goto(url);
await page.waitForTimeout(800);
check((await page.title()).startsWith("GitHub Contribution Tornado"), "the page loads");
check(/^Data refreshed .+ · (next refresh around|the refresh due at)/.test(await page.locator("#fresh").innerText()), "the top says when the data was refreshed and when it next will be");
// Data saved just now promises the next refresh; data from over a day ago says that refresh hasn't landed.
const freshAt = (ago) =>
  page.evaluate((ago) => {
    const was = D.refreshed;
    D.refreshed = Date.now() - ago;
    renderFresh();
    const t = document.querySelector("#fresh").textContent;
    D.refreshed = was;
    renderFresh();
    return t;
  }, ago);
check(/^Data refreshed just now .+ · next refresh around .+, daily$/.test(await freshAt(0)), "fresh data: the top says when the next refresh is");
check(/^Data refreshed 25 hours ago .+ · the refresh due at .+ hasn't landed yet; this page updates itself when it does$/.test(await freshAt(25 * 3600000)), "late data: the top says the refresh hasn't landed, not that it will come tomorrow");
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
// Each rank says top x% and its percentile, which add up to 100; the only one counted says neither.
const standings = (await page.locator("#you .tile .n").allTextContents()).slice(1);
check(
  standings.some((t) => t.endsWith("percentile")) &&
    standings.every((t) => {
      const m = t.match(/ · top (\d+)% · (\d+)(?:st|nd|rd|th) percentile$/);
      return t === "of 1 counted" || (m && Number(m[1]) + Number(m[2]) === 100);
    }),
  `each rank says top x% and its percentile, adding up to 100 (${standings.join(" | ")})`,
);
check(
  (await page.evaluate(() => [0, 1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 73, 87, 99].map(ordinal).join(" "))) === "0th 1st 2nd 3rd 4th 11th 12th 13th 21st 22nd 23rd 73rd 87th 99th",
  "percentiles are written 1st, 2nd, 3rd, 11th, 21st…",
);
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
// A login is shown as text, never run as HTML, whether typed or in ?me=.
{
  const bait = '<img src=x onerror="window.__xss=1">';
  await page.fill("#me", bait);
  await page.click("#findme .go");
  await page.waitForTimeout(300);
  const typed = await page.evaluate(() => [window.__xss ?? null, document.querySelectorAll("#findmsg img").length]);
  const linked = await browser.newPage();
  await linked.goto(`${url}?me=${encodeURIComponent(bait)}`);
  await linked.waitForTimeout(500);
  const viaUrl = await linked.evaluate(() => [window.__xss ?? null, document.querySelectorAll("#findmsg img").length, document.querySelector("#findmsg").textContent]);
  await linked.close();
  check(typed[0] === null && typed[1] === 0 && viaUrl[0] === null && viaUrl[1] === 0 && viaUrl[2].startsWith(bait), "a login with HTML in it is shown as text, typed or in ?me=");
}
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
  check(rows[0]?.join(",") === `Rank,Login,Name,Location,State,County,Total contributions,Public commits,Private contributions,Pull requests,Code reviews,Issues,New repositories,Followers`, "the CSV has rank, login, name, location, state, county, and every category");
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
  const brightness = () => day.evaluate(() => getComputedStyle(document.documentElement).backgroundColor.match(/\d+/g).slice(0, 3).reduce((a, n) => a + Number(n), 0) / 3);
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
    execFileSync(process.execPath, [fileURLToPath(new URL("../scripts/build.mjs", import.meta.url))], { env: { ...process.env, HISTORY: history, OUT: out, BADGES: "0" }, stdio: ["ignore", "ignore", "inherit"] });
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

// Counties: Mississippi's next to Louisiana's parishes, by link, in the table, and in your ranks.
{
  const counties = await browser.newPage({ viewport: { width: 1340, height: 900 } });
  watch(counties, "counties");
  const text = (sel) => counties.locator(sel).first().innerText({ timeout: 2000 }).catch(() => "");
  await counties.goto(`${url}#county:MS`);
  await counties.waitForTimeout(600);
  const isMS = (await counties.locator("#view").inputValue()) === "county:MS";
  check(isMS && (await viewName(counties)) === "Mississippi, by county", "a link to #county:MS opens Mississippi, by county");
  await counties.locator("#cv").scrollIntoViewIfNeeded();
  await counties.waitForTimeout(600);
  check(isMS && (await lit(counties)) > 1000, "and it draws");
  await counties.goto("about:blank");
  await counties.goto(`${url}#parish:LA`);
  await counties.waitForTimeout(500);
  check((await counties.locator("#view").inputValue()) === "parish:LA" && (await viewName(counties)) === "Louisiana, by parish", "a link to #parish:LA still opens Louisiana, by parish");
  await counties.selectOption("#countyState", "MS");
  check((await text("#countyTitle")) === "Mississippi, county by county", "the county table switches to Mississippi");
  const msRows = await counties.evaluate(() => D.counties.MS.rows.filter((r) => r.fips || r.people).length);
  check(msRows > 1 && (await counties.locator("#parishTable tbody tr").count()) === msRows && (await text("#parishTable th")).startsWith("County"), `and lists its ${msRows - 1} counties with someone counted, and County not given`);
  check(/^\d+ of Mississippi's 82 counties have someone counted/.test(await text("#countyLede")), "and says how many of its 82 counties have someone counted");
  await counties.selectOption("#scope", "state:MS");
  const county = await counties.locator("#scopeCounty option").nth(1).getAttribute("value").catch(() => null);
  if (county) await counties.selectOption("#scopeCounty", county);
  check(Boolean(county) && /^[1-9]/.test(await counties.locator("#count").innerText()), `choosing Mississippi offers its counties, and a leaderboard for one (${county})`);
  const mississippian = await counties.evaluate(() => D.P.find((p) => p[2] === "MS" && p[11])?.[0]);
  await counties.goto("about:blank");
  await counties.goto(`${url}?me=${encodeURIComponent(mississippian)}`);
  await counties.waitForTimeout(600);
  check((await counties.locator("#you .tile .k").allInnerTexts()).some((k) => / County$/.test(k)), `finding a Mississippian (${mississippian}) shows their county rank`);
  check(!errors.some((e) => e.startsWith("counties:")), "no script errors in the county views");
  await counties.close();
}
// Counties with the other features: the keyboard's spoken summary counts counties, and a county's
// CSV is named for it.
{
  const mix = await browser.newPage({ viewport: { width: 1340, height: 900 } });
  watch(mix, "mix");
  await mix.goto(url);
  await mix.waitForTimeout(500);
  const view = await mix.evaluate(() => Object.entries(COUNTIES).map(([ab, c]) => `${c.kind}:${ab}`).find((v) => v !== "parish:LA"));
  await mix.selectOption("#view", "us");
  await mix.waitForTimeout(400);
  await mix.selectOption("#view", view);
  await mix.waitForTimeout(700);
  check(/, by (county|parish|borough)\. \d+ (count(y|ies)|parish(es)?|borough(s)?) with someone counted(: the 24 busiest, and the other \d+ together)?\.$/.test(await mix.locator("#said").textContent()), `opening ${view}, a screen reader hears how many counties (${await mix.locator("#said").textContent()})`);
  await mix.selectOption("#scope", `state:${view.split(":")[1]}`);
  const scope = await mix.evaluate(() => [...document.querySelectorAll("#scopeCounty option")].map((o) => o.value).find((s) => s && !s.endsWith(":-")));
  await mix.selectOption("#scopeCounty", scope);
  await mix.waitForTimeout(300);
  const [file] = await Promise.all([mix.waitForEvent("download", { timeout: 5000 }), mix.click("#csv")]).catch(() => [null]);
  const name = file?.suggestedFilename() ?? "";
  const [, ab, county] = scope.split(":");
  const want = await mix.evaluate(([c, s]) => `${countyLabel(c)} ${STATE[s].name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"), [county, ab]);
  check(name.includes(`-${want}-`), `a county's CSV is named for it (${name})`);
  check(!errors.some((e) => e.startsWith("mix:")), "no script errors with counties and the other features together");
  await mix.close();
}
// Share your ranks: the picture draws (with a stand-in for GitHub's avatar, so the test needs no
// network, and the canvas can still be saved with a picture from another site on it), downloads
// under the login's name, and the README badge is the one the build wrote for them, saying
// what Find yourself says, with and without a county. Escape closes it and gives focus back.
{
  const sh = await browser.newPage({ viewport: { width: 1340, height: 900 } });
  watch(sh, "share");
  const dot = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  await sh.route("https://avatars.githubusercontent.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "image/png", headers: { "Access-Control-Allow-Origin": "*" }, body: Buffer.from(dot, "base64") }),
  );
  await sh.goto(url);
  await sh.waitForTimeout(400);
  check(await sh.locator("#shareOpen").isHidden(), "Share my ranks is hidden until you find yourself");
  const people = await sh.evaluate(() => {
    const county = D.P.find((p) => COUNTIES[p[2]] && p[11]);
    const plain = D.P.find((p) => !p[11]);
    return [county?.[0], plain?.[0]].filter(Boolean);
  });
  for (const who of people) {
    await sh.goto(`${url}?me=${encodeURIComponent(who)}`);
    await sh.waitForTimeout(400);
    await sh.click("#shareOpen");
    const drew = await sh.waitForFunction(() => document.querySelector("#shareCard").naturalWidth === 1200, null, { timeout: 8000 }).then(() => true, () => false);
    check(drew && (await sh.locator("#share").evaluate((d) => d.open)), `Share my ranks opens and draws ${who}'s picture`);
    const [file] = await Promise.all([sh.waitForEvent("download", { timeout: 5000 }), sh.click("#shareSave")]).catch(() => [null]);
    check(file?.suggestedFilename() === `tornado-${who}.png`, `and downloads it (${file?.suggestedFilename()})`);
    const [said, loaded, md] = await sh.evaluate(() => [badgeText(), document.querySelector("#shareBadge").naturalWidth, document.querySelector("#shareMd").value]);
    const svg = readFileSync(new URL(`../site/badge/${who.toLowerCase()}.svg`, import.meta.url), "utf8");
    check(loaded > 0 && svg.includes(`aria-label="contribution tornado: ${said}"`), `the badge the build wrote says what the page says (${said})`);
    check(md.includes(`badge/${who.toLowerCase()}.svg)](`) && md.includes(`leaderboard.html?me=${who}`), "and its Markdown links the badge to their ranks");
    await sh.keyboard.press("Escape");
    await sh.waitForTimeout(200);
    check(!(await sh.locator("#share").evaluate((d) => d.open)) && (await sh.evaluate(() => document.activeElement?.id)) === "shareOpen", "Escape closes it and focus goes back to the button");
  }
  check(!errors.some((e) => e.startsWith("share:")), "no script errors sharing your ranks");
  await sh.close();
}
// The storm round the tornado: on at first, lightning strikes the busiest ring and fades, the
// Storm switch clears the sky but not the tornado and is remembered, and it starts off for anyone
// whose system asks for reduced motion.
{
  const wx = await browser.newPage({ viewport: { width: 1340, height: 900 } });
  watch(wx, "weather");
  await wx.goto(`${url}#us`);
  await wx.waitForTimeout(3000);
  check((await wx.locator("#weather").getAttribute("aria-pressed")) === "true" && (await wx.locator("#thunder").isVisible()), "the storm round the tornado is on at first, with a Thunder switch");
  await wx.evaluate(() => strike(geom()));
  await wx.waitForTimeout(400);
  check(await wx.evaluate(() => weather.hit > 0 && weather.hit < 1), "lightning strikes the busiest ring, and its glow fades");
  const stormy = await lit(wx);
  await wx.click("#weather");
  await wx.waitForTimeout(300);
  const calm = await lit(wx);
  check(stormy > calm && calm > 1000, `the Storm switch clears the sky and leaves the tornado (${stormy} lit, then ${calm})`);
  check((await wx.locator("#weather").getAttribute("aria-pressed")) === "false" && (await wx.locator("#thunder").isHidden()), "and says it is off, and hides Thunder");
  await wx.reload();
  await wx.waitForTimeout(600);
  check((await wx.locator("#weather").getAttribute("aria-pressed")) === "false", "and is remembered");
  check(!errors.some((e) => e.startsWith("weather:")), "no script errors in the weather");
  await wx.close();
  const still = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1340, height: 900 } });
  const rm = await still.newPage();
  watch(rm, "weather, reduced motion");
  await rm.goto(`${url}#us`);
  await rm.waitForTimeout(500);
  check((await rm.locator("#weather").getAttribute("aria-pressed")) === "false", "with reduced motion, the storm starts off");
  await still.close();
}
// Storm Cellar, the game at the top: its title draws, Enter starts it from the keyboard, the arrow
// keys turn the view and the weapon keys and mouse wheel switch weapons without scrolling the page,
// Escape pauses it, and Tab moves on past it. On a touch phone it has a stick and a fire button,
// and a Swap button once there's a second weapon, and still nothing scrolls sideways.
{
  // Lit pixels on the game's canvas, and a sum over the upper view, below the messages: the
  // walls and ceiling, which change only when the view turns or moves.
  const pixels = (page) =>
    page.evaluate(() => {
      const c = document.querySelector("#game");
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let lit = 0, view = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] + d[i + 1] + d[i + 2] > 30) lit++;
        const y = (i / 4 / c.width) | 0;
        if (y >= 16 && y < 80) view = (view * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) % 1e9;
      }
      return { lit, view };
    });
  // The game sets itself up once the page is idle: wait for its title to appear.
  const drawn = (page) => page.waitForFunction(() => document.querySelector("#game").getContext("2d").getImageData(160, 30, 1, 1).data[0] > 0, null, { timeout: 5000 }).catch(() => {});
  const g = await browser.newPage({ viewport: { width: 1340, height: 900 } });
  watch(g, "game");
  await g.goto(url);
  await drawn(g);
  const game = g.locator("#game");
  check((await pixels(g)).lit > 20000, "the game at the top draws its title screen");
  check((await game.getAttribute("data-state")) === "title", "and waits to be played");
  await game.focus();
  await g.keyboard.press("Enter");
  await g.waitForTimeout(300);
  check((await game.getAttribute("data-state")) === "playing", "Enter starts the game");
  const before = (await pixels(g)).view;
  const scrolled = await g.evaluate(() => scrollY);
  await g.keyboard.down("ArrowLeft");
  await g.waitForTimeout(400);
  await g.keyboard.up("ArrowLeft");
  await g.waitForTimeout(100);
  check((await pixels(g)).view !== before, "the arrow keys turn the view");
  check((await g.evaluate(() => scrollY)) === scrolled, "and don't scroll the page while the game has them");
  check(/playing level 1\b/.test((await game.getAttribute("aria-label")) ?? ""), "its label says which level is being played");
  // The cellar has only the one weapon, so these leave it in hand; level 2 has a second to switch to.
  const box = await game.boundingBox();
  await g.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (const k of ["Digit2", "Digit1", "KeyQ"]) await g.keyboard.press(k);
  await g.mouse.wheel(0, 240);
  await g.waitForTimeout(200);
  check((await game.getAttribute("data-state")) === "playing" && (await g.evaluate(() => scrollY)) === scrolled, "1, 2, Q, and the mouse wheel switch weapons without scrolling the page");
  await g.keyboard.press("Escape");
  await g.waitForTimeout(100);
  check((await game.getAttribute("data-state")) === "paused", "Escape pauses it");
  await g.mouse.wheel(0, 240);
  await g.waitForTimeout(400);
  check((await g.evaluate(() => scrollY)) > scrolled, "and then the mouse wheel over it scrolls the page as usual");
  await g.keyboard.press("Tab");
  check((await g.evaluate(() => document.activeElement?.id)) !== "game", "and Tab moves on past it");
  check(!errors.some((e) => e.startsWith("game:")), "no script errors in the game");
  await g.close();

  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const t = await touch.newPage();
  watch(t, "game phone");
  await t.goto(url);
  await drawn(t);
  check(await t.locator("#pad").isVisible(), "on a touch phone the game shows a stick and a fire button");
  check(await t.locator("#swap").isHidden(), "and Swap waits until there's a second weapon");
  check((await t.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, "and nothing scrolls sideways");
  await t.locator("#fire").tap();
  await t.waitForTimeout(300);
  check((await t.locator("#game").getAttribute("data-state")) === "playing", "and Fire starts the game");
  // A tap on the weapon at the status bar's left switches weapons, and doesn't shoot or stop the game.
  const screen = await t.locator("#game").boundingBox();
  await t.locator("#game").tap({ position: { x: screen.width * 0.08, y: screen.height * 0.93 } });
  await t.waitForTimeout(200);
  check((await t.locator("#game").getAttribute("data-state")) === "playing", "and tapping the weapon on the status bar keeps it playing");
  check(!errors.some((e) => e.startsWith("game phone:")), "no script errors in the game on a phone");
  await touch.close();
}
// Storm Cellar saves your progress: paused, S saves where you are; after a reload the title offers
// to go on, C puts you back in the same spot, a save from the top of the drain starts level 2, a
// broken save is ignored, and Delete forgets it.
{
  const ctx = await browser.newContext({ viewport: { width: 1340, height: 900 } });
  const sv = await ctx.newPage();
  watch(sv, "game save");
  const KEY = "github-leaderboard.cellar";
  const state = () => sv.getAttribute("#game", "data-state");
  const stored = () => sv.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  const atTitle = async () => {
    await sv.reload();
    await sv.waitForFunction(() => document.querySelector("#game").dataset.ready === "1" && document.querySelector("#game").dataset.state === "title", null, { timeout: 8000 });
  };
  await sv.goto(url);
  await sv.waitForFunction(() => document.querySelector("#game").dataset.ready === "1" && document.querySelector("#game").dataset.state === "title", null, { timeout: 8000 });
  check((await sv.locator("#gameLoad").isHidden()) && (await sv.locator("#gameSave").isVisible()) && (await sv.locator("#gameSave").isDisabled()), "with no save, there's no Continue, and Save progress shows but waits for a game");
  await sv.focus("#game");
  await sv.keyboard.press("Enter");
  await sv.waitForTimeout(250);
  check(await sv.locator("#gameSave").isEnabled(), "playing, Save progress can be pressed");
  await sv.keyboard.down("ArrowUp");
  await sv.waitForTimeout(600);
  await sv.keyboard.up("ArrowUp");
  await sv.keyboard.press("Escape");
  await sv.keyboard.press("KeyS");
  await sv.waitForTimeout(150);
  const first = await stored();
  check(first?.level === 0 && first.p?.hp === 100 && first.p.y < 21 && first.items.length > 0 && first.foes.length > 0, "paused, S saves where you are, what you carry, and the bugs and pickups");
  check((await sv.locator("#gameSaid").textContent()).startsWith("Progress saved: level 1"), "and says so");
  await atTitle();
  check((await sv.locator("#gameLoad").innerText()).startsWith("Continue: level 1, the cellar") && /C to go on from your save/.test(await sv.getAttribute("#game", "aria-label")), "after a reload, the title offers to go on from the save");
  await sv.focus("#game");
  await sv.keyboard.press("KeyC");
  await sv.waitForTimeout(200);
  await sv.keyboard.press("Escape");
  await sv.keyboard.press("KeyS");
  await sv.waitForTimeout(150);
  const again = await stored();
  check(
    (await state()) === "paused" && again.p.x === first.p.x && again.p.y === first.p.y && again.p.hp === first.p.hp && again.items.length === first.items.length && again.p.time >= first.p.time,
    "C puts you back in the same spot, with the clock going on",
  );
  await sv.evaluate((k) => localStorage.setItem(k, JSON.stringify({ v: 1, at: Date.now(), level: 1, fresh: true, carry: 55, run: { kills: 9, total: 12, commits: 5, totalC: 5, time: 200 } })), KEY);
  await atTitle();
  await sv.click("#gameLoad");
  await sv.waitForTimeout(200);
  check(/playing level 2, the storm drain/.test(await sv.getAttribute("#game", "aria-label")), "a save from the top of the drain starts level 2");
  await sv.evaluate((k) => localStorage.setItem(k, "{not a save"), KEY);
  await atTitle();
  check(await sv.locator("#gameLoad").isHidden(), "a broken save is ignored");
  await sv.evaluate((k) => localStorage.setItem(k, JSON.stringify({ v: 1, at: Date.now(), level: 1, fresh: true, carry: 40, run: null })), KEY);
  await atTitle();
  await sv.click("#gameForget");
  check((await sv.evaluate((k) => localStorage.getItem(k), KEY)) === null && (await sv.locator("#gameLoad").isHidden()), "Delete save forgets it");
  check(!errors.some((e) => e.startsWith("game save:")), "no script errors saving and loading the game");
  await ctx.close();
}
// Storm Cellar's neighbours and Biscuit the dog: a new game saves Biscuit beside you; walking up to
// Hank finds him, and what he says is spoken; a save keeps him found, and loaded again he says
// something else and counts once; an older save, with no neighbours or dog, loads with Biscuit
// beside you; Biscuit knocked out stays down after a load; and the cellar's tally and the last one
// count the survivors, in the game's label and out loud.
{
  const ctx = await browser.newContext({ viewport: { width: 1340, height: 900 } });
  const np = await ctx.newPage();
  watch(np, "game folk");
  const KEY = "github-leaderboard.cellar";
  const said = () => np.locator("#gameSaid").textContent();
  const label = () => np.getAttribute("#game", "aria-label");
  const stored = () => np.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  const isState = (s, timeout = 8000) => np.waitForFunction((s) => document.querySelector("#game").dataset.state === s, s, { timeout }).then(() => true, () => false);
  // The page starts out saying "title": wait until the game has set itself up and drawn it.
  const titled = () => np.waitForFunction(() => document.querySelector("#game").dataset.ready === "1" && document.querySelector("#game").dataset.state === "title" && document.querySelector("#game").getContext("2d").getImageData(160, 30, 1, 1).data[0] > 0, null, { timeout: 8000 }).catch(() => {});
  const atTitle = async () => {
    await np.reload();
    await titled();
  };
  const load = async (s) => {
    await np.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, s]);
    await atTitle();
    await np.focus("#game");
    await np.keyboard.press("KeyC");
    await np.waitForTimeout(250);
  };
  const saveNow = async () => {
    await np.keyboard.press("Escape");
    await np.keyboard.press("KeyS");
    await np.waitForTimeout(150);
    return stored();
  };
  const you = (x, y, a) => ({ x, y, a, hp: 100, ammo: 40, cells: 0, want: 0, has: [true, false], kills: 0, commits: 0, time: 5 });
  const walkUntil = async (state) => {
    await np.keyboard.down("ArrowUp");
    const ok = await isState(state, 4000);
    await np.keyboard.up("ArrowUp");
    return ok;
  };
  await np.goto(url);
  await titled();
  check(/Walk up to a neighbour sheltering from the storm.+Biscuit, Hank's dog, follows you/.test(await np.locator("#gameKeys").textContent()), "the keys under the game tell of the neighbours and Biscuit");
  await np.focus("#game");
  await np.keyboard.press("Enter");
  await np.waitForTimeout(250);
  const fresh = await saveNow();
  const [dx, dy, dhp, dko] = fresh?.dog ?? [];
  check(fresh?.met?.length === 0 && dhp === 60 && dko === 0 && Math.hypot(dx - fresh.p.x, dy - fresh.p.y) < 2.5, "a new game has no one found yet, and Biscuit at your side, and saves him with you");
  // An older save, with no neighbours found and no dog, right by Hank in the back room.
  await load({ v: 1, at: Date.now(), level: 0, run: null, carry: 40, p: you(2.75, 19.5, Math.PI), items: fresh?.items ?? [], foes: fresh?.foes ?? [] });
  check(/^You found Hank, sheltering from the storm: 1 of 3 survivors here\. Hank says, "Biscuit's going with you/.test(await said()), "walking up to a neighbour finds them, and what they say is spoken");
  const met = await saveNow();
  check(met?.met?.join() === "hank", "a save keeps them found");
  check(met?.dog?.[2] === 60 && Math.hypot(met.dog[0] - met.p.x, met.dog[1] - met.p.y) < 2.5, "and an older save, with no dog in it, loads with Biscuit beside you");
  await atTitle();
  await np.focus("#game");
  await np.keyboard.press("KeyC");
  await np.waitForTimeout(250);
  check(/^Hank says, "A hot coffee/.test(await said()), "loaded by Hank again, he says something else");
  const again = await saveNow();
  check(again?.met?.join() === "hank", "and still counts once");
  await load({ ...again, dog: [3.5, 21.5, 0, 12] });
  const ko = await saveNow();
  check(ko?.dog?.[0] === 3.5 && ko.dog[1] === 21.5 && ko.dog[2] === 0 && ko.dog[3] > 0 && ko.dog[3] <= 12, "Biscuit, knocked out, stays down where he was after a load");
  // At the cellar's exit, with Hank found; then the drain's ladder, with the Heisenbug squashed.
  await load({ ...again, p: you(26.5, 4.5, 0) });
  check(await walkUntil("cleared"), "walking into the cellar's exit clears it");
  check(/with 1 of 3 survivors found/.test(await label()) && /and 1 of 3 survivors found\./.test(await said()), "the cellar's tally counts the survivors found, in its label and out loud");
  await np.waitForTimeout(1800);
  await np.keyboard.press("KeyS");
  await np.waitForTimeout(150);
  const top = await stored();
  check(top?.fresh && top.run?.met === 1 && top.run.totalS === 3, "a save at the top of the drain keeps the cellar's count");
  await np.keyboard.press("Enter");
  await np.waitForTimeout(250);
  const drain = await saveNow();
  await load({ ...drain, run: top?.run, p: you(41.5, 23.5, 0), foes: (drain?.foes ?? []).map(([id, x, y, , , b]) => [id, x, y, 0, 1, b]) });
  check(await walkUntil("won"), "with the Heisenbug squashed, the ladder out of the drain finishes the game");
  check(/with 1 of 6 survivors found/.test(await label()) && /and 1 of 6 survivors found\./.test(await said()), "and the last tally counts the survivors on both levels, in its label and out loud");
  check(!errors.some((e) => e.startsWith("game folk:")), "no script errors with the neighbours and Biscuit");
  await ctx.close();
}
// Storm Cellar's mouse and keys: moving the mouse up looks up (the view changes with no turning);
// the switch, or V, makes it walk instead, and is remembered. Any key can be changed: the new key
// plays, a key in use swaps over, Enter is kept, and Reset puts every key back.
{
  const ctx = await browser.newContext({ viewport: { width: 1340, height: 900 } });
  const mk = await ctx.newPage();
  watch(mk, "game keys");
  await mk.goto(url);
  await mk.waitForFunction(() => document.querySelector("#game").dataset.ready === "1" && document.querySelector("#game").dataset.state === "title", null, { timeout: 8000 });
  const frame = () => gameFrame(mk);
  await mk.click("#game");
  await mk.waitForTimeout(250);
  const box = await mk.locator("#game").boundingBox();
  const level = await frame();
  for (const dy of [-40, -80, -120]) await mk.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + dy);
  await mk.waitForTimeout(250);
  const locked = await mk.evaluate(() => document.pointerLockElement?.id === "game");
  check(!locked || Buffer.compare(level, await frame()) !== 0, `moving the mouse up looks up${locked ? "" : " (no pointer lock here, so not checked)"}`);
  await mk.keyboard.press("KeyV");
  await mk.waitForTimeout(100);
  check((await mk.locator("#mouseY button[aria-pressed=true]").innerText()) === "Walk", "V switches the mouse to walking");
  await mk.keyboard.press("Escape");
  await mk.reload();
  await mk.waitForFunction(() => document.querySelector("#game").dataset.ready === "1" && document.querySelector("#game").dataset.state === "title", null, { timeout: 8000 });
  check((await mk.locator("#mouseY button[aria-pressed=true]").innerText()) === "Walk", "and it's remembered");
  await mk.click('#mouseY button[data-m="look"]');
  await mk.click("#keysBox summary");
  check((await mk.locator("#keyTable tbody tr").count()) >= 16, "Keys lists every action");
  await mk.click('#keyTable button[data-a="forward"]');
  await mk.keyboard.press("KeyI");
  check((await mk.locator('#keyTable button[data-a="forward"]').locator("xpath=../../td[2]").innerText()) === "I", "a new key for moving forward takes");
  await mk.click('#keyTable button[data-a="fire"]');
  await mk.keyboard.press("Enter");
  check(/kept for starting and pausing/.test(await mk.locator("#keyMsg").textContent()), "Enter can't be taken");
  await mk.keyboard.press("Escape");
  await mk.click('#keyTable button[data-a="back"]');
  await mk.keyboard.press("KeyI");
  const swapped = await mk.evaluate(() => JSON.parse(localStorage.getItem("github-leaderboard.keys")));
  check(swapped.back.join() === "KeyI" && swapped.forward.join() === "KeyS,ArrowDown", "a key already in use swaps over");
  await mk.focus("#game");
  await mk.keyboard.press("Enter");
  await mk.waitForTimeout(200);
  const before = await frame();
  await mk.keyboard.down("KeyS");
  await mk.waitForTimeout(500);
  await mk.keyboard.up("KeyS");
  check(Buffer.compare(before, await frame()) !== 0, "and the game plays with the changed keys");
  check(/Esc gives it back\. S or Down arrow, I, A, and D move/.test(await mk.locator("#gameKeys").textContent()), "the keys under the game say so");
  await mk.keyboard.press("Escape");
  await mk.click("#keyReset");
  check((await mk.evaluate(() => JSON.parse(localStorage.getItem("github-leaderboard.keys")).forward.join())) === "KeyW,ArrowUp", "Reset all keys puts them back");
  check(!errors.some((e) => e.startsWith("game keys:")), "no script errors with the mouse and keys");
  await ctx.close();
}
// The Content Security Policy: the page's scripts are named by hash and no other site's scripts are
// allowed, so a script from a CDN, one slipped into the page, and a string run as code are all
// refused. The string goes through setTimeout, since the test's own eval comes from DevTools, which
// the policy lets through. (This tab
// isn't watched: the refusals below log errors on purpose. Every other tab is, so any refusal of
// the page's own code fails "no script errors".)
{
  const cs = await browser.newPage({ viewport: { width: 1340, height: 900 } });
  await cs.goto(url);
  await cs.waitForTimeout(300);
  const policy = (await cs.getAttribute('meta[http-equiv="Content-Security-Policy"]', "content")) ?? "";
  const scripts = policy.match(/script-src ([^;]*)/)?.[1] ?? "";
  check(/^'self'( 'sha256-[A-Za-z0-9+/=]+'){3,}$/.test(scripts), `the page's policy allows only its own scripts (${scripts.split(" ").length - 1} by hash)`);
  check(/default-src 'none'/.test(policy) && /img-src 'self' data: blob: https:\/\/avatars\.githubusercontent\.com;/.test(policy) && /connect-src 'self'/.test(policy), "and nothing else from anywhere but GitHub's avatars");
  const tried = await cs.evaluate(
    () =>
      new Promise((done) => {
        const seen = [];
        document.addEventListener("securitypolicyviolation", (e) => seen.push(e.violatedDirective));
        const outside = document.createElement("script");
        outside.src = "https://cdn.jsdelivr.net/npm/left-pad@1.3.0/index.js";
        document.head.appendChild(outside);
        const inside = document.createElement("script");
        inside.textContent = "window.__slipped = true";
        document.head.appendChild(inside);
        setTimeout("window.__evaled = true", 0);
        setTimeout(() => done({ seen, slipped: Boolean(window.__slipped), evaled: Boolean(window.__evaled) }), 600);
      }),
  );
  check(tried.seen.filter((d) => d.startsWith("script-src")).length >= 3 && !tried.slipped && !tried.evaled, `a CDN's script, a script slipped into the page, and a string run as code are all refused (${tried.seen.join(", ")})`);
  await cs.close();
}
// Every county, on a map: its shapes load when it comes near (from a file:// page too), a state
// zooms in, a county there sets the leaderboard, the keyboard moves and speaks, the colours follow
// the theme, a phone never scrolls sideways, and reduced motion jumps straight there.
{
  const cm = await browser.newPage({ viewport: { width: 1340, height: 900 } });
  watch(cm, "county map");
  await cm.goto(url);
  await cm.waitForTimeout(400);
  check(!(await cm.evaluate(() => document.querySelectorAll("#cmSvg path.c").length)), "the county map waits until it comes near");
  await cm.locator("#counties").scrollIntoViewIfNeeded();
  const ready = await cm.waitForFunction(() => document.querySelector("#cmBox").classList.contains("ready"), null, { timeout: 10000 }).then(() => true, () => false);
  const paths = await cm.evaluate(() => document.querySelectorAll("#cmSvg path.c").length);
  check(ready && paths === 3141, `then draws every county in the 50 states (${paths})`);
  const lit = () => cm.evaluate(() => [...document.querySelectorAll("#cmSvg path.c")].filter((p) => p.getAttribute("fill") !== THEME.tileEmpty).length);
  const counted = await cm.evaluate(() => CROW.size);
  check(counted > 100 && (await lit()) === counted, `and colours the ${counted} with someone counted`);
  // A state: from the list, then a county in it with someone counted.
  await cm.selectOption("#cmState", "MS");
  await cm.waitForTimeout(500);
  const box = (await cm.getAttribute("#cmSvg", "viewBox")).split(" ").map(Number);
  check((await cm.locator("#cmTitle").innerText()) === "Mississippi, county by county" && box[2] < 2000, "choosing Mississippi zooms in on it");
  check(!(await cm.locator("#cmAll").isHidden()), "and offers a way back to all states");
  const hinds = await cm.evaluate(() => [...CROW.values()].filter((r) => r.fips.startsWith("28") && r.people > 0).sort((a, b) => b.people - a.people)[0]?.fips);
  const i = await cm.evaluate((f) => CM.byId.get(f).el.dataset.i, hinds);
  await cm.locator(`#cmSvg path.c[data-i="${i}"]`).click({ force: true });
  await cm.waitForTimeout(300);
  check((await cm.locator("#scopeCounty").inputValue()).endsWith(`:${hinds}`) && /^[1-9]/.test(await cm.locator("#count").innerText()), `clicking a county (${hinds}) sets the leaderboard to it`);
  check((await cm.locator("#cmPick a").innerText()).startsWith("Leaderboard: "), "and links down to it");
  // The keyboard: one stop; arrows move and speak; Escape zooms out.
  await cm.focus("#cmBox");
  await cm.keyboard.press("ArrowLeft");
  await cm.waitForTimeout(450);
  check(/, Mississippi/.test(await cm.locator("#cmSaid").textContent()), `the arrow keys move between counties and say where (${await cm.locator("#cmSaid").textContent()})`);
  await cm.keyboard.press("Escape");
  await cm.waitForTimeout(600);
  check((await cm.locator("#cmState").inputValue()) === "" && (await cm.getAttribute("#cmSvg", "viewBox")) === "0 0 7800 4880", "Escape zooms back out to all states");
  await cm.waitForTimeout(400);
  check((await cm.locator("#cmSaid").textContent()).startsWith("Mississippi."), "and stays on the state it came from");
  await cm.keyboard.press("Enter");
  await cm.waitForTimeout(600);
  check((await cm.locator("#cmState").inputValue()) === "MS", "Enter zooms back in");
  // The theme recolours it.
  const before = await cm.evaluate((f) => CM.byId.get(f).el.getAttribute("fill"), hinds);
  const other = await cm.evaluate(() => (document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  await cm.click(`#theme button[value="${other}"]`);
  await cm.waitForTimeout(200);
  check(before !== (await cm.evaluate((f) => CM.byId.get(f).el.getAttribute("fill"), hinds)), `switching to the ${other} theme recolours the map`);
  // Closer than a state: the + and − buttons, a drag, the wheel, and the keys.
  await cm.locator("#counties").scrollIntoViewIfNeeded();
  const view = async () => (await cm.getAttribute("#cmSvg", "viewBox")).split(" ").map(Number);
  const fitW = (await view())[2];
  await cm.click("#cmIn");
  await cm.waitForTimeout(400);
  check(Math.abs((await view())[2] - fitW / 2) < 1, "the + button zooms in closer than the state");
  const sv = await cm.locator("#cmSvg").boundingBox();
  const [cx, cy] = [sv.x + sv.width / 2, sv.y + sv.height / 2];
  const x0 = (await view())[0];
  await cm.mouse.move(cx, cy);
  await cm.mouse.down();
  await cm.mouse.move(cx + 120, cy, { steps: 6 });
  await cm.mouse.up();
  await cm.waitForTimeout(100);
  check((await view())[0] < x0 && (await cm.locator("#cmPick").isHidden()) && (await cm.locator("#cmState").inputValue()) === "MS", "dragging moves the view, and isn't a click on a county");
  const w0 = (await view())[2];
  await cm.mouse.wheel(0, -200);
  await cm.waitForTimeout(150);
  check((await view())[2] < w0, "once the map is clicked, the wheel zooms it");
  await cm.mouse.move(cx, sv.y - 40);
  await cm.mouse.move(cx, cy);
  const w1 = (await view())[2];
  await cm.mouse.wheel(0, -200);
  await cm.waitForTimeout(150);
  check((await view())[2] === w1 && (await cm.evaluate(() => document.querySelector("#cmHint").classList.contains("on"))), "after the pointer leaves, the wheel scrolls the page and a hint says how to zoom");
  await cm.keyboard.down("Control");
  await cm.mouse.wheel(0, -200);
  await cm.keyboard.up("Control");
  await cm.waitForTimeout(150);
  check((await view())[2] < w1, "and Ctrl with the wheel (a trackpad's pinch) zooms any time");
  await cm.focus("#cmBox");
  await cm.keyboard.press("Escape");
  await cm.waitForTimeout(400);
  check((await view())[2] === fitW && (await cm.locator("#cmState").inputValue()) === "MS", "Escape goes back to the whole state first");
  await cm.keyboard.press("+");
  await cm.waitForTimeout(400);
  check(Math.abs((await view())[2] - fitW / 2) < 1, "+ on the keyboard zooms in");
  await cm.click("#cmOut");
  await cm.waitForTimeout(400);
  check((await view())[2] === fitW && !(await cm.isDisabled("#cmOut")), "the − button zooms back out");
  await cm.click("#cmOut");
  await cm.waitForTimeout(500);
  check((await cm.locator("#cmState").inputValue()) === "" && (await view()).join(" ") === "0 0 7800 4880" && (await cm.isDisabled("#cmOut")), "and from the whole state, out to all states, where it stops");
  check(!errors.some((e) => e.startsWith("county map:")), "no script errors in the county map");
  await cm.close();
  // A phone, with reduced motion: no sideways scroll, and a zoom lands at once.
  const still = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", hasTouch: true, isMobile: true });
  const ph = await still.newPage();
  watch(ph, "county map phone");
  await ph.goto(url);
  await ph.locator("#counties").scrollIntoViewIfNeeded();
  await ph.waitForFunction(() => document.querySelector("#cmBox").classList.contains("ready"), null, { timeout: 10000 }).catch(() => {});
  check((await ph.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, "on a phone the county map fits without sideways scrolling");
  await ph.selectOption("#cmState", "RI");
  const landed = await ph.evaluate(() => document.querySelector("#cmSvg").getAttribute("viewBox") !== "0 0 7800 4880");
  check(landed, "with reduced motion, choosing a state (Rhode Island) zooms there at once");
  check((await ph.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, "and still nothing scrolls sideways");
  check(!errors.some((e) => e.startsWith("county map phone:")), "no script errors in the county map on a phone");
  await still.close();
}
// A game controller: an Xbox one is stood in for here (the browser's list of controllers is
// replaced before the page loads). A starts, the left stick walks, Menu pauses, X saves, and the
// wizard under Keys takes each button pressed, keeps the rest with Skip, and Reset puts them back.
{
  const ctx = await browser.newContext({ viewport: { width: 1340, height: 900 } });
  await ctx.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false }));
    const pad = { id: "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)", index: 0, connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons, timestamp: 0 };
    window.__pad = pad;
    navigator.getGamepads = () => [pad, null, null, null];
  });
  const gpPage = await ctx.newPage();
  watch(gpPage, "controller");
  const hold = async (i, ms = 120) => {
    await gpPage.evaluate((b) => Object.assign(window.__pad.buttons[b], { pressed: true, value: 1 }), i);
    await gpPage.waitForTimeout(ms);
    await gpPage.evaluate((b) => Object.assign(window.__pad.buttons[b], { pressed: false, value: 0 }), i);
    await gpPage.waitForTimeout(80);
  };
  const state = () => gpPage.getAttribute("#game", "data-state");
  await gpPage.goto(url);
  await gpPage.waitForFunction(() => document.querySelector("#game").dataset.ready === "1" && document.querySelector("#game").dataset.state === "title", null, { timeout: 8000 });
  await gpPage.evaluate(() => dispatchEvent(new Event("gamepadconnected")));
  await gpPage.locator("#game").scrollIntoViewIfNeeded();
  await gpPage.waitForTimeout(150);
  check((await gpPage.locator("#padStatus").textContent()).startsWith("Connected: Xbox Wireless Controller.") && (await gpPage.locator("#padWizard").isEnabled()), "a controller is seen, and its wizard is offered");
  await hold(0);
  check((await state()) === "playing", "A starts the game");
  const still = await gameFrame(gpPage);
  await gpPage.evaluate(() => (window.__pad.axes[1] = -1));
  await gpPage.waitForTimeout(450);
  await gpPage.evaluate(() => (window.__pad.axes[1] = 0));
  check(Buffer.compare(still, await gameFrame(gpPage)) !== 0, "the left stick walks");
  await hold(9);
  check((await state()) === "paused", "Menu pauses");
  await hold(2);
  check(Boolean(await gpPage.evaluate(() => localStorage.getItem("github-leaderboard.cellar"))), "and X saves");
  await gpPage.click("#keysBox summary");
  await gpPage.click("#padWizard");
  check(/^1 of 13: press the button for Start/.test(await gpPage.locator("#padAsk").textContent()), "the wizard asks for each button in turn");
  await hold(1);
  await hold(4);
  for (let i = 0; i < 11; i++) await gpPage.click("#padSkip");
  const mine = await gpPage.evaluate(() => JSON.parse(localStorage.getItem("github-leaderboard.pad")));
  check(mine?.act?.join() === "1" && mine.fire.join() === "4" && mine.run.join() === "6,10", "and takes the buttons pressed (B to start, LB to shoot), keeping the skipped ones");
  check((await gpPage.locator("#padMsg").textContent()) === "Your controller is set up." && (await gpPage.locator("#padTable tbody tr:first-child td.k").innerText()) === "B", "then says so, and lists them");
  await gpPage.click("#padReset");
  check((await gpPage.evaluate(() => JSON.parse(localStorage.getItem("github-leaderboard.pad")).act.join())) === "0,9", "Reset controller buttons puts them back");
  check(!errors.some((e) => e.startsWith("controller:")), "no script errors with a controller");
  await ctx.close();
}
// Keys and mouse together: a game started from the keyboard takes the mouse at once (as a click
// does), so W and the mouse both work, and Escape gives the mouse back and pauses.
{
  const ctx = await browser.newContext({ viewport: { width: 1340, height: 900 } });
  const km = await ctx.newPage();
  watch(km, "keys and mouse");
  await km.goto(url);
  await km.waitForFunction(() => document.querySelector("#game").dataset.ready === "1" && document.querySelector("#game").dataset.state === "title", null, { timeout: 8000 });
  await km.locator("#game").scrollIntoViewIfNeeded();
  const box = await km.locator("#game").boundingBox();
  await km.focus("#game");
  await km.keyboard.press("Enter");
  await km.waitForTimeout(250);
  check((await km.evaluate(() => document.pointerLockElement?.id)) === "game", "starting with Enter hands the mouse to the game too");
  const before = await gameFrame(km);
  await km.keyboard.down("KeyW");
  for (let i = 1; i <= 6; i++) {
    await km.mouse.move(box.x + box.width / 2 + i * 30, box.y + box.height / 2);
    await km.waitForTimeout(50);
  }
  await km.keyboard.up("KeyW");
  check(Buffer.compare(before, await gameFrame(km)) !== 0 && (await km.getAttribute("#game", "data-state")) === "playing", "and W and the mouse work together");
  await km.keyboard.press("Escape");
  await km.waitForTimeout(200);
  check((await km.evaluate(() => document.pointerLockElement)) === null && (await km.getAttribute("#game", "data-state")) === "paused", "Escape gives the mouse back and pauses");
  check(!errors.some((e) => e.startsWith("keys and mouse:")), "no script errors with keys and mouse together");
  await ctx.close();
}
// Storm Cellar's music. Both tracks, and the Heisenbug's fight, rendered offline (on a blank page,
// from src/music.mjs, the code the build copies into the game): sound all the way through, and
// never clipping. Then in the game: it plays while you play, N and the Music switch turn it off
// and on (remembered), and a pause stops it.
{
  const { readFileSync: read } = await import("node:fs");
  const code = read(new URL("../src/music.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
  const lab = await browser.newPage();
  watch(lab, "music offline");
  await lab.goto("about:blank");
  await lab.addScriptTag({ content: code });
  const tracks = await lab.evaluate(async () => {
    const out = [];
    for (const [level, hype] of [[0, false], [1, false], [1, true], [2, false]]) {
      const secs = 20, rate = 22050;
      const ctx = new OfflineAudioContext(1, secs * rate, rate);
      const g = ctx.createGain();
      g.gain.value = 0.55 * 0.3;
      g.connect(ctx.destination);
      const m = makeMusic(ctx, g);
      m.start(level, 0.05, true);
      for (let t = 0; t < secs - 0.3; t += 0.05) m.tick(t, hype);
      const d = (await ctx.startRendering()).getChannelData(0);
      let peak = 0, quiet = 0;
      for (let s = 0; s < secs - 1; s++) {
        let e = 0;
        for (let i = s * rate; i < (s + 1) * rate; i++) {
          peak = Math.max(peak, Math.abs(d[i]));
          e += d[i] * d[i];
        }
        if (Math.sqrt(e / rate) < 0.003) quiet++;
      }
      out.push({ name: m.name, hype, peak, quiet });
    }
    return out;
  });
  for (const t of tracks) check(t.peak > 0.05 && t.peak < 0.95 && t.quiet === 0, `"${t.name}"${t.hype ? " in the Heisenbug's fight" : ""} has sound all the way through and never clips (peak ${t.peak.toFixed(2)})`);
  await lab.close();

  const ctx = await browser.newContext({ viewport: { width: 1340, height: 900 } });
  const mu = await ctx.newPage();
  watch(mu, "music");
  await mu.goto(url);
  await mu.waitForFunction(() => document.querySelector("#game").dataset.ready === "1" && document.querySelector("#game").dataset.state === "title", null, { timeout: 8000 });
  const playingMusic = () => mu.getAttribute("#game", "data-music");
  await mu.focus("#game");
  await mu.keyboard.press("Enter");
  await mu.waitForTimeout(400);
  check((await playingMusic()) === "playing", "the music starts when you play");
  await mu.keyboard.press("KeyN");
  await mu.waitForTimeout(100);
  check((await playingMusic()) === "off" && (await mu.evaluate(() => localStorage.getItem("github-leaderboard.music"))) === "off", "N turns it off, and that's remembered");
  await mu.keyboard.press("KeyN");
  await mu.waitForTimeout(100);
  check((await playingMusic()) === "playing" && (await mu.getAttribute("#musicBtn", "aria-pressed")) === "true", "and on again");
  await mu.keyboard.press("Escape");
  await mu.waitForTimeout(150);
  check((await playingMusic()) === "ready", "a pause stops it");
  await mu.click("#musicBtn");
  check((await mu.getAttribute("#musicBtn", "aria-pressed")) === "false" && (await playingMusic()) === "off", "the Music switch under the game turns it off too");
  check(!errors.some((e) => e.startsWith("music")), "no script errors from the music");
  await ctx.close();
}
// The page's own music, in the header: play, the track's name, Next, the volume (remembered), the
// spectrum and the pulse on the beat, stepping aside while the game plays its music and coming
// back after; and with reduced motion, the music without anything moving.
{
  const ctx = await browser.newContext({ viewport: { width: 1340, height: 900 } });
  const pm = await ctx.newPage();
  watch(pm, "page music");
  await pm.goto(url);
  await pm.waitForTimeout(400);
  const tunes = () => pm.getAttribute("#tunes", "data-state");
  check((await tunes()) === "off" && !(await pm.locator("#cellar #tunePlay").count()), "the page's music is off at first, and its button is in the header, not by the game");
  await pm.click("#tunePlay");
  await pm.waitForTimeout(300);
  check((await tunes()) === "playing" && (await pm.locator("#tuneName").textContent()) === "♪ Storm Warning", "Play music plays Storm Warning");
  const beats = [];
  for (let i = 0; i < 20; i++) {
    beats.push(Number(await pm.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--beat"))));
    await pm.waitForTimeout(60);
  }
  check(Math.max(...beats) > 0.3 && (await pm.locator("#viz").isVisible()), "the page pulses on the beat, and the spectrum shows along the top");
  await pm.click("#tuneNext");
  check((await pm.locator("#tuneName").textContent()) === "♪ Flood Stage", "Next plays the next track");
  await pm.locator("#tuneVol").fill("30");
  check((await pm.evaluate(() => localStorage.getItem("github-leaderboard.tunes.volume"))) === "30", "the volume is remembered");
  await pm.locator("#game").scrollIntoViewIfNeeded();
  await pm.waitForFunction(() => document.querySelector("#game").dataset.ready === "1", null, { timeout: 8000 });
  await pm.focus("#game");
  await pm.keyboard.press("Enter");
  await pm.waitForTimeout(300);
  check((await tunes()) === "held", "it steps aside while Storm Cellar plays its own music");
  await pm.keyboard.press("Escape");
  await pm.waitForTimeout(300);
  check((await tunes()) === "playing", "and comes back when the game stops");
  await pm.click("#tunePlay");
  check((await tunes()) === "off" && (await pm.evaluate(() => localStorage.getItem("github-leaderboard.tunes"))) === "off", "Pause music stops it, and that's remembered");
  check(!errors.some((e) => e.startsWith("page music:")), "no script errors from the page's music");
  await ctx.close();
  const calm = await browser.newContext({ viewport: { width: 1340, height: 900 }, reducedMotion: "reduce" });
  const rm = await calm.newPage();
  watch(rm, "page music calm");
  await rm.goto(url);
  await rm.waitForTimeout(300);
  await rm.click("#tunePlay");
  await rm.waitForTimeout(900);
  const still = await rm.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--beat"));
  check((await rm.getAttribute("#tunes", "data-state")) === "playing" && Number(still || 0) === 0 && !(await rm.locator("#viz").isVisible()), "with reduced motion the music plays, and nothing moves");
  check(!errors.some((e) => e.startsWith("page music calm:")), "no script errors from the music with reduced motion");
  await calm.close();
}
// The page stays a sensible size for a phone on a slow connection.
{
  const { gzipSync } = await import("node:zlib");
  const kb = Math.round(gzipSync(readFileSync(new URL("../site/leaderboard.html", import.meta.url))).length / 1024);
  check(kb < 900, `the page is ${kb} KB gzipped, under 900`);
}
await browser.close();

check(errors.length === 0, `no script errors${errors.length ? `:\n  ${errors.join("\n  ")}` : ""}`);
if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log("all checks passed");
