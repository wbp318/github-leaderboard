// Counties for all 50 states: which county a location in a state names, as a 5-digit FIPS code
// ("48453" is Travis County, Texas), and the place names that mean a state on their own.
// Louisiana's counties are parishes, and Alaska's boroughs.
//
// Every county, with its FIPS code, short name ("Travis"), and full label ("Travis County"), is in
// src/counties/us.json, made from Census files by scripts/make-counties.mjs. Two kinds of state:
//
//   - Louisiana, Mississippi, Alabama, Arkansas, and Tennessee have hand-written files in src/counties/,
//     each in the same shape:
//       STATE     its two-letter code
//       KIND      what it calls its counties, one and many: ["parish", "parishes"]
//       COUNTIES  every county's short name
//       PLACES    town, city, or university → its county
//       ONLY      place names that mean this state and nowhere else (src/states.mjs places people by them)
//   - The other 45 take their place names from us.json, which the script generates from the Census
//     list of places in each county, with hand fixes in src/counties/aliases.mjs.
import { readFileSync } from "node:fs";
import * as AL from "./counties/al.mjs";
import * as AR from "./counties/ar.mjs";
import * as LA from "./counties/la.mjs";
import * as MS from "./counties/ms.mjs";
import * as TN from "./counties/tn.mjs";
import { ALIASES, STOP } from "./counties/aliases.mjs";

// The hand-written states, in the order their ONLY lists are tried.
const HAND = [LA, MS, AL, AR, TN];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
// "St." may also be written "St" or "Saint".
const saint = (s) => esc(s).replace(/\bSt\\\./g, "(?:St\\.?|Saint)");
// What follows a county's name: "Caddo Parish", "Hinds County", "Hinds Co.".
const suffix = ([one]) => (one === "county" ? "(?:County\\b|Co\\.)" : `${one[0].toUpperCase()}${one.slice(1)}\\b`);
const longestFirst = (names) => [...names].sort((a, b) => b.length - a.length);

const BY = Object.fromEntries(
  HAND.map((s) => [
    s.STATE,
    {
      counties: longestFirst(s.COUNTIES).map((c) => [new RegExp(`\\b${saint(c)}\\s+${suffix(s.KIND)}`, "i"), c]),
      places: longestFirst(Object.keys(s.PLACES)).map((name) => [new RegExp(`\\b${saint(name)}\\b`, "i"), s.PLACES[name]]),
      // An empty list must match nothing: as a pattern, "\b(?:)\b" would match any location at all.
      only: s.ONLY.length ? new RegExp(`\\b(?:${s.ONLY.map(saint).join("|")})\\b`, "i") : null,
    },
  ]),
);

// A hand-written state's county, by its short name, or null.
function handCounty(state, loc) {
  const s = BY[state];
  for (const [re, c] of s.counties) if (re.test(loc)) return c;
  for (const [re, c] of s.places) if (re.test(loc)) return c;
  return null;
}

/** Every state, by two-letter code, in the order of NAMES in src/states.mjs (by state name). */
export const COUNTY_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY",
  "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND",
  "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];
const HAS = new Set(COUNTY_STATES);
/** The states with place names that mean them alone, in the order those are tried. A state is
 * added here only with care: its names can move people from "no state" into it. */
export const ONLY_STATES = HAND.filter((s) => s.ONLY.length).map((s) => s.STATE);
export const hasCounties = (state) => HAS.has(state);
/** Place names that mean this state and nowhere else, as one pattern, or null for none. */
export const onlyTownsRe = (state) => BY[state]?.only ?? null;

/** A place name as the county lists keep it: accents folded, lowercase, "Saint" as "st", "Fort" as
 * "ft", "Mount" as "mt", no periods or apostrophes, and other punctuation as single spaces.
 * "St. Mary's" and "Saint Marys" are both "st marys"; "Winston-Salem" is "winston salem". */
export function normalizePlace(s) {
  return fold(s ?? "")
    .toLowerCase()
    .replace(/[.'’‘`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\b(?:saint|sainte|fort|mount)\b/g, (w) => WORDS[w]);
}
const WORDS = { saint: "st", sainte: "ste", fort: "ft", mount: "mt" };
const fold = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// Names compared without spaces too, so "De Soto" is "DeSoto" and "La Salle" is "LaSalle".
const key = (name) => normalizePlace(name).replace(/ /g, "");

// src/counties/us.json, read on first use (the script that writes it uses normalizePlace).
let US = null;
const COUNTY = new Map(); // FIPS → { state, name, label }
function us() {
  if (US) return US;
  US = JSON.parse(readFileSync(new URL("./counties/us.json", import.meta.url), "utf8"));
  for (const [state, s] of Object.entries(US)) {
    for (const [fp, name, label] of s.counties) COUNTY.set(s.fp + fp, { state, name, label });
  }
  return US;
}

/** Every county's FIPS code, by short name, or none for an unknown state. */
export const countiesOf = (state) => (us()[state]?.counties ?? []).map(([fp]) => US[state].fp + fp);
/** What a state calls its counties, one and many: ["parish", "parishes"]. */
export const countyKind = (state) => us()[state]?.kind ?? null;
/** A county's short name ("Travis", "Richmond city"), its full label ("Travis County"), its state. */
export const countyName = (fips) => (us(), COUNTY.get(fips)?.name ?? null);
export const countyLabel = (fips) => (us(), COUNTY.get(fips)?.label ?? null);
export const countyState = (fips) => (us(), COUNTY.get(fips)?.state ?? null);

// What follows a county's name when it is written in full, by the kind of county it is.
const SUFFIXES = [
  [" County", "county"], [" Parish", "parish"], [" City and Borough", "city and borough"], [" Borough", "borough"],
  [" Census Area", "census area"], [" Municipality", "municipality"], [" city", "city"],
];
const suffixClass = (written) => {
  const s = written.toLowerCase().replace(/\s+/g, " ").replace(/\.$/, "");
  return s === "co" ? "county" : s;
};
// A county's name as a pattern: "St." as "St", "St." or "Saint", "Fort" also as "Ft.", hyphens also as
// spaces, apostrophes optional, and "De Kalb" or "DeKalb" either way.
const namePattern = (name) =>
  fold(name)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/^(De|Du|La|Le|Mc) ?(?=[A-Z])/, "$1 ")
    .replace(/\bSt\\\.(?= )/g, "(?:st\\.?|saint)")
    .replace(/\bSte\\\.(?= )/g, "(?:ste\\.?|sainte)")
    .replace(/\bFort\b/g, "(?:fort|ft\\.?)")
    .replace(/\bMount\b/g, "(?:mount|mt\\.?)")
    .replace(/'/g, "['’]?")
    .replace(/-/g, "[-\\s]*")
    .replace(/^(De|Du|La|Le|Mc) /, "$1\\s*")
    .replace(/ /g, "\\s+");

// The lookups for one state, built on first use.
const LOOKUPS = new Map();
function lookups(state) {
  let l = LOOKUPS.get(state);
  if (l) return l;
  const s = us()[state];
  l = { fips: new Map() };
  if (BY[state]) {
    // A hand-written state: its county names to FIPS.
    for (const [fp, name] of s.counties) l.fips.set(key(name), s.fp + fp);
  } else {
    // A county named in full: "Travis County", "Richmond City", "Kenai Peninsula Borough".
    const names = new Map();
    for (const [fp, , label] of s.counties) {
      const hit = SUFFIXES.find(([end]) => label.endsWith(end));
      if (!hit) continue; // Carson City: its name is a place name too.
      const name = label.slice(0, -hit[0].length);
      l.fips.set(`${key(name)}|${hit[1]}`, s.fp + fp);
      names.set(name, namePattern(name));
    }
    const pats = [...names].sort((a, b) => b[0].length - a[0].length).map(([, p]) => p);
    l.full = new RegExp(
      `\\b(${pats.join("|")})\\s+(county\\b|co\\b\\.?|parish\\b|city\\s+and\\s+borough\\b|borough\\b|census\\s+area\\b|municipality\\b|city\\b)`,
      "gi",
    );
    // Place names, and the state's own names to drop.
    l.places = new Map();
    for (const [fp, , , places] of s.counties) {
      if (places) for (const p of places.split("|")) l.places.set(p, s.fp + fp);
    }
    l.aliases = new Map(Object.entries(ALIASES[state] ?? {}));
    const name = normalizePlace(STATE_NAMES[state]);
    const code = state.toLowerCase();
    l.self = new Set([code, name, `${name} state`, `state of ${name}`, `commonwealth of ${name}`]);
    l.stuck = new RegExp(`\\s+(?:${code}|${name}(?: state)?)$`);
  }
  LOOKUPS.set(state, l);
  return l;
}

// The states' names, for dropping a person's own state from their location. NAMES in src/states.mjs
// has them too, but src/states.mjs imports this file.
const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
  DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming",
};

// Before a location is split into pieces: ZIP codes, the country, and Washington, D.C. (not a state).
const DROP = [
  /\b\d{5}(?:-\d{4})?\b/g,
  /(?<![a-z])(?:usa|u\.s\.a\.?|u\.s\.|united\s+states?(?:\s+of\s+america)?)(?![a-z])/gi,
  /\bUS\b/g,
  /washington,?\s*d\.?\s*c\.?|district of columbia/gi,
];
const PIECES = /[,;|\/•·()[\]]|\s+-\s+|[–—]/;
// "Greater Boston Area" is Boston, and "Metro Atlanta" Atlanta.
const tidy = (piece) => {
  let p = piece.replace(/^(?:greater|city of|metro) /, "");
  for (let was = ""; was !== p; ) {
    was = p;
    p = p.replace(/ (?:metropolitan area|metro area|area|metro|metropolitan)$/, "");
  }
  return p;
};

// The county a piece of a location names: an alias first, then a place. undefined for neither.
function pieceCounty(l, piece) {
  const forms = [...new Set([piece, tidy(piece)])];
  for (const f of forms) if (l.aliases.has(f)) return l.aliases.get(f);
  for (const f of forms) if (l.places.has(f)) return l.places.get(f);
  return undefined;
}

/** The county for a location already placed in the state, as a FIPS code, or null when it names
 * only the state.
 *
 * In Louisiana, Mississippi, Alabama, Arkansas, and Tennessee: a county named in full wins, then the
 * longest place named anywhere in the location, from the state's file.
 * In the other states: a county named in full wins ("Travis County", "Baltimore City"). Otherwise
 * the location is split into pieces at commas and the like, the person's own state, ZIP code, and
 * country dropped, and the one or two pieces nearest the end are looked up, nearest first, as a
 * whole: an alias, or a place name. "Austin, TX" is Travis County; "Remote, OR" is none. */
export function countyOf(state, location) {
  if (!HAS.has(state)) return null;
  const loc = location ?? "";
  const l = lookups(state);
  if (BY[state]) {
    const name = handCounty(state, loc);
    return name ? l.fips.get(key(name)) : null;
  }

  // 1. A county named in full; the longest name wins.
  let best = null;
  for (const m of fold(loc).matchAll(l.full)) {
    if (m[2] === "CO") continue; // "Denver CO" is the state's code, not "Co."
    const fips = l.fips.get(`${key(m[1])}|${suffixClass(m[2])}`);
    if (fips && (!best || m[1].length > best.len)) best = { fips, len: m[1].length };
  }
  if (best) return best.fips;

  // 2. The location in pieces, without the state itself. "New York, NY" keeps its city.
  let rest = loc;
  for (const re of DROP) rest = rest.replace(re, " ");
  const all = rest.split(PIECES).map(normalizePlace).filter(Boolean);
  let pieces = all.filter((p) => !l.self.has(p));
  if (!pieces.length && all.length > 1) pieces = [all[0]];
  pieces = pieces.filter((p) => !STOP.has(p) && !STOP.has(tidy(p)));

  // 3. The two pieces nearest the state, nearest first.
  for (const piece of pieces.slice(-2).reverse()) {
    let c = pieceCounty(l, piece);
    if (c === undefined && l.stuck.test(piece)) c = pieceCounty(l, piece.replace(l.stuck, ""));
    if (c !== undefined) return c;
  }
  return null;
}
