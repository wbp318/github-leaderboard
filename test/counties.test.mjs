// Which county a location names, for the states with county lists (src/counties.mjs). These run
// only for people already placed in the state. Found one wrong? Add it here with the right county
// ("" for "names no county"), then change the state's file in src/counties/.
import assert from "node:assert/strict";
import { test } from "node:test";
import { COUNTY_STATES, countiesOf, countyKind, countyOf } from "../src/counties.mjs";

const CASES = [
  // Louisiana's parishes: a parish named in full wins, then the longest town.
  ["LA", "New Orleans, LA", "Orleans"],
  ["LA", "Shreveport, Louisiana", "Caddo"],
  ["LA", "East Carroll Parish, Louisiana", "East Carroll"],
  ["LA", "West Monroe, LA", "Ouachita"],
  ["LA", "Monroe, LA", "Ouachita"],
  ["LA", "Saint Tammany Parish", "St. Tammany"],
  ["LA", "St Francisville, LA", "West Feliciana"],
  ["LA", "Louisiana State University", "East Baton Rouge"],
  ["LA", "Louisiana", ""],
  ["LA", "Louisiana, USA", ""],

  // Mississippi's counties. A city in two counties is in its principal one.
  ["MS", "Jackson, MS", "Hinds"],
  ["MS", "Greater Jackson Area, Mississippi", "Hinds"],
  ["MS", "Jackson County, MS", "Jackson"],
  ["MS", "Jackson Co., Mississippi", "Jackson"],
  ["MS", "Pascagoula, MS", "Jackson"],
  ["MS", "Hattiesburg, MS", "Forrest"],
  ["MS", "West Hattiesburg, Mississippi", "Lamar"],
  ["MS", "Forrest County, MS", "Forrest"],
  ["MS", "Oxford, MS", "Lafayette"],
  ["MS", "Ole Miss", "Lafayette"],
  ["MS", "University of Mississippi", "Lafayette"],
  ["MS", "University of Mississippi Medical Center", "Hinds"],
  ["MS", "325 Wise Center Drive, Mississippi State, MS 39762", "Oktibbeha"],
  ["MS", "Starkville, Mississippi", "Oktibbeha"],
  ["MS", "University of Southern Mississippi", "Forrest"],
  ["MS", "Jackson State University", "Hinds"],
  ["MS", "Southaven, MS", "DeSoto"],
  ["MS", "Desoto County, Mississippi", "DeSoto"],
  ["MS", "De Soto County, MS", "DeSoto"],
  ["MS", "Pearl, MS", "Rankin"],
  ["MS", "Pearl River County, MS", "Pearl River"],
  ["MS", "Picayune, MS", "Pearl River"],
  ["MS", "Bay Saint Louis, MS", "Hancock"],
  ["MS", "Jefferson Davis County, MS", "Jefferson Davis"],
  ["MS", "Jefferson County, MS", "Jefferson"],
  ["MS", "Columbus, MS", "Lowndes"],
  ["MS", "Tupelo, MS", "Lee"],
  ["MS", "Biloxi, Mississippi", "Harrison"],
  ["MS", "Mississippi Gulf Coast", ""],
  ["MS", "Golden Triangle, Mississippi", ""],
  ["MS", "Mississippi", ""],
];

for (const [state, location, want] of CASES) {
  test(`${JSON.stringify(location)} is in ${want || "no county"} (${state})`, () => {
    assert.equal(countyOf(state, location) ?? "", want);
  });
}

test("a state without a county list has no county", () => {
  assert.equal(countyOf("TX", "Austin, TX"), null);
});

for (const state of COUNTY_STATES) {
  test(`${state}: every place is in a listed ${countyKind(state)[0]}`, async () => {
    const { PLACES } = await import(`../src/counties/${state.toLowerCase()}.mjs`);
    const names = new Set(countiesOf(state));
    for (const [place, county] of Object.entries(PLACES)) assert.ok(names.has(county), `${place} → ${county}`);
  });
}

test("Louisiana has 64 parishes", () => {
  assert.equal(countiesOf("LA").length, 64);
  assert.deepEqual(countyKind("LA"), ["parish", "parishes"]);
});

test("Mississippi has 82 counties", () => {
  assert.equal(new Set(countiesOf("MS")).size, 82);
  assert.deepEqual(countyKind("MS"), ["county", "counties"]);
});
