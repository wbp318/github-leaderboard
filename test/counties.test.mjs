// Which county a location names (src/counties.mjs). These run only for people already placed in
// the state. Found one wrong? Add it here with the right county ("" for "names no county"), then
// change the state's file in src/counties/, or for the other 45 states src/counties/aliases.mjs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  COUNTY_STATES, ONLY_STATES, countiesOf, countyKind, countyLabel, countyName, countyOf, countyState, hasCounties,
  normalizePlace, onlyTownsRe,
} from "../src/counties.mjs";
import { ALIASES, STOP } from "../src/counties/aliases.mjs";
import { NAMES } from "../src/states.mjs";

// The hand-written states, by short name.
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
    assert.equal(countyName(countyOf(state, location)) ?? "", want);
  });
}

// The other 45 states, by FIPS code, from Census place names and src/counties/aliases.mjs.
const GENERATED = [
  // New York City: five boroughs, five counties.
  ["NY", "New York City", "36061"],
  ["NY", "NYC", "36061"],
  ["NY", "New York, NY", "36061"],
  ["NY", "New York, New York, USA", "36061"],
  ["NY", "Greater New York City Area", "36061"],
  ["NY", "Manhattan, New York, NY", "36061"],
  ["NY", "Brooklyn, NY", "36047"],
  ["NY", "Brooklyn, New York, NY 11201", "36047"],
  ["NY", "Williamsburg, Brooklyn", "36047"],
  ["NY", "Queens, NY", "36081"],
  ["NY", "The Bronx, NY", "36005"],
  ["NY", "Staten Island, NY", "36085"],
  ["NY", "New York", ""],
  ["NY", "Rochester, NY", "36055"],
  // A city in several counties is in the one with most of its people.
  ["MO", "Kansas City, MO", "29095"],
  ["KS", "Kansas City, KS", "20209"],
  ["OR", "Portland, OR", "41051"],
  ["ME", "Portland, ME", "23005"],
  ["OK", "Oklahoma City, OK", "40109"],
  ["NM", "Española, NM", "35039"],
  ["NM", "Espanola, New Mexico", "35039"],
  // Independent cities are counties of their own, beside a county of the same name.
  ["VA", "Richmond, VA", "51760"],
  ["VA", "RVA", "51760"],
  ["VA", "Richmond County, VA", "51159"],
  ["VA", "Richmond City, Virginia", "51760"],
  ["VA", "Fairfax City, VA", "51600"],
  ["VA", "Fairfax County, VA", "51059"],
  ["VA", "Charles City County, VA", "51036"],
  ["VA", "Virginia Beach, VA", "51810"],
  ["MD", "Baltimore, MD", "24510"],
  ["MD", "Baltimore City, MD", "24510"],
  ["MD", "Baltimore County, MD", "24005"],
  ["MO", "St. Louis, MO", "29510"],
  ["MO", "Saint Louis, Missouri", "29510"],
  ["MO", "St. Louis County, MO", "29189"],
  ["MO", "St Louis Co., MO", "29189"],
  ["NV", "Carson City, NV", "32510"],
  // A town named like another county is left out, unless it is a city of 50,000 or more.
  ["NE", "Lincoln, NE", "31109"],
  ["TX", "Henderson, TX", ""],
  ["TX", "Houston, TX", "48201"],
  ["KS", "Wichita, KS", "20173"],
  ["WY", "Laramie, WY", "56001"],
  // Towns and townships, in the states that have them.
  ["MA", "Brookline, MA", "25021"],
  ["NJ", "Edison, NJ", "34023"],
  ["MI", "Canton, MI", "26163"],
  ["PA", "Springfield, PA", ""],
  // Names the Census writes its own way.
  ["HI", "Honolulu, HI", "15003"],
  ["HI", "Kailua, HI", "15003"],
  ["HI", "Maui", "15009"],
  ["ID", "Boise, ID", "16001"],
  ["ID", "BOISE, IDAHO", "16001"],
  ["KY", "Louisville, KY", "21111"],
  ["IN", "Indianapolis, IN", "18097"],
  ["GA", "Augusta, GA", "13245"],
  ["ME", "Augusta, ME", "23011"],
  ["CA", "Ventura, CA", "06111"],
  ["CA", "Paso Robles, CA", "06079"],
  ["AK", "Utqiagvik, AK", "02185"],
  ["AK", "Valdez, AK", "02261"],
  ["AK", "Anchorage, AK", "02020"],
  ["AK", "Kenai Peninsula Borough, AK", "02122"],
  // The state, its code, a ZIP code, and the country are dropped; a state stuck to the city is too.
  ["TX", "Austin, TX", "48453"],
  ["TX", "Austin TX 78701", "48453"],
  ["TX", "Austin, Texas, USA", "48453"],
  ["TX", "Austin, Texas Area", "48453"],
  ["TX", "ATX", "48453"],
  ["TX", "Texas", ""],
  ["WA", "Seattle, WA", "53033"],
  ["WA", "Seattle WA 98101", "53033"],
  ["WA", "Seattle, Washington State", "53033"],
  ["WA", "Washington State", ""],
  ["OR", "Portland, Oregon, United State", "41051"],
  ["UT", "Salt Lake City, Utah", "49035"],
  ["MN", "Saint Paul, MN", "27123"],
  ["MN", "St. Paul, Minnesota", "27123"],
  ["TX", "Fort Worth, TX", "48439"],
  ["TX", "Ft. Worth, TX", "48439"],
  ["SC", "Mt Pleasant, SC", "45019"],
  ["CA", "San José, CA", "06085"],
  ["ID", "Coeur d'Alene, ID", "16055"],
  ["MA", "Greater Boston Area", "25025"],
  ["VA", "Arlington, VA / Washington, DC", "51013"],
  // A county named in full wins.
  ["CA", "Orange County, CA", "06059"],
  ["FL", "Miami-Dade County, FL", "12086"],
  ["FL", "Miami Dade County", "12086"],
  ["MD", "Prince George's County, MD", "24033"],
  ["MD", "Prince Georges County, Maryland", "24033"],
  ["IL", "Cook County, IL", "17031"],
  ["CO", "Denver CO", "08031"],
  ["CO", "Boulder CO", "08013"],
  // Only whole pieces match, never part of one.
  ["OH", "Delaware, OH", "39041"],
  ["MI", "Wyoming, MI", "26081"],
  ["OR", "Remote, OR", ""],
  ["TX", "Anywhere, USA", ""],
  // Regions across counties name none.
  ["CA", "Bay Area, CA", ""],
  ["CA", "San Francisco Bay Area", ""],
  ["CA", "Silicon Valley", ""],
  ["TX", "Dallas-Fort Worth, TX", ""],
  ["MN", "Twin Cities, MN", ""],
  ["NC", "Research Triangle, NC", ""],
];

for (const [state, location, want] of GENERATED) {
  test(`${JSON.stringify(location)} is in ${want ? countyLabel(want) : "no county"} (${state})`, () => {
    assert.equal(countyOf(state, location) ?? "", want);
  });
}

test("a county's short name, full label, state, and kind", () => {
  assert.equal(countyName("48453"), "Travis");
  assert.equal(countyLabel("48453"), "Travis County");
  assert.equal(countyState("48453"), "TX");
  assert.equal(countyName("51760"), "Richmond city");
  assert.equal(countyName("51159"), "Richmond");
  assert.equal(countyLabel("02020"), "Anchorage Municipality");
  assert.equal(countyName("02020"), "Anchorage");
  assert.equal(countyLabel("02261"), "Valdez-Cordova Census Area");
  assert.equal(countyLabel("22071"), "Orleans Parish");
  assert.equal(countyName("99999"), null);
  assert.deepEqual(countyKind("AK"), ["borough", "boroughs"]);
  assert.deepEqual(countyKind("TX"), ["county", "counties"]);
  assert.equal(countyKind("XX"), null);
});

test("an unknown state has no county", () => {
  assert.equal(countyOf("DC", "Washington, DC"), null);
  assert.equal(countyOf("XX", "Austin, TX"), null);
  assert.deepEqual(countiesOf("XX"), []);
  assert.equal(hasCounties("DC"), false);
});

test("every state has counties, in the order of NAMES", () => {
  assert.deepEqual(COUNTY_STATES, NAMES.map(([ab]) => ab));
  for (const ab of COUNTY_STATES) assert.ok(hasCounties(ab), ab);
  const us = JSON.parse(readFileSync(new URL("../src/counties/us.json", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(us), COUNTY_STATES);
});

test("the 50 states have 3,141 counties, each in one state, by short name", () => {
  const all = COUNTY_STATES.flatMap((ab) => countiesOf(ab));
  assert.equal(all.length, 3141);
  assert.equal(new Set(all).size, 3141);
  for (const ab of COUNTY_STATES) {
    const fips = countiesOf(ab);
    for (const f of fips) assert.equal(countyState(f), ab, f);
    const names = fips.map(countyName);
    assert.deepEqual(names, [...names].sort(new Intl.Collator("en").compare), ab);
  }
  assert.equal(countiesOf("TX").length, 254);
  assert.equal(countiesOf("VA").length, 133);
});

// The hand-written states keep their places, and their ONLY lists stay as they were.
const HAND = ["LA", "MS", "AL", "AR", "TN"];

test("only the hand-written states place a town alone", () => {
  assert.deepEqual(ONLY_STATES, HAND);
  for (const ab of COUNTY_STATES) assert.equal(onlyTownsRe(ab) === null, !HAND.includes(ab), ab);
});

for (const state of HAND) {
  test(`${state}: every county name is one county, and every place is in a listed ${countyKind(state)[0]}`, async () => {
    const { COUNTIES, PLACES } = await import(`../src/counties/${state.toLowerCase()}.mjs`);
    // "De Soto" and "DeSoto", "LaSalle" and "La Salle" are the same name.
    const key = (name) => normalizePlace(name).replace(/ /g, "");
    const byKey = new Map(countiesOf(state).map((f) => [key(countyName(f)), f]));
    const fips = COUNTIES.map((name) => byKey.get(key(name)));
    assert.ok(fips.every(Boolean), `${COUNTIES.filter((_, i) => !fips[i])}`);
    assert.equal(new Set(fips).size, COUNTIES.length);
    assert.equal(COUNTIES.length, countiesOf(state).length);
    const names = new Set(COUNTIES);
    for (const [place, county] of Object.entries(PLACES)) assert.ok(names.has(county), `${place} → ${county}`);
  });
}

test("aliases are normalized names, each to a county of its own state", () => {
  let n = 0;
  for (const [ab, names] of Object.entries(ALIASES)) {
    assert.ok(hasCounties(ab) && !HAND.includes(ab), ab);
    for (const [name, fips] of Object.entries(names)) {
      n++;
      assert.equal(normalizePlace(name), name);
      if (fips !== null) assert.equal(countyState(fips), ab, `${ab} ${name} → ${fips}`);
    }
  }
  assert.ok(n >= 100, `${n} aliases`);
  for (const word of STOP) assert.equal(normalizePlace(word), word);
});

test("normalizePlace folds accents, case, Saint, Fort, Mount, and punctuation", () => {
  assert.equal(normalizePlace("Española"), "espanola");
  assert.equal(normalizePlace("  SAN JOSÉ  "), "san jose");
  assert.equal(normalizePlace("Saint Paul"), "st paul");
  assert.equal(normalizePlace("St. Paul"), "st paul");
  assert.equal(normalizePlace("Ste. Genevieve"), "ste genevieve");
  assert.equal(normalizePlace("Sainte Genevieve"), "ste genevieve");
  assert.equal(normalizePlace("Fort Worth"), "ft worth");
  assert.equal(normalizePlace("Ft. Worth"), "ft worth");
  assert.equal(normalizePlace("Mount Juliet"), "mt juliet");
  assert.equal(normalizePlace("Mt. Juliet"), "mt juliet");
  assert.equal(normalizePlace("Mountain View"), "mountain view");
  assert.equal(normalizePlace("Fortville"), "fortville");
  assert.equal(normalizePlace("Coeur d'Alene"), "coeur dalene");
  assert.equal(normalizePlace("Prince George’s"), "prince georges");
  assert.equal(normalizePlace("Winston-Salem"), "winston salem");
  assert.equal(normalizePlace("Washington, D.C."), "washington dc");
  assert.equal(normalizePlace("O'Fallon"), "ofallon");
  assert.equal(normalizePlace("Texas A&M"), "texas a m");
  assert.equal(normalizePlace(""), "");
  assert.equal(normalizePlace(null), "");
});

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
