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
await browser.close();

check(errors.length === 0, `no script errors${errors.length ? `:\n  ${errors.join("\n  ")}` : ""}`);
if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log("all checks passed");
