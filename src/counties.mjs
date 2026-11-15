// Counties, for the states that list them: which county a location in one of those states names,
// and the place names that mean that state on their own. Louisiana's counties are parishes.
// Each state has one file in src/counties/, in the same shape:
//
//   STATE     its two-letter code
//   KIND      what it calls its counties, one and many: ["parish", "parishes"]
//   COUNTIES  every county's name
//   PLACES    town, city, or university → its county
//   ONLY      place names that mean this state and nowhere else
//
// To add a state, write its file and add it to STATES below. Everyone active in a state listed
// here has their contributions looked up (scripts/collect.mjs), and the page gets its county view.
import * as LA from "./counties/la.mjs";

const STATES = [LA];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
// "St." may also be written "St" or "Saint".
const saint = (s) => esc(s).replace(/\bSt\\\./g, "(?:St\\.?|Saint)");
// What follows a county's name: "Caddo Parish", "Hinds County", "Hinds Co.".
const suffix = ([one]) => (one === "county" ? "(?:County\\b|Co\\.)" : `${one[0].toUpperCase()}${one.slice(1)}\\b`);
const longestFirst = (names) => [...names].sort((a, b) => b.length - a.length);

const BY = Object.fromEntries(
  STATES.map((s) => [
    s.STATE,
    {
      kind: s.KIND,
      names: s.COUNTIES,
      counties: longestFirst(s.COUNTIES).map((c) => [new RegExp(`\\b${saint(c)}\\s+${suffix(s.KIND)}`, "i"), c]),
      places: longestFirst(Object.keys(s.PLACES)).map((name) => [new RegExp(`\\b${saint(name)}\\b`, "i"), s.PLACES[name]]),
      only: new RegExp(`\\b(?:${s.ONLY.map(saint).join("|")})\\b`, "i"),
    },
  ]),
);

/** The states with county lists, by two-letter code. */
export const COUNTY_STATES = STATES.map((s) => s.STATE);
export const hasCounties = (state) => Object.hasOwn(BY, state);
/** Every county's name, or none for a state without a list. */
export const countiesOf = (state) => BY[state]?.names ?? [];
/** What a state calls its counties, one and many: ["parish", "parishes"]. */
export const countyKind = (state) => BY[state]?.kind ?? null;
/** Place names that mean this state and nowhere else, as one pattern. */
export const onlyTownsRe = (state) => BY[state]?.only ?? null;

/** The county for a location already placed in the state, or null when it names only the state. */
export function countyOf(state, location) {
  const s = BY[state];
  if (!s) return null;
  const loc = location ?? "";
  for (const [re, c] of s.counties) if (re.test(loc)) return c;
  for (const [re, c] of s.places) if (re.test(loc)) return c;
  return null;
}
