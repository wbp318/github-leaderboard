// Arkansas's 75 counties, and the towns, cities, and universities people write in their GitHub
// location, mapped to the county they are in. Used only for people already placed in Arkansas,
// so town names shared with other states (Fayetteville, Conway, Jonesboro) are safe here. A city in
// more than one county is in its principal one: Springdale is Washington, Hot Springs Village Garland,
// Alexander Saline, Cherokee Village Sharp.
// Same shape as src/counties/la.mjs.
export const STATE = "AR";
// What the state calls its counties, one and many.
export const KIND = ["county", "counties"];
export const COUNTIES = [
  "Arkansas", "Ashley", "Baxter", "Benton", "Boone", "Bradley", "Calhoun", "Carroll", "Chicot", "Clark",
  "Clay", "Cleburne", "Cleveland", "Columbia", "Conway", "Craighead", "Crawford", "Crittenden", "Cross", "Dallas",
  "Desha", "Drew", "Faulkner", "Franklin", "Fulton", "Garland", "Grant", "Greene", "Hempstead", "Hot Spring",
  "Howard", "Independence", "Izard", "Jackson", "Jefferson", "Johnson", "Lafayette", "Lawrence", "Lee", "Lincoln",
  "Little River", "Logan", "Lonoke", "Madison", "Marion", "Miller", "Mississippi", "Monroe", "Montgomery", "Nevada",
  "Newton", "Ouachita", "Perry", "Phillips", "Pike", "Poinsett", "Polk", "Pope", "Prairie", "Pulaski",
  "Randolph", "Saline", "Scott", "Searcy", "Sebastian", "Sevier", "Sharp", "St. Francis", "Stone", "Union",
  "Van Buren", "Washington", "White", "Woodruff", "Yell",
];

// Place → county. Longest names are tried first, so "University of Arkansas at Little Rock" wins over
// "University of Arkansas". A county named in full wins over any place: "Arkansas County" is
// Stuttgart's county, but "Arkansas" alone names no county, and "Conway County" is not the city of Conway.
// Three towns share a name with another county and are kept, because each is far better known than
// that county: Conway (Faulkner), Searcy (White), and Van Buren (Crawford). Left out: Benton, the seat
// of Saline County, since Benton County (Bentonville, Rogers) is the better known; Marion, Lincoln,
// Johnson, Madison, and Washington, towns named like another county; towns named like a word or a
// region (Ozark, Casa, Magazine, Delight, Stamps, Flippin, Greenland); Haskell, also a programming
// language; and Lake City, which turns up inside Salt Lake City.
export const PLACES = {
  // Little Rock and Central Arkansas
  "Little Rock": "Pulaski", "North Little Rock": "Pulaski", NLR: "Pulaski", UALR: "Pulaski", "UA Little Rock": "Pulaski",
  "University of Arkansas at Little Rock": "Pulaski", UAMS: "Pulaski", "University of Arkansas for Medical Sciences": "Pulaski",
  "Philander Smith": "Pulaski", "Arkansas Baptist College": "Pulaski", "Shorter College": "Pulaski", "Pulaski Tech": "Pulaski",
  "Clinton School": "Pulaski", "Camp Robinson": "Pulaski", LRAFB: "Pulaski", Jacksonville: "Pulaski", Sherwood: "Pulaski",
  Maumelle: "Pulaski", Mabelvale: "Pulaski", Wrightsville: "Pulaski", "Cammack Village": "Pulaski",
  Bryant: "Saline", "Shannon Hills": "Saline", Alexander: "Saline",
  Conway: "Faulkner", UCA: "Faulkner", "University of Central Arkansas": "Faulkner", Hendrix: "Faulkner",
  "Central Baptist College": "Faulkner", Greenbrier: "Faulkner", Vilonia: "Faulkner", Mayflower: "Faulkner",
  Cabot: "Lonoke", Lonoke: "Lonoke", Ward: "Lonoke",
  Searcy: "White", Harding: "White", Beebe: "White", "Bald Knob": "White", Judsonia: "White",
  Morrilton: "Conway", UACCM: "Conway", Perryville: "Perry", Sheridan: "Grant",
  // Hot Springs and the Ouachitas
  "Hot Springs": "Garland", "Hot Springs Village": "Garland", "National Park College": "Garland", ASMSA: "Garland",
  Malvern: "Hot Spring", Arkadelphia: "Clark", "Henderson State": "Clark", "Ouachita Baptist": "Clark", Gurdon: "Clark",
  "Mount Ida": "Montgomery", Murfreesboro: "Pike", Mena: "Polk", "Rich Mountain": "Polk", "Big Fork": "Polk",
  Waldron: "Scott",
  // Northwest Arkansas. Springdale reaches into Benton County but is mostly in Washington.
  Fayetteville: "Washington", Fayettville: "Washington", "University of Arkansas": "Washington", "U of A": "Washington",
  UARK: "Washington", Springdale: "Washington", Farmington: "Washington", "Prairie Grove": "Washington",
  Elkins: "Washington", Goshen: "Washington", Tontitown: "Washington", "West Fork": "Washington",
  Bentonville: "Benton", Rogers: "Benton", "Bella Vista": "Benton", Lowell: "Benton", Centerton: "Benton",
  "Pea Ridge": "Benton", "Siloam Springs": "Benton", "John Brown University": "Benton", JBU: "Benton",
  Gentry: "Benton", Gravette: "Benton", "Cave Springs": "Benton", Highfill: "Benton",
  "Northwest Arkansas Community College": "Benton", NWACC: "Benton",
  Huntsville: "Madison", Berryville: "Carroll", "Eureka Springs": "Carroll", "Green Forest": "Carroll",
  "Holiday Island": "Carroll",
  // Fort Smith and the River Valley
  "Fort Smith": "Sebastian", UAFS: "Sebastian", "UA Fort Smith": "Sebastian", "University of Arkansas at Fort Smith": "Sebastian",
  Greenwood: "Sebastian", Barling: "Sebastian", "Fort Chaffee": "Sebastian",
  "Van Buren": "Crawford", Alma: "Crawford", Mountainburg: "Crawford", Charleston: "Franklin",
  Paris: "Logan", Booneville: "Logan", Clarksville: "Johnson", "University of the Ozarks": "Johnson", Hartman: "Johnson",
  Russellville: "Pope", "Arkansas Tech": "Pope", ATU: "Pope", London: "Pope", Dardanelle: "Yell", Danville: "Yell",
  // The Ozarks and North Central
  Harrison: "Boone", "North Arkansas College": "Boone", Northark: "Boone", Jasper: "Newton",
  "Mountain Home": "Baxter", Yellville: "Marion", "Bull Shoals": "Marion", Marshall: "Searcy",
  "Mountain View": "Stone", "Fifty-Six": "Stone", Melbourne: "Izard", "Calico Rock": "Izard", "Ozarka College": "Izard",
  "Ash Flat": "Sharp", "Cherokee Village": "Sharp", Salem: "Fulton", "Mammoth Spring": "Fulton",
  Batesville: "Independence", "Lyon College": "Independence", UACCB: "Independence",
  "Heber Springs": "Cleburne", "Greers Ferry": "Cleburne", Clinton: "Van Buren", "Fairfield Bay": "Van Buren",
  // Northeast Arkansas
  Jonesboro: "Craighead", "Arkansas State University": "Craighead", "A-State": "Craighead",
  Paragould: "Greene", Piggott: "Clay", Corning: "Clay", Pocahontas: "Randolph", Maynard: "Randolph",
  "Walnut Ridge": "Lawrence", Hoxie: "Lawrence", "Williams Baptist": "Lawrence", Newport: "Jackson",
  Blytheville: "Mississippi", Osceola: "Mississippi", Harrisburg: "Poinsett", Trumann: "Poinsett", "Marked Tree": "Poinsett",
  // The Delta
  "West Memphis": "Crittenden", Wynne: "Cross", "Forrest City": "St. Francis", Marianna: "Lee",
  Helena: "Phillips", "West Helena": "Phillips", Clarendon: "Monroe", Brinkley: "Monroe",
  Augusta: "Woodruff", McCrory: "Woodruff", "Des Arc": "Prairie", "DeValls Bluff": "Prairie", "De Valls Bluff": "Prairie",
  Hazen: "Prairie", Stuttgart: "Arkansas", DeWitt: "Arkansas", "De Witt": "Arkansas", Gillett: "Arkansas",
  // Southeast
  "Pine Bluff": "Jefferson", UAPB: "Jefferson", "University of Arkansas at Pine Bluff": "Jefferson", "White Hall": "Jefferson",
  Redfield: "Jefferson", NCTR: "Jefferson", "Star City": "Lincoln",
  Monticello: "Drew", UAM: "Drew", "University of Arkansas at Monticello": "Drew", "UA Monticello": "Drew",
  "Arkansas City": "Desha", Dumas: "Desha", McGehee: "Desha", "Lake Village": "Chicot", Eudora: "Chicot", Dermott: "Chicot",
  Hamburg: "Ashley", Crossett: "Ashley", Warren: "Bradley", Rison: "Cleveland", Fordyce: "Dallas",
  // South and Southwest
  "El Dorado": "Union", Eldorado: "Union", Smackover: "Union", "South Arkansas College": "Union",
  "South Arkansas Community College": "Union", SouthArk: "Union",
  Camden: "Ouachita", "SAU Tech": "Ouachita", "Southern Arkansas University Tech": "Ouachita", Hampton: "Calhoun",
  Magnolia: "Columbia", "Southern Arkansas University": "Columbia", Lewisville: "Lafayette",
  Texarkana: "Miller", Hope: "Hempstead", "UA Hope": "Hempstead", Prescott: "Nevada", Nashville: "Howard",
  Ashdown: "Little River", "De Queen": "Sevier", DeQueen: "Sevier", "UA Cossatot": "Sevier",
};

// Arkansas place names unlikely to mean anywhere else: enough to place someone in Arkansas when
// they did not write the state. Little Rock and Bentonville are here because the other places of
// those names are hamlets. Not here: names shared with a town elsewhere, in the US or abroad
// (Fayetteville, Springdale, Fort Smith, Conway, Jonesboro, Hot Springs, Texarkana, Rogers, Bella Vista,
// Mountain Home, Stuttgart), or that are also a word or a common surname (Cabot, Bryant, Gentry, Sherwood).
export const ONLY = [
  "Little Rock", "Bentonville", "Paragould", "Blytheville", "Maumelle", "Arkadelphia", "Morrilton",
  "Heber Springs", "Eureka Springs", "Hot Springs Village", "Siloam Springs", "Pine Bluff", "Searcy", "Tontitown",
];
