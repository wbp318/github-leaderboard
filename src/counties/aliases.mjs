// Hand fixes for the 45 states whose place names are generated from Census files
// (scripts/make-counties.mjs). Louisiana, Mississippi, Alabama, Arkansas, and Tennessee have their
// own files in src/counties/ and do not use these.
//
//   ALIASES  state → a normalized name (normalizePlace in src/counties.mjs) → its county's FIPS code,
//            or null for a name that means no one county, like a metro area across several. An
//            alias wins over the generated places, and a null one ends the search, so "San Jose,
//            Bay Area" has no county: add a region only if it is also a place name, or often
//            written alone. The rest are names the Census writes differently ("Augusta-Richmond
//            County consolidated government"), nicknames, boroughs and neighborhoods, universities,
//            and towns the generator leaves out because a county has their name (Laramie is in
//            Albany County, not Laramie County).
//   STOP     normalized words that are never a place, in any state: "Remote, OR" names no county.
//            The generator leaves these names out too.
//
// Found a location in the wrong county? Add the name here and a case to test/counties.test.mjs.
export const ALIASES = {
  AK: {
    "eagle river": "02020", barrow: "02185", "kenai peninsula": "02122", "university of alaska fairbanks": "02090",
  },
  AZ: { "arizona state university": "04013", "university of arizona": "04019" },
  CA: {
    dtla: "06037", la: "06037", venice: "06037", "sherman oaks": "06037", westwood: "06037", "la crescenta": "06037",
    sf: "06075", "san fransisco": "06075", "la jolla": "06073", sd: "06073", oc: "06059", marin: "06041",
    "bay area": null, "sf bay area": null, "san francisco bay area": null, "silicon valley": null, "inland empire": null,
  },
  CT: { "yale university": "09009", "tri state": null },
  DE: { "university of delaware": "10003", "camden wyoming": "10001" },
  FL: {
    "st pete": "12103", "lake worth": "12099", "lakewood ranch": "12081", "st johns": "12109", "space coast": "12009",
    "university of florida": "12001", "university of central florida": "12095",
  },
  GA: {
    // Consolidated cities the Census names "Augusta-Richmond County", "Athens-Clarke County", "Macon-Bibb County".
    augusta: "13245", athens: "13059", macon: "13021",
    // Decatur is in DeKalb, not Decatur County.
    decatur: "13089", atl: "13121", "georgia tech": "13121",
  },
  HI: {
    honolulu: "15003", oahu: "15003", maui: "15009", kauai: "15007", "big island": "15001", "hawaii island": "15001",
    // Oahu's Kailua, not Kailua-Kona. Mililani is Mililani Town and Mililani Mauka to the Census.
    kailua: "15003", "kailua kona": "15001", kona: "15001", mililani: "15003", kamuela: "15001",
  },
  ID: { boise: "16001", cda: "16055", "byu idaho": "16065" },
  IL: {
    "university of illinois": "17019", "university of illinois urbana champaign": "17019",
    "university of illinois at urbana champaign": "17019", "urbana champaign": "17019", "champaign urbana": "17019",
  },
  IN: { indianapolis: "18097", indy: "18097", purdue: "18157" },
  // Marion is in Linn County, not Marion County.
  IA: { marion: "19113", "iowa state university": "19169" },
  KS: { kc: null },
  KY: { louisville: "21111", lexington: "21067" },
  MA: { mit: "25017", "cape cod": "25001", "north shore": null, "south shore": null },
  MD: { dmv: null, "university of maryland": "24033" },
  MI: { "michigan state university": "26065" },
  MN: { "twin cities": null },
  MO: { stl: "29510", stlouis: "29510", kc: null },
  MT: {
    // Consolidated cities the Census names "Butte-Silver Bow" and "Anaconda-Deer Lodge County".
    butte: "30093", anaconda: "30023", "montana state university": "30031", "university of montana": "30063",
  },
  // Kearney is in Buffalo County, not Kearney County.
  NE: { kearney: "31019", elkhorn: "31055", "university of nebraska lincoln": "31109" },
  NV: { vegas: "32003", "university of nevada reno": "32031", "area 51": "32017" },
  // The town of Merrimack is in Hillsborough County, not Merrimack County.
  NH: { merrimack: "33011" },
  NJ: { "tri state": null },
  NM: { abq: "35001", albequerque: "35001", "university of new mexico": "35001" },
  NY: {
    // The city is in five counties, one for each borough.
    "new york": "36061", "new york city": "36061", nyc: "36061", manhattan: "36061", harlem: "36061",
    brooklyn: "36047", bk: "36047", queens: "36081", "long island city": "36081", astoria: "36081",
    flushing: "36081", bronx: "36005", "the bronx": "36005", "staten island": "36085", westchester: "36119",
    "tri state": null, "north shore": null, "south shore": null,
  },
  NC: {
    "research triangle": null, "research triangle park": null, rtp: null,
    // The town of Davidson is in Mecklenburg County, not Davidson County.
    davidson: "37119",
  },
  ND: { "university of north dakota": "38035" },
  OH: { sandusky: "39043", boardman: "39099", "the ohio state university": "39049", "ohio state university": "39049" },
  OK: { okc: "40109" },
  OR: { pdx: "41051", "oregon state university": "41003", "university of oregon": "41039" },
  PA: {
    philly: "42101", "university of pennsylvania": "42101", "pennsylvania state university": "42027", "penn state": "42027",
    landenberg: "42029",
  },
  RI: { wakefield: "44009", "university of rhode island": "44009", "brown university": "44007" },
  SC: { "university of south carolina": "45079" },
  SD: { "south dakota school of mines and technology": "46103", "university of south dakota": "46027", vermilion: "46027" },
  TX: { atx: "48453", "the woodlands": "48339", dfw: null, "dallas ft worth": null },
  UT: { slc: "49035", "salt lake": "49035", "university of utah": "49035" },
  // Essex is a town in Chittenden County, not Essex County.
  VT: { essex: "50007", "university of vermont": "50007" },
  VA: {
    rva: "51760", nova: null, dmv: null,
    // Counties with no town of their name.
    henrico: "51087", loudoun: "51107", stafford: "51179",
    // Fairfax, VA mostly means the county around the small city of Fairfax.
    fairfax: "51059",
  },
  WA: { "university of washington": "53033" },
  WV: { "west virginia university": "54061" },
  WI: { "university of wisconsin madison": "55025" },
  // Laramie is in Albany County, not Laramie County.
  WY: { laramie: "56001", "university of wyoming": "56001", "jackson hole": "56039" },
};

// Normalized words and phrases that are never a place, in any state.
export const STOP = new Set([
  "remote", "remotely", "fully remote", "remote work", "working remotely", "home", "at home", "earth", "planet earth",
  "world", "the world", "anywhere", "everywhere", "nowhere", "somewhere", "online", "internet", "the internet", "web",
  "cyberspace", "worldwide", "global", "globe", "local", "localhost", "here", "there", "virtual", "the cloud", "cloud",
  "downtown", "uptown", "midtown", "suburbs", "the suburbs", "rural", "countryside", "city", "the city", "town",
  "usa", "us", "u s", "u s a", "united states", "united state", "united states of america", "the united states",
  "america", "north america", "the states", "states", "stateside",
  "north", "south", "east", "west", "central", "northern", "southern", "eastern", "western", "midwest", "the midwest",
  "mid west", "the south", "southeast", "south east", "southwest", "south west", "northeast", "north east",
  "northwest", "north west", "east coast", "west coast", "the east coast", "the west coast", "pacific", "atlantic",
  "gulf coast", "new england", "pacific northwest", "pnw", "mountain west",
  "mars", "moon", "the moon", "space", "universe", "the universe", "milky way", "matrix", "the matrix", "metaverse",
  "nomad", "digital nomad", "traveling", "travelling", "on the road", "unknown", "none", "n a", "null", "undefined",
  "private", "hidden", "secret", "university", "college", "school", "office", "work", "hq", "campus",
]);
