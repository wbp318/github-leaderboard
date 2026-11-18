// Builds site/leaderboard.html from data/: each person placed in a state from their profile
// location (src/states.mjs), then regions, divisions, states, counties (Louisiana's parishes), and
// rankings by category, written into web/template.html.
//   node scripts/build.mjs   (or: npm run build)
//   VIEWER=<login>   whose ranks the page shows as "you" (they must be in data/users.json)
//   SCOPE=LA,MS,AR   only some states (default: all)
//   HISTORY=<file>   the daily history to show (default: data/history.json, if there is one)
//   OUT=<file>       where to write the page (default: site/leaderboard.html); the badges go in
//                    badge/ beside it, version.txt, the build's time, which an open page checks
//                    to see if there is a newer one, and us-counties.js, the county map's shapes
//   BADGES=0         no badges (for test builds)
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { BADGE_LABEL, badgeMessage, badgeSvg, ranksOf } from "../src/badge.mjs";
import { COUNTY_STATES, countiesOf, countyKind, countyLabel, countyOf } from "../src/counties.mjs";
import { isBot, optedOut } from "../src/exclude.mjs";
import { stateOf } from "../src/states.mjs";
import { current, markSample, refreshedAt } from "../src/sample.mjs";
import { lastYear, readHistory } from "../src/history.mjs";
import { dailyAt } from "../src/refresh.mjs";

const VIEWER = process.env.VIEWER ?? "wbp318";
const SCOPE = process.env.SCOPE && process.env.SCOPE !== "all" ? new Set(process.env.SCOPE.split(",")) : null;
const SCOPE_NAME = SCOPE ? "the states chosen" : "the United States";
const cands = JSON.parse(readFileSync(new URL("../data/candidates.json", import.meta.url), "utf8"));
const users = JSON.parse(readFileSync(new URL("../data/users.json", import.meta.url), "utf8"));
const profiles = JSON.parse(readFileSync(new URL("../data/profiles.json", import.meta.url), "utf8"));
// States are compared on the same sample everywhere: the collector's rule, the PER_STATE likeliest
// to be most active among people who pushed in the last year. States with county lists have more
// (everyone active), used only for their own views and their counties.
const PER_STATE = Number(process.env.PER_STATE ?? 80);
const OPT_OUT = optedOut();

const STATES = [
  ["AL", "Alabama", "South", "East South Central"], ["AK", "Alaska", "West", "Pacific"],
  ["AZ", "Arizona", "West", "Mountain"], ["AR", "Arkansas", "South", "West South Central"],
  ["CA", "California", "West", "Pacific"], ["CO", "Colorado", "West", "Mountain"],
  ["CT", "Connecticut", "Northeast", "New England"], ["DE", "Delaware", "South", "South Atlantic"],
  ["FL", "Florida", "South", "South Atlantic"], ["GA", "Georgia", "South", "South Atlantic"],
  ["HI", "Hawaii", "West", "Pacific"], ["ID", "Idaho", "West", "Mountain"],
  ["IL", "Illinois", "Midwest", "East North Central"], ["IN", "Indiana", "Midwest", "East North Central"],
  ["IA", "Iowa", "Midwest", "West North Central"], ["KS", "Kansas", "Midwest", "West North Central"],
  ["KY", "Kentucky", "South", "East South Central"], ["LA", "Louisiana", "South", "West South Central"],
  ["ME", "Maine", "Northeast", "New England"], ["MD", "Maryland", "South", "South Atlantic"],
  ["MA", "Massachusetts", "Northeast", "New England"], ["MI", "Michigan", "Midwest", "East North Central"],
  ["MN", "Minnesota", "Midwest", "West North Central"], ["MS", "Mississippi", "South", "East South Central"],
  ["MO", "Missouri", "Midwest", "West North Central"], ["MT", "Montana", "West", "Mountain"],
  ["NE", "Nebraska", "Midwest", "West North Central"], ["NV", "Nevada", "West", "Mountain"],
  ["NH", "New Hampshire", "Northeast", "New England"], ["NJ", "New Jersey", "Northeast", "Middle Atlantic"],
  ["NM", "New Mexico", "West", "Mountain"], ["NY", "New York", "Northeast", "Middle Atlantic"],
  ["NC", "North Carolina", "South", "South Atlantic"], ["ND", "North Dakota", "Midwest", "West North Central"],
  ["OH", "Ohio", "Midwest", "East North Central"], ["OK", "Oklahoma", "South", "West South Central"],
  ["OR", "Oregon", "West", "Pacific"], ["PA", "Pennsylvania", "Northeast", "Middle Atlantic"],
  ["RI", "Rhode Island", "Northeast", "New England"], ["SC", "South Carolina", "South", "South Atlantic"],
  ["SD", "South Dakota", "Midwest", "West North Central"], ["TN", "Tennessee", "South", "East South Central"],
  ["TX", "Texas", "South", "West South Central"], ["UT", "Utah", "West", "Mountain"],
  ["VT", "Vermont", "Northeast", "New England"], ["VA", "Virginia", "South", "South Atlantic"],
  ["WA", "Washington", "West", "Pacific"], ["WV", "West Virginia", "South", "South Atlantic"],
  ["WI", "Wisconsin", "Midwest", "East North Central"], ["WY", "Wyoming", "West", "Mountain"],
];
const BY_AB = Object.fromEntries(STATES.map(([ab, name, region, division]) => [ab, { ab, name, region, division }]));

// ---------------------------------------------------------------- place everyone
// When the data was last fetched (the newest lookup). The sample's year counts back from it, so the
// page and the daily history (scripts/history.mjs) pick the same people.
const refreshed = refreshedAt(users) || Date.now();
const placed = [];
for (const [login, u] of Object.entries(users)) {
  if (!current(u, refreshed) || OPT_OUT.has(login.toLowerCase()) || isBot(login)) continue;
  const ab = stateOf(u.location);
  if (!ab || (SCOPE && !SCOPE.has(ab))) continue;
  const s = BY_AB[ab];
  // The county, by its 5-digit FIPS code (src/counties.mjs), or "" for someone who named none.
  const county = countyOf(ab, u.location) ?? "";
  placed.push({ login, ...u, state: ab, region: s.region, division: s.division, county });
}
markSample(placed, profiles, PER_STATE, refreshed);
const people = placed;
const fair = people.filter((p) => p.fair);
const CATS = ["total", "commits", "private", "prs", "reviews", "issues", "repos", "followers"];
const sum = (list, k) => list.reduce((a, p) => a + p[k], 0);
const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const agg = (list) => {
  const out = { people: list.length, active: list.filter((p) => p.total > 0).length };
  for (const k of CATS) out[k] = sum(list, k);
  out.average = list.length ? out.total / list.length : 0;
  out.median = median(list.map((p) => p.total));
  const top = [...list].sort((a, b) => b.total - a.total)[0];
  out.top = top ? { login: top.login, total: top.total } : null;
  return out;
};
const states = STATES.map(([ab, name, region, division]) => {
  const list = people.filter((p) => p.state === ab);
  return { ab, name, region, division, counted: !SCOPE || SCOPE.has(ab), listing: cands[ab]?.total ?? 0, ...agg(list.filter((p) => p.fair)), all: agg(list) };
});
const regionNames = ["Northeast", "Midwest", "South", "West"];
const regions = regionNames.map((r) => ({ name: r, ...agg(fair.filter((p) => p.region === r)) })).filter((r) => r.people > 0);
const divisionNames = [...new Set(STATES.map((s) => s[3]))];
const divisions = divisionNames.map((d) => ({ name: d, region: STATES.find((s) => s[3] === d)[2], ...agg(fair.filter((p) => p.division === d)) })).filter((d) => d.people > 0);
const us = agg(fair);
// Each state county by county: a row for each county with someone counted, by FIPS code, then one
// for everyone who named only the state (fips ""). fp is the state's FIPS code, n its count of counties.
const byCounty = Map.groupBy(people, (p) => p.county || `${p.state}:-`);
const counties = Object.fromEntries(
  COUNTY_STATES.filter((ab) => !SCOPE || SCOPE.has(ab)).map((ab) => {
    const [kind, kinds] = countyKind(ab);
    const all = countiesOf(ab);
    const notGiven = `${kind[0].toUpperCase()}${kind.slice(1)} not given`;
    const rows = all.filter((f) => byCounty.has(f)).map((f) => ({ fips: f, name: countyLabel(f), ...agg(byCounty.get(f)) }));
    rows.push({ fips: "", name: notGiven, ...agg(byCounty.get(`${ab}:-`) ?? []) });
    return [ab, { kind, kinds, fp: all[0].slice(0, 2), n: all.length, rows }];
  }),
);

// People, by column, which is smaller than one array a person: each field a list, the state as its
// place in states. The page turns them back into rows: [login, name, state, total, commits, private,
// prs, reviews, issues, repos, followers, county, fair, location].
const stateAt = Object.fromEntries(STATES.map(([ab], i) => [ab, i]));
const P = { login: [], name: [], state: [], total: [], commits: [], private: [], prs: [], reviews: [], issues: [], repos: [], followers: [], county: [], fair: [], location: [] };
for (const p of people) {
  for (const k of ["login", "name", "total", "commits", "private", "prs", "reviews", "issues", "repos", "followers"]) P[k].push(p[k]);
  // The county as the last 3 digits of its FIPS code (0 for none); the page adds the state's 2.
  P.county.push(p.county ? Number(p.county.slice(2)) : 0);
  P.state.push(stateAt[p.state]);
  P.fair.push(p.fair ? 1 : 0);
  P.location.push((p.location ?? "").trim());
}
const me = people.find((p) => p.login === VIEWER) ?? null;
// The daily refresh's time, from the workflow (src/refresh.mjs).
const schedule = dailyAt(readFileSync(new URL("../.github/workflows/refresh.yml", import.meta.url), "utf8"));
const data = { generated: new Date().toISOString(), refreshed, schedule, scopeName: SCOPE_NAME, perState: PER_STATE, compared: fair.length, viewer: VIEWER, me, us, regions, divisions, states, counties, P, candidates: Object.values(cands).reduce((a, s) => a + s.logins.length, 0), fetched: Object.keys(users).length };
// The daily history (scripts/history.mjs), its last year: a sparkline per state, and a chart of one.
data.history = lastYear(readHistory(process.env.HISTORY ?? new URL("../data/history.json", import.meta.url)));

// Where the page is published, for the links and badges it hands out.
data.home = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).homepage;

const out = process.env.OUT ? pathToFileURL(resolve(process.env.OUT)) : new URL("../site/leaderboard.html", import.meta.url);
// The county map's shapes (web/us-counties.json, from scripts/make-geo.mjs), as a script the page
// loads once the map is on screen: a script rather than JSON, so it loads into a file:// page too.
// Its name carries a hash of it, so a browser's cache never serves old shapes. The page decodes
// them with src/geo.mjs, copied in here, so the page and its tests run the same code.
const geoJson = readFileSync(new URL("../web/us-counties.json", import.meta.url), "utf8").trim();
// Every county's name rides along, for the counties no one is counted in yet.
const names = Object.fromEntries(COUNTY_STATES.flatMap(countiesOf).map((f) => [f, countyLabel(f)]));
const geoJs = `/* The shape of every county: ${JSON.parse(geoJson).license}. */\n__countyGeo(${geoJson}, ${JSON.stringify(names)});\n`;
writeFileSync(new URL("us-counties.js", out), geoJs);
data.geo = `us-counties.js?v=${createHash("sha256").update(geoJs).digest("hex").slice(0, 8)}`;
const decodeGeo = readFileSync(new URL("../src/geo.mjs", import.meta.url), "utf8").replace(/^export function decodeGeo/m, "function decodeGeo");
// Line ends as a browser reads them (a Windows checkout may have CRLF): the browser hashes a script
// with plain newlines, so the hashes below must be taken over the same.
const lf = (s) => s.replace(/\r\n?/g, "\n");
// The page's music (src/music.mjs), copied in the same way, so the page and the test that renders
// it offline run the same code. And Ice Storm's hockey (src/hockey.mjs), into the game's script, so
// the page plays the same game test/hockey.test.mjs does.
const musicCode = lf(readFileSync(new URL("../src/music.mjs", import.meta.url), "utf8")).replace(/^export /gm, "");
const hockeyCode = lf(readFileSync(new URL("../src/hockey.mjs", import.meta.url), "utf8")).replace(/^export /gm, "");

const tpl = lf(readFileSync(new URL("../web/template.html", import.meta.url), "utf8"));
const page = tpl
  .replace("/*__DECODE_GEO__*/", () => decodeGeo)
  .replace("/*__MUSIC__*/", () => musicCode)
  .replace("/*__HOCKEY__*/", () => hockeyCode)
  .replace("/*__DATA__*/null", () => JSON.stringify(data).replace(/</g, String.fromCharCode(92) + "x3c"));
// The Content Security Policy: what the page may load and run. Scripts only from the page itself,
// each one named by its hash (so a script slipped into the page some other way never runs) or from
// this site (us-counties.js); images from this site, the page's own drawings (data: and blob:),
// and GitHub avatars for the share card; requests only to this site (version.txt). Nothing from
// anywhere else, ever: a new outside host has to be added here on purpose (docs/optimjack.md).
// The page's scripts, found by plain text: the template writes each one plain, <script>…</script>,
// and the build stops if any <script> isn't, so none can go unhashed.
const scriptBodies = page.split("<script>").slice(1).map((part) => {
  const end = part.indexOf("</script>");
  if (end < 0) throw new Error("a <script> in web/template.html has no </script>");
  return part.slice(0, end);
});
if (page.toLowerCase().split("<script").length - 1 !== scriptBodies.length) {
  throw new Error("every script in web/template.html must be written plain, <script>…</script>, so the build can hash it into the Content Security Policy");
}
const scriptHashes = scriptBodies.map((body) => `'sha256-${createHash("sha256").update(body).digest("base64")}'`);
const CSP = [
  "default-src 'none'",
  `script-src 'self' ${scriptHashes.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://avatars.githubusercontent.com",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
].join("; ");
if (!page.includes('content="__CSP__"')) throw new Error("web/template.html has lost its Content-Security-Policy placeholder");
writeFileSync(out, page.replace('content="__CSP__"', `content="${CSP}"`));
writeFileSync(new URL("version.txt", out), `${data.generated}
`);
const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(`leaderboard.html: ${kb(Buffer.byteLength(page))}, ${kb(gzipSync(page).length)} gzipped; ${scriptHashes.length} scripts hashed into its Content Security Policy`);

// A badge for each person's profile README (src/badge.mjs), written fresh, so nobody who has left
// keeps one.
const badges = new URL("badge/", out);
rmSync(badges, { recursive: true, force: true });
const BADGES = process.env.BADGES !== "0";
if (BADGES) mkdirSync(badges, { recursive: true });
const ranks = ranksOf(people);
for (const p of BADGES ? people : []) {
  writeFileSync(new URL(`${p.login.toLowerCase()}.svg`, badges), badgeSvg(BADGE_LABEL, badgeMessage(ranks.get(p.login), BY_AB[p.state].name, p.county ? countyLabel(p.county) : "")));
}
console.log(`placed ${people.length} of ${Object.keys(users).length} users in a state (${fair.length} in the per-state sample); leaderboard.html and ${BADGES ? people.length : "no"} badges written`);
if (me) console.log(`you: ${me.state}, ${me.total} contributions`);
