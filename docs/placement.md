# How people are placed

A GitHub profile's location is free text: "Austin, TX", "New Orleans", "Remote", "Campo Grande, MS", "🏜️ ABQ,NM". [src/states.mjs](../src/states.mjs) reads it and decides which US state it names, if any. Getting this right is most of what makes the leaderboard trustworthy, and it is the easiest place to contribute.

## The problem: codes are shared

Two-letter codes after a city name are not only American. The same letters are used by other countries and by states and provinces abroad:

| Code | US state | Also |
|---|---|---|
| MS | Mississippi | Mato Grosso do Sul, Brazil (Campo Grande, Dourados) |
| SC | South Carolina | Santa Catarina, Brazil (Florianópolis, Blumenau) |
| AL | Alabama | Alagoas, Brazil (Maceió); Albania |
| MT | Montana | Mato Grosso, Brazil (Cuiabá); Malta |
| PA | Pennsylvania | Pará, Brazil (Belém) |
| MA | Massachusetts | Maranhão, Brazil; Morocco |
| DE | Delaware | Germany |
| IN | Indiana | India |
| TN | Tennessee | Tamil Nadu, India (Chennai); Tunisia |
| ID | Idaho | Indonesia |
| WA | Washington | Western Australia (Perth) |
| CO | Colorado | Colombia |
| AR | Arkansas | Argentina |
| IL | Illinois | Israel |
| MD | Maryland | Moldova |
| MO | Missouri | Moscow Oblast; Modena, Italy |
| VA | Virginia | Varese, Italy |
| SD | South Dakota | Sindh, Pakistan (Karachi); Sudan |
| LA | Louisiana | Los Angeles; Laos |

Before these rules, "Campo Grande, MS" (27 profiles) was counted in Mississippi.

## The rules, in order

```mermaid
flowchart TD
    loc["A profile location"] --> dc["Drop any mention of Washington, D.C."]
    dc --> abroad{"Names another country,<br/>or written in another script,<br/>without saying USA?"}
    abroad -->|yes| none["Not placed"]
    abroad -->|no| code{"Ends in a state code?"}
    code -->|yes| guard{"Is the city a known place abroad<br/>for that code, or accented<br/>like no US town there?"}
    guard -->|yes| name
    guard -->|no| listed{"DE or ID?"}
    listed -->|"yes, and the town is<br/>in Delaware or Idaho"| st["That state"]
    listed -->|"yes, and it is not"| name
    listed -->|no| st
    code -->|no| name{"Names a state?"}
    name -->|yes| last["The state named last"]
    name -->|no| town{"A town in a state with counties<br/>that means nowhere else?"}
    town -->|yes| la["Its state"]
    town -->|no| none
```

1. **Another country.** A location that names another country (Brazil, India, Germany, and about a hundred more) or uses a script no US town is written in is not placed, unless it also says USA. US towns that share a country's name are listed so they still count: Norway, ME; Poland, OH; Little Canada, MN; Brazil, IN.
2. **A trailing state code wins.** A two-letter code can follow a comma in any case ("Atlanta, Ga"), or it can be uppercase after a space ("Austin TX"). Either form can be followed by a ZIP code ("Denver, CO 80223") and by USA. The code counts only if the city is not in the `ELSEWHERE` list for that code and carries no accents a US town in that state would not. Delaware and Idaho are stricter: their codes are written far more often by people in Germany and Indonesia, so only towns listed for those states count. A code that does not count is not proof of anything either: the rest of the location is read as below, so "2600 Pasadena Ave, Metairie, LA 70001" is still Metairie, Louisiana.
3. **The state named last.** "Kansas City, Missouri" is Missouri and "Washington Heights, New York" is New York. On a tie the longer name wins, so "West Virginia" is not Virginia. A river named after a state is the river: "West of the Mississippi" and "44th Parallel N and Mississippi River" are not Mississippi.
4. **Towns that mean only one state.** "New Orleans", "Shreveport", "Ruston", and other names that mean only Louisiana place someone there, and so do "Hattiesburg", "Starkville", "Tupelo", "Biloxi", "Ole Miss", and others that mean only Mississippi, "Tuscaloosa" and "Muscle Shoals" Alabama, "Little Rock" and "Bentonville" Arkansas, and "Chattanooga" and "Gatlinburg" Tennessee. A name shared with a town anywhere else, in the US or abroad, is not on these lists: Jackson (Wyoming too), Columbus, Oxford, Columbia, Meridian (Idaho), Greenville, Clinton, Madison, Gulfport (Florida), Vicksburg (Michigan). Each list is `ONLY` in the state's file in [src/counties/](../src/counties/): [la.mjs](../src/counties/la.mjs), [ms.mjs](../src/counties/ms.mjs), [al.mjs](../src/counties/al.mjs), [ar.mjs](../src/counties/ar.mjs), and [tn.mjs](../src/counties/tn.mjs).

Anything else, including "Remote", "Earth", "Georgia" next to Tbilisi, and two places at once in different countries, is left out. Leaving someone out costs a little coverage; placing them wrongly misleads everyone.

## Counties

Every state goes down to the county (Louisiana's are parishes, and Alaska's boroughs), for people already placed in the state. [src/counties.mjs](../src/counties.mjs) reads the location and gives the county's 5-digit FIPS code. The lists run only for people already in the state, so a town that shares its name with one in another state (Monroe, Jackson, Columbus) is safe there.

Louisiana, Mississippi, Alabama, Arkansas, and Tennessee read each state's hand-written file in [src/counties/](../src/counties/):

1. **A county named in full wins**: "East Carroll Parish", "Jackson County", "Jackson Co.". So "Jackson County, MS" is on the coast, not in the city of Jackson.
2. **Otherwise the longest town, city, or university named**: "West Hattiesburg" is Lamar County and "Hattiesburg" Forrest; "University of Mississippi Medical Center" is Hinds and "University of Mississippi" Lafayette.
3. **Otherwise none**: people who wrote only the state are under "Parish not given" or "County not given".

A city in more than one county is in its principal one there: Jackson is Hinds, Hattiesburg is Forrest. Each file lists its counties, its towns and universities, and its `ONLY` names.

The other 45 states read Census place names ([src/counties/us.json](../src/counties/us.json), made by [scripts/make-counties.mjs](../scripts/make-counties.mjs)) and a short list of fixes ([src/counties/aliases.mjs](../src/counties/aliases.mjs)):

1. **A county named in full wins**: "Travis County", "Baltimore City", "Kenai Peninsula Borough".
2. **Otherwise the place named nearest the state.** The location is split at commas, slashes, and the like, the state, a ZIP code, and USA are dropped, and the one or two pieces left at the end are looked up whole, nearest first: "Austin, TX" is Travis County and "Brooklyn, NY" Kings County. Only whole pieces count, so "Delaware, OH" is Delaware County and "Remote, OR" is none. A region across counties, like "Bay Area", is none too.
3. **Otherwise none.**

The places are every city, town, village, and census-designated place, and the towns and townships of New England, New York, New Jersey, Pennsylvania, Michigan, Minnesota, and Wisconsin. A place in several counties is in the one where most of its people live: Kansas City, Missouri is Jackson County. A name shared by places in different counties is kept only for a city that dwarfs the rest, and a town named like another county is left out unless it has 50,000 people: "Henderson, TX" (in Rusk County, not Henderson County) is none, and "Lincoln, NE" is Lancaster County. [CONTRIBUTING.md](../CONTRIBUTING.md#fix-your-states-counties) says how to fix a county.

**Post offices and unincorporated communities**, in all 50 states, fill the gaps last: every post office as USPS names it ([GeoNames](https://www.geonames.org/)' US postal codes) and every populated place in the USGS's [Geographic Names Information System](https://www.usgs.gov/us-board-on-geographic-names/domestic-names). They're tried after everything above, and in the five hand-written states only when the state's file finds nothing: "Sondheimer, Louisiana" is East Carroll Parish, "Cypress, TX" Harris County, and "Hell, Michigan" Livingston County. A name counts only if it means one county in its state, a post office's county first. Left out, though a hamlet has the name: a state's name ("New York Florida" is two states), a region with the state's name in it ("Mid-Missouri"), a city of 500,000 or more in another state, a township whose name the Census left out, and words like "bay" and "the woods".

## Checking the rules

- **Tests.** [test/states.test.mjs](../test/states.test.mjs) holds over a hundred locations and where they belong. `npm test` runs them, and so does every pull request.
- **Audit.** `npm run audit` reads every profile found and writes `data/audit.md`: per state, how many were placed by each rule; every location a guard turned away; and every city accepted under a shared code. The daily run publishes it on the [`data` branch](https://github.com/wbp318/github-leaderboard/blob/data/data/audit.md).

Read the audit in both directions: a US town in "turned away" means a rule is too strict, and a foreign town in "accepted" means one is too loose.

## Fixing one

1. Add the location to [test/states.test.mjs](../test/states.test.mjs) with the right answer, `null` for "not in a US state".
2. Change [src/states.mjs](../src/states.mjs) until `npm test` passes. Usually that means adding a city to the `ELSEWHERE` list for its code, or a US town to `TOWNS_LIKE_ABROAD`, `ACCENTED_TOWNS`, `DELAWARE`, or `IDAHO`.
3. Run `npm run audit` and check nothing else moved.

A wrong parish or county is fixed the same way, in [test/counties.test.mjs](../test/counties.test.mjs) and [src/counties/aliases.mjs](../src/counties/aliases.mjs), or the state's own file in `src/counties/` for Louisiana, Mississippi, Alabama, Arkansas, and Tennessee.

Or [open an issue](https://github.com/wbp318/github-leaderboard/issues/new/choose) with the exact location text.

## Not on the leaderboard?

Each state looks up the people found there who pushed in the last year, up to 1,000, and GitHub's search finds only about 800 people a state, so most people are not on it. On the page, typing a login that is not there offers **Add me**, a one-click [issue](https://github.com/wbp318/github-leaderboard/issues/new?template=add-me.yml): the bot places whoever opens it with these same rules and replies with their ranks, or with why it could not place them.

## Other people who are left off

- **Bots and test accounts.** Logins with a separate `bot`, `robot`, or `test` part (`openshift-cherrypick-robot`, `amplify-github-test-hkg`) are automation, not people.
- **Anyone who asks.** Logins in [src/opt-out.txt](../src/opt-out.txt).
