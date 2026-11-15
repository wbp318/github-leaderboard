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

// A light theme: a light system gets a light page, and the switch at the top overrides it and is
// remembered. Brightness is the page background's average of red, green, and blue (0 to 255).
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
await browser.close();

check(errors.length === 0, `no script errors${errors.length ? `:\n  ${errors.join("\n  ")}` : ""}`);
if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log("all checks passed");
