// Tennessee's 95 counties, and the towns, cities, and universities people write in their GitHub
// location, mapped to the county they are in. Used only for people already placed in Tennessee,
// so town names shared with other states (Columbia, Cleveland, Athens, Paris) are safe here.
// A city in more than one county is in its principal one: Oak Ridge is Anderson, Spring Hill Maury,
// Kingsport Sullivan, Johnson City Washington, Tullahoma Coffee. Same shape as src/counties/la.mjs.
export const STATE = "TN";
// What the state calls its counties, one and many.
export const KIND = ["county", "counties"];
export const COUNTIES = [
  "Anderson", "Bedford", "Benton", "Bledsoe", "Blount", "Bradley", "Campbell", "Cannon", "Carroll", "Carter",
  "Cheatham", "Chester", "Claiborne", "Clay", "Cocke", "Coffee", "Crockett", "Cumberland", "Davidson", "Decatur",
  "DeKalb", "Dickson", "Dyer", "Fayette", "Fentress", "Franklin", "Gibson", "Giles", "Grainger", "Greene",
  "Grundy", "Hamblen", "Hamilton", "Hancock", "Hardeman", "Hardin", "Hawkins", "Haywood", "Henderson", "Henry",
  "Hickman", "Houston", "Humphreys", "Jackson", "Jefferson", "Johnson", "Knox", "Lake", "Lauderdale", "Lawrence",
  "Lewis", "Lincoln", "Loudon", "Macon", "Madison", "Marion", "Marshall", "Maury", "McMinn", "McNairy",
  "Meigs", "Monroe", "Montgomery", "Moore", "Morgan", "Obion", "Overton", "Perry", "Pickett", "Polk",
  "Putnam", "Rhea", "Roane", "Robertson", "Rutherford", "Scott", "Sequatchie", "Sevier", "Shelby", "Smith",
  "Stewart", "Sullivan", "Sumner", "Tipton", "Trousdale", "Unicoi", "Union", "Van Buren", "Warren", "Washington",
  "Wayne", "Weakley", "White", "Williamson", "Wilson",
];

// Place → county. Longest names are tried first, so "Oak Ridge National Laboratory" (in the Roane
// County part of Oak Ridge) wins over "Oak Ridge", and "University of Tennessee at Chattanooga" over
// "University of Tennessee". A county named in full ("Jackson County", "Franklin Co.") wins over any
// place, so it is not read as the city of Jackson or of Franklin; both cities are far better known
// than the counties they share a name with, so they are here.
// Left out: towns whose name is also another county (Henderson, Decatur, Benton, Dyer, Hickman, and
// Nashville's Madison), towns named like a common word (Halls, Bells, Burns, Limestone, Mascot), and
// "East Tennessee", "Middle Tennessee", "West Tennessee", and "Tri-Cities", which are regions.
export const PLACES = {
  // Nashville and Davidson County
  Nashville: "Davidson", "Music City": "Davidson", "Music Row": "Davidson", Vanderbilt: "Davidson", VUMC: "Davidson",
  Belmont: "Davidson", Lipscomb: "Davidson", "Tennessee State University": "Davidson", TSU: "Davidson",
  "Fisk University": "Davidson", Meharry: "Davidson", Trevecca: "Davidson",
  Antioch: "Davidson", Hermitage: "Davidson", Donelson: "Davidson", Bellevue: "Davidson", "Old Hickory": "Davidson",
  "Green Hills": "Davidson", "Belle Meade": "Davidson", "Berry Hill": "Davidson", "Forest Hills": "Davidson",
  "Oak Hill": "Davidson", "Sylvan Park": "Davidson", "Cane Ridge": "Davidson", Joelton: "Davidson", "Whites Creek": "Davidson",
  // Goodlettsville's old town and city hall are in Davidson; its north half is in Sumner.
  Goodlettsville: "Davidson",
  // Williamson
  Franklin: "Williamson", Brentwood: "Williamson", "Cool Springs": "Williamson", Nolensville: "Williamson",
  "Thompson's Station": "Williamson", "Thompsons Station": "Williamson", "Thompson Station": "Williamson",
  Fairview: "Williamson", "College Grove": "Williamson", Arrington: "Williamson", "Leiper's Fork": "Williamson",
  // Rutherford and Wilson
  Murfreesboro: "Rutherford", MTSU: "Rutherford", "Middle Tennessee State": "Rutherford",
  "Middle Tennessee State University": "Rutherford", Smyrna: "Rutherford", "La Vergne": "Rutherford",
  LaVergne: "Rutherford", Eagleville: "Rutherford", Rockvale: "Rutherford", Christiana: "Rutherford",
  Lebanon: "Wilson", "Mt. Juliet": "Wilson", "Mt Juliet": "Wilson", "Mount Juliet": "Wilson", Watertown: "Wilson",
  "Cumberland University": "Wilson",
  // Sumner, Robertson, and Cheatham. Portland and Millersville reach into Robertson, White House into Sumner.
  Gallatin: "Sumner", Hendersonville: "Sumner", Portland: "Sumner", Westmoreland: "Sumner", Millersville: "Sumner",
  Springfield: "Robertson", "White House": "Robertson", Greenbrier: "Robertson", "Cross Plains": "Robertson",
  Coopertown: "Robertson", "Ashland City": "Cheatham", "Kingston Springs": "Cheatham", Pegram: "Cheatham",
  "Pleasant View": "Cheatham",
  // Clarksville and the northwest of Middle Tennessee. Fort Campbell's Tennessee side, by Clarksville, is Montgomery.
  Clarksville: "Montgomery", "Austin Peay": "Montgomery", APSU: "Montgomery", "Fort Campbell": "Montgomery",
  Dickson: "Dickson", Charlotte: "Dickson", "White Bluff": "Dickson", Erin: "Houston", Dover: "Stewart",
  Waverly: "Humphreys", "New Johnsonville": "Humphreys", Centerville: "Hickman", Linden: "Perry",
  // South of Nashville. Spring Hill reaches into Williamson; Tullahoma and Arnold AFB into Franklin.
  Columbia: "Maury", "Spring Hill": "Maury", "Mount Pleasant": "Maury", "Columbia State": "Maury",
  Shelbyville: "Bedford", Lewisburg: "Marshall", Pulaski: "Giles", "UT Southern": "Giles",
  "University of Tennessee Southern": "Giles", "Martin Methodist": "Giles", Lawrenceburg: "Lawrence",
  Hohenwald: "Lewis", Waynesboro: "Wayne", Fayetteville: "Lincoln", Lynchburg: "Moore", Motlow: "Moore",
  Tullahoma: "Coffee", Manchester: "Coffee", "Arnold AFB": "Coffee", "Arnold Air Force Base": "Coffee", AEDC: "Coffee",
  Winchester: "Franklin", Decherd: "Franklin", Cowan: "Franklin", "Estill Springs": "Franklin",
  Sewanee: "Franklin", "University of the South": "Franklin",
  // The Upper Cumberland
  Cookeville: "Putnam", "Tennessee Tech": "Putnam", "Tennessee Technological University": "Putnam",
  Algood: "Putnam", Baxter: "Putnam", McMinnville: "Warren", Sparta: "White", Smithville: "DeKalb",
  "De Kalb County": "DeKalb", Woodbury: "Cannon", Carthage: "Smith", Hartsville: "Trousdale", Lafayette: "Macon",
  Gainesboro: "Jackson", Livingston: "Overton", Celina: "Clay", Byrdstown: "Pickett", Jamestown: "Fentress",
  Crossville: "Cumberland", "Fairfield Glade": "Cumberland", Spencer: "Van Buren",
  // Knoxville and around
  Knoxville: "Knox", "University of Tennessee": "Knox", UTK: "Knox", "UT Knoxville": "Knox", Farragut: "Knox",
  Powell: "Knox", Karns: "Knox", "Hardin Valley": "Knox", "Fountain City": "Knox", Bearden: "Knox",
  Corryton: "Knox", Pellissippi: "Knox",
  Maryville: "Blount", Alcoa: "Blount", Friendsville: "Blount", Townsend: "Blount", "McGhee Tyson": "Blount",
  "Lenoir City": "Loudon", Loudon: "Loudon", "Tellico Village": "Loudon", Greenback: "Loudon",
  // Oak Ridge, "the Secret City", reaches into Roane; Y-12 is on the Anderson side, ORNL on the Roane side.
  "Oak Ridge": "Anderson", "Secret City": "Anderson", "Y-12": "Anderson", Clinton: "Anderson",
  "Oak Ridge National Laboratory": "Roane", ORNL: "Roane", Kingston: "Roane", Harriman: "Roane",
  Rockwood: "Roane", "Roane State": "Roane",
  Sevierville: "Sevier", "Pigeon Forge": "Sevier", Gatlinburg: "Sevier", Kodak: "Sevier", Dollywood: "Sevier",
  Morristown: "Hamblen", "Walters State": "Hamblen", "Jefferson City": "Jefferson", Dandridge: "Jefferson",
  "White Pine": "Jefferson", "Carson-Newman": "Jefferson", Newport: "Cocke", Rutledge: "Grainger",
  "Bean Station": "Grainger", Maynardville: "Union", Sneedville: "Hancock",
  Jacksboro: "Campbell", LaFollette: "Campbell", "La Follette": "Campbell", Caryville: "Campbell",
  Tazewell: "Claiborne", "New Tazewell": "Claiborne", Harrogate: "Claiborne", "Lincoln Memorial": "Claiborne",
  "Cumberland Gap": "Claiborne", Huntsville: "Scott", Oneida: "Scott", Wartburg: "Morgan", Oakdale: "Morgan",
  Madisonville: "Monroe", Sweetwater: "Monroe", "Tellico Plains": "Monroe", Vonore: "Monroe",
  Athens: "McMinn", Etowah: "McMinn", "Tennessee Wesleyan": "McMinn",
  // Chattanooga and the southeast
  Chattanooga: "Hamilton", "UT Chattanooga": "Hamilton", "University of Tennessee at Chattanooga": "Hamilton",
  "University of Tennessee, Chattanooga": "Hamilton", "University of Tennessee Chattanooga": "Hamilton",
  Ooltewah: "Hamilton", Collegedale: "Hamilton", "Southern Adventist": "Hamilton", Hixson: "Hamilton",
  "Signal Mountain": "Hamilton", "Lookout Mountain": "Hamilton", "Red Bank": "Hamilton", "East Ridge": "Hamilton",
  "Soddy-Daisy": "Hamilton", "Soddy Daisy": "Hamilton", "East Brainerd": "Hamilton", Apison: "Hamilton",
  Cleveland: "Bradley", "Lee University": "Bradley", Charleston: "Bradley",
  Ducktown: "Polk", Copperhill: "Polk", Dayton: "Rhea", "Spring City": "Rhea", "Bryan College": "Rhea",
  Jasper: "Marion", Kimball: "Marion", "South Pittsburg": "Marion", Whitwell: "Marion",
  Dunlap: "Sequatchie", Pikeville: "Bledsoe", Altamont: "Grundy", Monteagle: "Grundy", "Tracy City": "Grundy",
  // The Tri-Cities and the northeast. Johnson City reaches into Carter and Sullivan, Kingsport into Hawkins.
  // Gray is a word too, but seldom one in a location, and a longer place named with it wins.
  "Johnson City": "Washington", ETSU: "Washington", "East Tennessee State": "Washington",
  "East Tennessee State University": "Washington", Jonesborough: "Washington", Jonesboro: "Washington",
  Gray: "Washington", Telford: "Washington", "Boones Creek": "Washington",
  Kingsport: "Sullivan", Bristol: "Sullivan", Blountville: "Sullivan", "Bluff City": "Sullivan",
  "Piney Flats": "Sullivan", "King University": "Sullivan",
  Elizabethton: "Carter", Milligan: "Carter", "Roan Mountain": "Carter", Erwin: "Unicoi",
  Greeneville: "Greene", Tusculum: "Greene", "Mountain City": "Johnson",
  Rogersville: "Hawkins", "Church Hill": "Hawkins", "Mount Carmel": "Hawkins",
  // Memphis and Shelby County
  Memphis: "Shelby", UTHSC: "Shelby", "UT Health Science Center": "Shelby",
  "University of Tennessee Health Science Center": "Shelby", "Rhodes College": "Shelby",
  "Christian Brothers University": "Shelby", "LeMoyne-Owen": "Shelby", "St. Jude": "Shelby",
  Germantown: "Shelby", Collierville: "Shelby", Bartlett: "Shelby", Cordova: "Shelby", Arlington: "Shelby",
  Lakeland: "Shelby", Millington: "Shelby", "NSA Mid-South": "Shelby", Whitehaven: "Shelby", Frayser: "Shelby",
  // West Tennessee
  Jackson: "Madison", "Union University": "Madison", "Lane College": "Madison",
  Covington: "Tipton", Munford: "Tipton", Atoka: "Tipton", Somerville: "Fayette", Oakland: "Fayette",
  Bolivar: "Hardeman", Brownsville: "Haywood", Alamo: "Crockett", Ripley: "Lauderdale",
  Dyersburg: "Dyer", Newbern: "Dyer", Tiptonville: "Lake", "Union City": "Obion", "South Fulton": "Obion",
  Humboldt: "Gibson", Milan: "Gibson", Trenton: "Gibson",
  Martin: "Weakley", "UT Martin": "Weakley", "University of Tennessee at Martin": "Weakley",
  "University of Tennessee, Martin": "Weakley", "University of Tennessee Martin": "Weakley", Dresden: "Weakley",
  Paris: "Henry", Camden: "Benton", Huntingdon: "Carroll", McKenzie: "Carroll", "Bethel University": "Carroll",
  Lexington: "Henderson", Parsons: "Decatur", Decaturville: "Decatur", Savannah: "Hardin",
  Selmer: "McNairy", Adamsville: "McNairy", "Freed-Hardeman": "Chester",
};

// Tennessee place names unlikely to mean anywhere else: enough to place someone in Tennessee
// when they did not write the state. Chattanooga, Oklahoma, and Kingsport, Nova Scotia, are hamlets.
// Not here: names shared with a town elsewhere, in the US or abroad (Nashville, Memphis, Knoxville,
// Murfreesboro, Clarksville, Franklin, Jackson, Smyrna, Germantown, Hendersonville, Maryville,
// McMinnville, Oak Ridge, Johnson City, Bristol), Greeneville, so easily a misspelled Greenville,
// names that are also a word or a surname (Farragut, Hixson, Alcoa, LaVergne), and Fort Campbell,
// which is half in Kentucky. Names with "Tennessee" in them need not be here: they name the state.
export const ONLY = [
  "Chattanooga", "Kingsport", "Cookeville", "Tullahoma", "Collierville", "Goodlettsville", "Nolensville",
  "Mt. Juliet", "Mt Juliet", "Mount Juliet", "La Vergne", "Ooltewah", "Collegedale", "Soddy-Daisy", "Soddy Daisy",
  "Gatlinburg", "Pigeon Forge", "Sevierville", "Elizabethton", "Dyersburg", "Lenoir City",
  "Oak Ridge National Laboratory", "ORNL", "Vanderbilt University", "Austin Peay", "Sewanee", "MTSU", "ETSU",
  "UTK", "UTHSC", "Rhodes College", "Lipscomb University", "Belmont University", "Arnold Air Force Base", "Arnold AFB",
];
