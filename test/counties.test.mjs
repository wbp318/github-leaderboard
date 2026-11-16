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

  // Alabama's counties. A county named in full wins, then the longest place; a city in two
  // counties is in its principal one, and a town named like another county is left out.
  ["AL", "Huntsville, AL", "Madison"],
  ["AL", "Huntsville / Madison, AL", "Madison"],
  ["AL", "The University of Alabama in Huntsville", "Madison"],
  ["AL", "Redstone Arsenal, AL", "Madison"],
  ["AL", "Birmingham, AL", "Jefferson"],
  ["AL", "University of Alabama at Birmingham", "Jefferson"],
  ["AL", "Hoover, AL", "Jefferson"],
  ["AL", "Pelham, AL", "Shelby"],
  ["AL", "Shelby County, Alabama", "Shelby"],
  ["AL", "The University of Alabama", "Tuscaloosa"],
  ["AL", "Tuscaloosa, AL", "Tuscaloosa"],
  ["AL", "Auburn, Alabama state", "Lee"],
  ["AL", "Auburn University at Montgomery", "Montgomery"],
  ["AL", "Maxwell AFB, AL", "Montgomery"],
  ["AL", "Mobile, AL", "Mobile"],
  ["AL", "Fairhope, Alabama", "Baldwin"],
  ["AL", "San Diego, California / Fairhope, Alabama", "Baldwin"],
  ["AL", "Dothan, AL", "Houston"],
  ["AL", "Ft. Rucker, Alabama", "Dale"],
  ["AL", "Phenix City, Alabama", "Russell"],
  ["AL", "Jacksonville, Alabama, 36265", "Calhoun"],
  ["AL", "Muscle Shoals, AL", "Colbert"],
  ["AL", "Decatur, Alabama", "Morgan"],
  ["AL", "Jackson County, AL", "Jackson"],
  ["AL", "Jackson, AL", ""],
  ["AL", "Marion County, Alabama", "Marion"],
  ["AL", "Saint Clair County, AL", "St. Clair"],
  ["AL", "De Kalb County, Alabama", "DeKalb"],
  ["AL", "Tennessee Valley, Alabama", ""],
  ["AL", "North Alabama", ""],
  ["AL", "Alabama", ""],

  // Arkansas's counties. A county named in full wins over a town of the same name.
  ["AR", "Little Rock, AR", "Pulaski"],
  ["AR", "North Little Rock, Arkansas", "Pulaski"],
  ["AR", "University of Arkansas for Medical Sciences", "Pulaski"],
  ["AR", "University of Arkansas at Little Rock", "Pulaski"],
  ["AR", "University of Arkansas", "Washington"],
  ["AR", "Fayetteville, AR", "Washington"],
  ["AR", "Springdale, AR", "Washington"],
  ["AR", "Bentonville, Arkansas", "Benton"],
  ["AR", "Benton County, Arkansas", "Benton"],
  ["AR", "Benton, AR", ""],
  ["AR", "Conway, Arkansas", "Faulkner"],
  ["AR", "Conway County, AR", "Conway"],
  ["AR", "Morrilton, AR", "Conway"],
  ["AR", "Searcy, AR", "White"],
  ["AR", "Searcy County, Arkansas", "Searcy"],
  ["AR", "Van Buren, AR", "Crawford"],
  ["AR", "Hot Springs, Arkansas", "Garland"],
  ["AR", "Hot Spring County, AR", "Hot Spring"],
  ["AR", "Hot Springs Village, Arkansas", "Garland"],
  ["AR", "Stuttgart, AR", "Arkansas"],
  ["AR", "Arkansas County, AR", "Arkansas"],
  ["AR", "Blytheville, Mississippi County, Arkansas", "Mississippi"],
  ["AR", "Saint Francis County, AR", "St. Francis"],
  ["AR", "Little River County, AR", "Little River"],
  ["AR", "Arkansas State University", "Craighead"],
  ["AR", "Arkansas Tech University", "Pope"],
  ["AR", "Texarkana, AR", "Miller"],
  ["AR", "Northwest Arkansas", ""],
  ["AR", "Arkansas", ""],
  ["AR", "Arkansas, USA", ""],

  // Tennessee's counties. A city in two counties is in its principal one.
  ["TN", "Nashville, TN", "Davidson"],
  ["TN", "Greater Nashville Area, TN", "Davidson"],
  ["TN", "Davidson County, Tennessee", "Davidson"],
  ["TN", "Franklin, TN", "Williamson"],
  ["TN", "Franklin County, TN", "Franklin"],
  ["TN", "Franklin Co., Tennessee", "Franklin"],
  ["TN", "Winchester, TN", "Franklin"],
  ["TN", "Jackson, TN", "Madison"],
  ["TN", "Jackson County, Tennessee", "Jackson"],
  ["TN", "Union University, Jackson, TN", "Madison"],
  ["TN", "Murfreesboro, Tennessee", "Rutherford"],
  ["TN", "Middle Tennessee State University", "Rutherford"],
  ["TN", "Tennessee State University", "Davidson"],
  ["TN", "East Tennessee State University", "Washington"],
  ["TN", "Mt Juliet, TN", "Wilson"],
  ["TN", "Mount Juliet, Tennessee", "Wilson"],
  ["TN", "Oak Ridge, TN", "Anderson"],
  ["TN", "Oak Ridge National Laboratory, Oak Ridge, TN", "Roane"],
  ["TN", "ORNL", "Roane"],
  ["TN", "Spring Hill, TN", "Maury"],
  ["TN", "Kingsport, Tennessee", "Sullivan"],
  ["TN", "Johnson City, TN", "Washington"],
  ["TN", "University of Tennessee, Knoxville", "Knox"],
  ["TN", "University of Tennessee at Chattanooga", "Hamilton"],
  ["TN", "University of Tennessee Health Science Center", "Shelby"],
  ["TN", "UT Martin, TN", "Weakley"],
  ["TN", "Germantown, TN", "Shelby"],
  ["TN", "Arnold AFB, TN", "Coffee"],
  ["TN", "De Kalb County, TN", "DeKalb"],
  ["TN", "Van Buren County, TN", "Van Buren"],
  ["TN", "The Secret City, Tennessee", "Anderson"],
  ["TN", "East Tennessee", ""],
  ["TN", "Middle Tennessee, USA", ""],
  ["TN", "Tri-Cities, Tennessee", ""],
  ["TN", "Tennessee", ""],
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

test("Alabama has 67 counties", () => {
  assert.equal(new Set(countiesOf("AL")).size, 67);
  assert.deepEqual(countyKind("AL"), ["county", "counties"]);
});

test("Arkansas has 75 counties", () => {
  assert.equal(new Set(countiesOf("AR")).size, 75);
  assert.deepEqual(countyKind("AR"), ["county", "counties"]);
});

test("Tennessee has 95 counties", () => {
  assert.equal(new Set(countiesOf("TN")).size, 95);
  assert.deepEqual(countyKind("TN"), ["county", "counties"]);
});
