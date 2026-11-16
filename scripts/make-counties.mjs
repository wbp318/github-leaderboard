// Makes src/counties/us.json: every county of the 50 states, by FIPS code, with the place names in it
// for the 45 states without a hand-written county file. Run by hand when a source changes; the
// output is committed.
//   node scripts/make-counties.mjs
//
// The sources are downloaded once to a cache in the temp directory, checked against the SHA-256
// below, and only parsed, never run:
//   - us-atlas's county map, for the set of county codes the page draws (3,141 without D.C.);
//   - the Census 2020 lists of counties, of places in each county, and of county subdivisions;
//   - the Census 2024 population estimates of places and county subdivisions.
//
// Which names go to which county, within one state:
//   1. Census suffixes come off ("Austin city" is Austin, "Edison township" Edison), and an alternate
//      name in parentheses is a second name: "San Buenaventura (Ventura)" is also Ventura.
//   2. Names are normalized as countyOf reads locations (normalizePlace in src/counties.mjs).
//   3. A place in several counties is in the one with most of its people. A census-designated
//      place (CDP) in several counties has no such count, and is left out.
//   4. A name shared by places in different counties stays only for an incorporated place or town of
//      10,000 people or more with at least 5 times the others' people combined. A CDP never wins one.
//   5. A place named like another county of the state is left out, unless it has 50,000 people:
//      "Henderson, TX" is not Henderson County, so it is left out; Lincoln, NE is kept.
//   6. Towns and townships (county subdivisions) count only in the states where they are what
//      people live in: CT, ME, MA, MI, MN, NH, NJ, NY, PA, RI, VT, and WI.
//   7. Names shorter than 3 letters, and the words in STOP (src/counties/aliases.mjs), are left out.
// src/counties/aliases.mjs overrides the result where Census names are not what people write.
//
// Then, if data/profiles.json is there, it replays the county match over everyone placed in a
// state and writes a review to the temp directory: match rates by state, the commonest locations
// that match no county, and a seeded random sample of matches to read.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ALIASES, STOP } from "../src/counties/aliases.mjs";
import { normalizePlace } from "../src/counties.mjs";
import { NAMES } from "../src/states.mjs";

const CACHE = join(tmpdir(), "gh-leaderboard-census");
const REVIEW = join(tmpdir(), "gh-leaderboard-counties-review.txt");
const OUT = new URL("../src/counties/us.json", import.meta.url);

const CENSUS = "https://www2.census.gov";
const SOURCES = {
  atlas: ["https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/counties-albers-10m.json", "a674dfa31b625e92635f32684a61ae135b05a91507f17f2d5164833237fecf46"],
  counties: [`${CENSUS}/geo/docs/reference/codes2020/national_county2020.txt`, "9f6e5f6eb6ac2f5e9a36d5fd01dec77991bddc75118f748a069441a4782970d6"],
  places: [`${CENSUS}/geo/docs/reference/codes2020/national_place_by_county2020.txt`, "9996494d33cf6ee4527491508aa1b8dae85dcff3a979886e19b0b375e5d06ec6"],
  cousubs: [`${CENSUS}/geo/docs/reference/codes2020/national_cousub2020.txt`, "2f292e90e56b1c1b085402bef6e4dc9d9404b0006e44988860226759217c7cf3"],
  people: [`${CENSUS}/programs-surveys/popest/datasets/2020-2024/cities/totals/sub-est2024.csv`, "af9cd4835c93552a2161fc88bf4d7aa31e81b4f16f7457980b95295cf91e49e9"],
};
const HEADERS = {
  counties: "STATE|STATEFP|COUNTYFP|COUNTYNS|COUNTYNAME|CLASSFP|FUNCSTAT",
  places: "STATE|STATEFP|COUNTYFP|COUNTYNAME|PLACEFP|PLACENS|PLACENAME|TYPE|CLASSFP|FUNCSTAT",
  cousubs: "STATE|STATEFP|COUNTYFP|COUNTYNAME|COUSUBFP|COUSUBNS|COUSUBNAME|CLASSFP|FUNCSTAT",
  people: "SUMLEV,STATE,COUNTY,PLACE,COUSUB,CONCIT,PRIMGEO_FLAG,FUNCSTAT,NAME,STNAME,ESTIMATESBASE2020,POPESTIMATE2020,POPESTIMATE2021,POPESTIMATE2022,POPESTIMATE2023,POPESTIMATE2024",
};

// The hand-written states keep their own places (src/counties/*.mjs).
const HAND = new Set(["LA", "MS", "AL", "AR", "TN"]);
// The states where people live in towns and townships, not only in incorporated places.
const TOWNSHIPS = new Set(["CT", "ME", "MA", "MI", "MN", "NH", "NJ", "NY", "PA", "RI", "VT", "WI"]);
// Towns and townships (T1), and towns that are also a place (T5). The rest are cities already in the
// places list (C5), reservations, unorganized territory, and gores and grants without people.
const TOWNSHIP_CLASSES = new Set(["T1", "T5"]);
// The Census 2020 split Valdez-Cordova into Chugach and Copper River; the map has the old area.
const MERGED = { "02063": "02261", "02066": "02261" };
const LABELS = { "02261": "Valdez-Cordova Census Area" };
// Connecticut's estimates use its 2022 planning regions, not the counties the map has, so its places
// and towns are joined to their people by their own codes alone. None of its towns is in two counties.
const CONNECTICUT = "09";

const fail = (msg) => {
  throw new Error(msg);
};
const assert = (ok, msg) => ok || fail(msg);

async function source(name) {
  const [url, sha] = SOURCES[name];
  const file = join(CACHE, url.split("/").pop());
  const cached = existsSync(file);
  let buf;
  if (cached) buf = readFileSync(file);
  else {
    console.log(`downloading ${url}`);
    const res = await fetch(url);
    assert(res.ok, `${url}: HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
  }
  const got = createHash("sha256").update(buf).digest("hex");
  if (got !== sha) {
    fail(
      `${cached ? file : url} has SHA-256 ${got}, not ${sha}.` +
        (cached ? " Delete it and run again." : " The file changed: read it, and if it is right, update SOURCES."),
    );
  }
  if (!cached) {
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(file, buf);
  }
  return buf;
}

// A pipe-separated Census file, as rows of fields, after checking its header (trimStart drops a
// byte-order mark, if there is one).
function pipes(name, buf) {
  const lines = buf.toString("utf8").trimStart().split(/\r?\n/).filter(Boolean);
  assert(lines[0] === HEADERS[name], `${name}: unexpected header ${lines[0]}`);
  return lines.slice(1).map((l) => l.split("|"));
}

// The population estimates, a Latin-1 CSV with quoted names.
function csv(name, buf) {
  const lines = buf.toString("latin1").split(/\r?\n/).filter(Boolean);
  assert(lines[0] === HEADERS[name], `${name}: unexpected header ${lines[0]}`);
  return lines.slice(1).map((l) => [...l.matchAll(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g)].map((m) => m[1].replace(/^"|"$/g, "").replace(/""/g, '"')));
}

const [atlasBuf, countyBuf, placeBuf, cousubBuf, peopleBuf] = await Promise.all(
  ["atlas", "counties", "places", "cousubs", "people"].map(source),
);

// The states, by code and by FIPS.
const CODES = NAMES.map(([ab]) => ab);
const NAME_OF = Object.fromEntries(NAMES);
const FP = {};

// Every county the map draws, without D.C.
const atlas = JSON.parse(atlasBuf.toString("utf8"));
const MAP_IDS = new Set(atlas.objects.counties.geometries.map((g) => String(g.id)).filter((id) => !id.startsWith("11")));
assert(MAP_IDS.size === 3141, `the map has ${MAP_IDS.size} counties outside D.C., not 3,141`);

// The counties, by FIPS.
const COUNTY = new Map();
for (const [ab, sfp, cfp, , label] of pipes("counties", countyBuf)) {
  if (!CODES.includes(ab)) continue; // D.C., Puerto Rico, and the island areas
  FP[ab] ??= sfp;
  assert(FP[ab] === sfp, `${ab} has two state codes`);
  const fips = MERGED[sfp + cfp] ?? sfp + cfp;
  COUNTY.set(fips, { ab, fips, label: LABELS[fips] ?? label });
}
assert(COUNTY.size === MAP_IDS.size && [...MAP_IDS].every((id) => COUNTY.has(id)), "the counties differ from the map's");

// "Travis County" is Travis, "Kenai Peninsula Borough" Kenai Peninsula; an independent city keeps
// its "city", so Virginia's Richmond city is not Richmond County.
const shortName = (label) => label.replace(/ (?:County|Parish|City and Borough|Borough|Census Area|Municipality)$/, "");
const KIND = (ab) => (ab === "LA" ? ["parish", "parishes"] : ab === "AK" ? ["borough", "boroughs"] : ["county", "counties"]);
const key = (name) => normalizePlace(name).replace(/ /g, "");
// County short names by state, for rule 5.
const COUNTY_KEYS = Object.fromEntries(CODES.map((ab) => [ab, new Map()]));
for (const c of COUNTY.values()) {
  c.name = shortName(c.label);
  const k = key(c.name);
  assert(!COUNTY_KEYS[c.ab].has(k), `${c.ab} has two counties named ${c.name}`);
  COUNTY_KEYS[c.ab].set(k, c.fips);
}

// Population, by FIPS codes: places (162), places' parts in each county (157), towns and townships (061).
const placePeople = new Map();
const partPeople = new Map();
const townPeople = new Map();
for (const r of csv("people", peopleBuf)) {
  const [level, sfp, cfp, pfp, sub] = r;
  const n = Number(r.at(-1));
  assert(Number.isFinite(n), `bad estimate in ${r.join(",")}`);
  if (level === "162") placePeople.set(sfp + pfp, n);
  else if (level === "157" && sfp !== CONNECTICUT) {
    const k = (MERGED[sfp + cfp] ?? sfp + cfp) + pfp;
    partPeople.set(k, (partPeople.get(k) ?? 0) + n);
  } else if (level === "061") townPeople.set(sfp === CONNECTICUT ? sfp + sub : sfp + cfp + sub, n);
}

// Rule 1: a Census name to the names people write.
const TYPE = / (?:charter township|metro township|metropolitan government|metro government|unified government|consolidated government|urban county|city and borough|municipality|corporation|plantation|township|borough|village|city|town|CDP)$/;
function namesOf(ab, raw) {
  // Massachusetts's towns with a city government are "Amherst Town city".
  const type = ab === "MA" && / Town city$/.test(raw) ? / Town city$/ : TYPE;
  // A letter the file lost is a "?": "Utqiag?vik" is Utqiaġvik.
  const s = raw.replace(/\?/g, "").replace(/ \(balance\)$/, "").replace(type, "").replace(/^Urban /, "");
  const alt = s.match(/^(.*?) \((.+)\)$/);
  const names = (alt ? [alt[1], alt[2]] : [s]).flatMap((n) => n.split("/")).map((n) => n.split(",")[0]);
  return [...new Set(names.map(normalizePlace))].filter((n) => n.length >= 3 && !STOP.has(n));
}

const review = { multiCdp: [], noParts: [], contestedKept: [], contestedDropped: [], likeCounty: [], likeCountyKept: [] };
const fmtN = (n) => (n == null ? "?" : n.toLocaleString("en-US"));

// Every place of the generated states, once each, in the county with most of its people.
const ENTRIES = Object.fromEntries(CODES.map((ab) => [ab, []])); // { name, fips, kind, people, raw }
const PLACES = new Map();
for (const [ab, sfp, cfp, , pfp, , raw, type] of pipes("places", placeBuf)) {
  if (!CODES.includes(ab) || HAND.has(ab)) continue;
  const id = sfp + pfp;
  const p = PLACES.get(id) ?? { ab, pfp, raw, cdp: type !== "INCORPORATED PLACE", counties: new Set() };
  p.counties.add(MERGED[sfp + cfp] ?? sfp + cfp);
  PLACES.set(id, p);
}
let multi = 0;
for (const [id, p] of PLACES) {
  let fips = [...p.counties][0];
  if (p.counties.size > 1) {
    multi++;
    // Rule 3. A CDP in several counties has no count of people in each.
    const parts = p.ab === "CT" ? [] : [...p.counties].map((f) => [f, partPeople.get(f + p.pfp)]).filter(([, n]) => n != null);
    if (!parts.length) {
      (p.cdp ? review.multiCdp : review.noParts).push(`${p.ab} ${p.raw} (${[...p.counties].join(" ")})`);
      continue;
    }
    fips = parts.sort((a, b) => b[1] - a[1])[0][0];
  }
  const people = p.cdp ? null : (placePeople.get(id) ?? null);
  for (const name of namesOf(p.ab, p.raw)) ENTRIES[p.ab].push({ name, fips, kind: p.cdp ? "cdp" : "place", people, raw: p.raw });
}

// Rule 6: towns and townships.
let towns = 0;
for (const [ab, sfp, cfp, , sub, , raw, cls] of pipes("cousubs", cousubBuf)) {
  if (!TOWNSHIPS.has(ab) || !TOWNSHIP_CLASSES.has(cls)) continue;
  towns++;
  const people = townPeople.get(ab === "CT" ? sfp + sub : sfp + cfp + sub) ?? null;
  for (const name of namesOf(ab, raw)) ENTRIES[ab].push({ name, fips: sfp + cfp, kind: "town", people, raw });
}

// Rules 4 and 5: one county per name, or none.
const KEPT = new Map(); // fips → [{ name, people }]
const GEN = Object.fromEntries(CODES.map((ab) => [ab, new Map()])); // name → fips
let names = 0;
for (const ab of CODES) {
  const byName = new Map();
  for (const e of ENTRIES[ab]) byName.set(e.name, [...(byName.get(e.name) ?? []), e]);
  for (const [name, list] of byName) {
    const counties = new Set(list.map((e) => e.fips));
    let fips;
    let people;
    const desc = (es) => es.map((e) => `${e.raw} [${COUNTY.get(e.fips).label}] ${fmtN(e.people)}`).join("; ");
    if (counties.size === 1) {
      fips = list[0].fips;
      people = Math.max(...list.map((e) => e.people ?? 0));
    } else {
      const [w] = list.filter((e) => e.kind !== "cdp" && (e.people ?? 0) >= 10000).sort((a, b) => b.people - a.people);
      const others = w ? list.filter((e) => e.fips !== w.fips).reduce((a, e) => a + (e.people ?? 0), 0) : 0;
      if (!w || w.people < 5 * others) {
        review.contestedDropped.push(`${ab} ${name}: ${desc(list)}`);
        continue;
      }
      review.contestedKept.push(`${ab} ${name} → ${COUNTY.get(w.fips).label}: ${desc(list)}`);
      fips = w.fips;
      people = w.people;
    }
    const like = COUNTY_KEYS[ab].get(key(name));
    if (like && like !== fips) {
      const line = `${ab} ${name} → ${COUNTY.get(fips).label} (${fmtN(people)}), like ${COUNTY.get(like).label}`;
      if (people < 50000) {
        review.likeCounty.push(line);
        continue;
      }
      review.likeCountyKept.push(line);
    }
    names++;
    GEN[ab].set(name, fips);
    KEPT.set(fips, [...(KEPT.get(fips) ?? []), { name, people }]);
  }
}

// us.json, one county per line.
const byShort = new Intl.Collator("en");
const lines = ["{"];
CODES.forEach((ab, i) => {
  const rows = [...COUNTY.values()].filter((c) => c.ab === ab).sort((a, b) => byShort.compare(a.name, b.name));
  lines.push(`${JSON.stringify(ab)}: {"fp": ${JSON.stringify(FP[ab])}, "kind": ${JSON.stringify(KIND(ab)).replace(/,/g, ", ")}, "counties": [`);
  rows.forEach((c, j) => {
    const places = (KEPT.get(c.fips) ?? [])
      .sort((a, b) => (b.people ?? -1) - (a.people ?? -1) || byShort.compare(a.name, b.name))
      .map((p) => p.name)
      .join("|");
    const row = [c.fips.slice(2), c.name, c.label, places].map((v) => JSON.stringify(v)).join(", ");
    lines.push(`[${row}]${j < rows.length - 1 ? "," : ""}`);
  });
  lines.push(`]}${i < CODES.length - 1 ? "," : ""}`);
});
lines.push("}");
writeFileSync(OUT, `${lines.join("\n")}\n`);
const written = JSON.parse(readFileSync(OUT, "utf8"));
assert(Object.keys(written).length === 50, "us.json must list 50 states");
const writtenIds = Object.values(written).flatMap((s) => s.counties.map(([fp]) => s.fp + fp));
assert(
  writtenIds.length === MAP_IDS.size && new Set(writtenIds).size === MAP_IDS.size && writtenIds.every((id) => MAP_IDS.has(id)),
  "us.json must list exactly the map's 3,141 counties",
);
console.log(`wrote src/counties/us.json: ${COUNTY.size} counties, ${PLACES.size} places (${multi} in more than one county) and ${towns} towns, ${names} names`);

// The review.
const out = [
  `County review, ${new Date().toISOString().slice(0, 10)}. Made by scripts/make-counties.mjs.`,
  "",
  `${COUNTY.size} counties. ${PLACES.size} places in the 45 generated states, ${multi} of them in more than one county; ${towns} towns and townships; ${names} names kept.`,
  "",
];
const section = (title, list) => out.push(`## ${title} (${list.length})`, "", ...list, "");

// The aliases, against what the Census gave.
const aliasNotes = [];
for (const [ab, m] of Object.entries(ALIASES)) {
  for (const [name, fips] of Object.entries(m)) {
    assert(normalizePlace(name) === name, `alias ${ab} "${name}" is not normalized`);
    assert(fips === null || COUNTY.get(fips)?.ab === ab, `alias ${ab} "${name}" → ${fips} is not a county of ${ab}`);
    const genFips = GEN[ab].get(name);
    if (genFips && genFips === fips) aliasNotes.push(`${ab} ${name}: same as the Census places (${COUNTY.get(fips).label})`);
    else if (genFips) aliasNotes.push(`${ab} ${name}: ${fips ? COUNTY.get(fips).label : "none"}, where the Census places say ${COUNTY.get(genFips).label}`);
  }
}
section("Aliases that repeat or override a generated place", aliasNotes);

// Replay the county match over everyone placed.
const profilesFile = new URL("../data/profiles.json", import.meta.url);
if (existsSync(profilesFile)) {
  const { countyOf, countyLabel } = await import("../src/counties.mjs");
  const { place } = await import("../src/states.mjs");
  const profiles = JSON.parse(readFileSync(profilesFile, "utf8"));
  const stats = Object.fromEntries(CODES.map((ab) => [ab, { placed: 0, county: 0, more: 0, moreCounty: 0 }]));
  const unmatched = new Map();
  const unmatchedPieces = new Map();
  const pairs = [];
  // Whether a location says more than its state: anything left without the state, ZIP, and country.
  const more = (ab, loc) => {
    const self = new Set([ab.toLowerCase(), normalizePlace(NAME_OF[ab]), `${normalizePlace(NAME_OF[ab])} state`]);
    return loc
      .replace(/\b\d{5}(?:-\d{4})?\b/g, " ")
      .replace(/(?<![a-z])(?:usa|u\.s\.a\.?|u\.s\.|united\s+states?(?:\s+of\s+america)?)(?![a-z])/gi, " ")
      .replace(/\bUS\b/g, " ")
      .split(/[,;|/•·()[\]]|\s+-\s+|[–—]/)
      .map(normalizePlace)
      .filter((p) => p && !self.has(p));
  };
  const t0 = performance.now();
  for (const [login, p] of Object.entries(profiles).sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const loc = p?.location?.trim();
    const r = loc ? place(loc) : null;
    if (!r) continue;
    const s = stats[r.state];
    const fips = countyOf(r.state, loc);
    const rest = more(r.state, loc);
    s.placed++;
    if (fips) s.county++;
    if (rest.length) {
      s.more++;
      if (fips) s.moreCounty++;
      else {
        const k = loc.toLowerCase().replace(/\s+/g, " ");
        unmatched.set(k, (unmatched.get(k) ?? 0) + 1);
        // What a new alias might fix: not the hand-written states, nor a region set to none.
        if (!HAND.has(r.state) && ALIASES[r.state]?.[rest.at(-1)] !== null) {
          const piece = `${r.state} ${rest.at(-1)}`;
          unmatchedPieces.set(piece, (unmatchedPieces.get(piece) ?? 0) + 1);
        }
      }
    }
    if (fips) pairs.push(`${loc}  →  ${countyLabel(fips)}, ${r.state}`);
  }
  const ms = performance.now() - t0;
  const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : "-");
  const total = Object.values(stats).reduce((a, s) => ({ placed: a.placed + s.placed, county: a.county + s.county, more: a.more + s.more, moreCounty: a.moreCounty + s.moreCounty }), { placed: 0, county: 0, more: 0, moreCounty: 0 });
  section(
    `By state: placed, with a county, and with a county among those whose location says more than the state (${Math.round(ms)} ms for the match and placement)`,
    [
      ...CODES.map((ab) => {
        const s = stats[ab];
        return `${ab}${HAND.has(ab) ? "*" : " "} ${String(s.placed).padStart(5)} ${String(s.county).padStart(5)} ${pct(s.county, s.placed).padStart(6)}   ${String(s.more).padStart(5)} ${pct(s.moreCounty, s.more).padStart(6)}`;
      }),
      `all ${String(total.placed).padStart(5)} ${String(total.county).padStart(5)} ${pct(total.county, total.placed).padStart(6)}   ${String(total.more).padStart(5)} ${pct(total.moreCounty, total.more).padStart(6)}`,
      "(* a hand-written state)",
    ],
  );
  const top = (m, n) => [...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n).map(([k, v]) => `${String(v).padStart(4)}  ${k}`);
  section("The 30 commonest locations that say more than the state, with no county", top(unmatched, 30));
  section("The 150 commonest last pieces with no county in the generated states, not counting regions an alias sets to none", top(unmatchedPieces, 150));
  // A seeded sample, the same each run for the same profiles.
  let seed = 19;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const sample = [];
  for (let i = 0; i < 200 && pairs.length; i++) sample.push(pairs.splice(Math.floor(rand() * pairs.length), 1)[0]);
  section("200 random matches", sample);
}

section("Places in several counties with no count of people in each (left out)", review.multiCdp.concat(review.noParts));
section("Names shared across counties, kept for the biggest", review.contestedKept);
section("Names shared across counties, left out", review.contestedDropped);
section("Places named like another county, left out", review.likeCounty);
section("Places named like another county, kept (50,000 people or more)", review.likeCountyKept);
writeFileSync(REVIEW, out.join("\n"));
console.log(`review: ${REVIEW}`);
