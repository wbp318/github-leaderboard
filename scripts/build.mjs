// Builds site/leaderboard.html from data/: each person placed in a state from their profile
// location (src/states.mjs), then regions, divisions, states, counties (Louisiana's parishes), and
// rankings by category, written into web/template.html.
//   node scripts/build.mjs   (or: npm run build)
//   VIEWER=<login>   whose ranks the page shows as "you" (they must be in data/users.json)
//   SCOPE=LA,MS,AR   only some states (default: all)
//   HISTORY=<file>   the daily history to show (default: data/history.json, if there is one)
//   OUT=<file>       where to write the page (default: site/leaderboard.html)
import { readFileSync, writeFileSync } from "node:fs";
import { COUNTY_STATES, countiesOf, countyKind, countyOf, hasCounties } from "../src/counties.mjs";
import { isBot, optedOut } from "../src/exclude.mjs";
import { stateOf } from "../src/states.mjs";
import { markSample, refreshedAt } from "../src/sample.mjs";
import { lastYear, readHistory } from "../src/history.mjs";

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
const people = [];
for (const [login, u] of Object.entries(users)) {
  if (!u || OPT_OUT.has(login.toLowerCase()) || isBot(login)) continue;
  const ab = stateOf(u.location);
  if (!ab || (SCOPE && !SCOPE.has(ab))) continue;
  const s = BY_AB[ab];
  const county = hasCounties(ab) ? (countyOf(ab, u.location) ?? "") : "";
  people.push({ login, ...u, state: ab, region: s.region, division: s.division, county });
}
// When the data was last fetched (the newest lookup). The sample's year counts back from it, so the
// page and the daily history (scripts/history.mjs) pick the same people.
const refreshed = refreshedAt(users) || Date.now();
markSample(people, profiles, PER_STATE, refreshed);
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
// Each state with a county list, county by county, then everyone who named only the state.
const counties = Object.fromEntries(
  COUNTY_STATES.filter((ab) => !SCOPE || SCOPE.has(ab)).map((ab) => {
    const [kind, kinds] = countyKind(ab);
    const here = people.filter((p) => p.state === ab);
    const notGiven = `${kind[0].toUpperCase()}${kind.slice(1)} not given`;
    const rows = [...countiesOf(ab), ""].map((name) => ({ name: name || notGiven, ...agg(here.filter((p) => p.county === name)) }));
    return [ab, { kind, kinds, rows }];
  }),
);

// Compact people: [login, name, state, total, commits, private, prs, reviews, issues, repos, followers, county, fair, location]
const P = people.map((p) => [p.login, p.name, p.state, p.total, p.commits, p.private, p.prs, p.reviews, p.issues, p.repos, p.followers, p.county, p.fair ? 1 : 0, (p.location ?? "").trim()]);
const me = people.find((p) => p.login === VIEWER) ?? null;
// The daily refresh's time, from the workflow.
const cron = readFileSync(new URL("../.github/workflows/refresh.yml", import.meta.url), "utf8").match(/cron:\s*"(\d+) (\d+) \* \* \*"/);
const schedule = cron ? { hour: Number(cron[2]), minute: Number(cron[1]) } : null;
const data = { generated: new Date().toISOString(), refreshed, schedule, scopeName: SCOPE_NAME, perState: PER_STATE, compared: fair.length, viewer: VIEWER, me, us, regions, divisions, states, counties, P, candidates: Object.values(cands).reduce((a, s) => a + s.logins.length, 0), fetched: Object.keys(users).length };
// The daily history (scripts/history.mjs), its last year: a sparkline per state, and a chart of one.
data.history = lastYear(readHistory(process.env.HISTORY ?? new URL("../data/history.json", import.meta.url)));

const tpl = readFileSync(new URL("../web/template.html", import.meta.url), "utf8");
writeFileSync(process.env.OUT ?? new URL("../site/leaderboard.html", import.meta.url), tpl.replace("/*__DATA__*/null", () => JSON.stringify(data).replace(/</g, String.fromCharCode(92) + "x3c")));
console.log(`placed ${people.length} of ${Object.keys(users).length} users in a state (${fair.length} in the per-state sample); leaderboard.html written`);
if (me) console.log(`you: ${me.state}, ${me.total} contributions`);
