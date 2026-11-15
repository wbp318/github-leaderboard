// Mississippi's 82 counties, and the towns, cities, and universities people write in their GitHub
// location, mapped to the county they are in. Used only for people already placed in Mississippi,
// so town names shared with other states (Jackson, Columbus, Oxford) are safe here. A city in
// more than one county is in its principal one: Jackson is Hinds, Hattiesburg is Forrest.
// Same shape as src/counties/la.mjs.
export const STATE = "MS";
// What the state calls its counties, one and many.
export const KIND = ["county", "counties"];
export const COUNTIES = [
  "Adams", "Alcorn", "Amite", "Attala", "Benton", "Bolivar", "Calhoun", "Carroll", "Chickasaw", "Choctaw",
  "Claiborne", "Clarke", "Clay", "Coahoma", "Copiah", "Covington", "DeSoto", "Forrest", "Franklin", "George",
  "Greene", "Grenada", "Hancock", "Harrison", "Hinds", "Holmes", "Humphreys", "Issaquena", "Itawamba", "Jackson",
  "Jasper", "Jefferson", "Jefferson Davis", "Jones", "Kemper", "Lafayette", "Lamar", "Lauderdale", "Lawrence", "Leake",
  "Lee", "Leflore", "Lincoln", "Lowndes", "Madison", "Marion", "Marshall", "Monroe", "Montgomery", "Neshoba",
  "Newton", "Noxubee", "Oktibbeha", "Panola", "Pearl River", "Perry", "Pike", "Pontotoc", "Prentiss", "Quitman",
  "Rankin", "Scott", "Sharkey", "Simpson", "Smith", "Stone", "Sunflower", "Tallahatchie", "Tate", "Tippah",
  "Tishomingo", "Tunica", "Union", "Walthall", "Warren", "Washington", "Wayne", "Webster", "Wilkinson", "Winston",
  "Yalobusha", "Yazoo",
];

// Place → county. Longest names are tried first, so "West Hattiesburg" wins over "Hattiesburg"
// and "University of Mississippi Medical Center" over "University of Mississippi". A county named
// in full ("Jackson County") wins over any place, so it is not read as the city of Jackson.
// Left out: towns whose name is also a county elsewhere in the state (Prentiss, Quitman, Walthall,
// Union, DeSoto) and towns named like a common word (Forest, Liberty, Magnolia, Summit, Marks).
export const PLACES = {
  // Jackson and the metro
  Jackson: "Hinds", "Jackson State": "Hinds", JSU: "Hinds", "Mississippi College": "Hinds", Millsaps: "Hinds",
  Belhaven: "Hinds", "University of Mississippi Medical Center": "Hinds", UMMC: "Hinds", Clinton: "Hinds",
  Byram: "Hinds", Raymond: "Hinds", "Hinds Community College": "Hinds",
  Madison: "Madison", Ridgeland: "Madison", Canton: "Madison", Gluckstadt: "Madison", Tougaloo: "Madison",
  Brandon: "Rankin", Flowood: "Rankin", Pearl: "Rankin", Pelahatchie: "Rankin",
  // The Coast
  Gulfport: "Harrison", Biloxi: "Harrison", "D'Iberville": "Harrison", "Long Beach": "Harrison",
  "Pass Christian": "Harrison", Saucier: "Harrison", Keesler: "Harrison",
  Pascagoula: "Jackson", "Ocean Springs": "Jackson", Gautier: "Jackson", "Moss Point": "Jackson", Vancleave: "Jackson",
  "Bay St. Louis": "Hancock", Waveland: "Hancock", Diamondhead: "Hancock", Stennis: "Hancock",
  Picayune: "Pearl River", Poplarville: "Pearl River", "Pearl River": "Pearl River",
  Wiggins: "Stone", Perkinston: "Stone", McHenry: "Stone", Lucedale: "George",
  // The Pine Belt
  Hattiesburg: "Forrest", "Southern Miss": "Forrest", "University of Southern Mississippi": "Forrest", USM: "Forrest",
  "William Carey": "Forrest", Petal: "Forrest", "Camp Shelby": "Forrest",
  "West Hattiesburg": "Lamar", Purvis: "Lamar", Sumrall: "Lamar", Lumberton: "Lamar",
  Laurel: "Jones", Ellisville: "Jones", Columbia: "Marion", Tylertown: "Walthall",
  Collins: "Covington", "Mount Olive": "Covington", Richton: "Perry", "New Augusta": "Perry",
  Leakesville: "Greene", Waynesboro: "Wayne", Bassfield: "Jefferson Davis",
  // Southwest
  Natchez: "Adams", Vicksburg: "Warren", McComb: "Pike", Osyka: "Pike", Brookhaven: "Lincoln",
  Hazlehurst: "Copiah", "Crystal Springs": "Copiah", Mendenhall: "Simpson", Magee: "Simpson",
  Monticello: "Lawrence", Meadville: "Franklin", Gloster: "Amite", Woodville: "Wilkinson",
  Fayette: "Jefferson", Lorman: "Jefferson", "Port Gibson": "Claiborne", Pattison: "Claiborne", "Alcorn State": "Claiborne",
  // East Central
  Meridian: "Lauderdale", Philadelphia: "Neshoba", Kosciusko: "Attala", Carthage: "Leake", Louisville: "Winston",
  Macon: "Noxubee", "De Kalb": "Kemper", DeKalb: "Kemper", Scooba: "Kemper", Decatur: "Newton", Newton: "Newton",
  Morton: "Scott", "Bay Springs": "Jasper", Heidelberg: "Jasper", Taylorsville: "Smith",
  // The Golden Triangle and the Northeast
  Starkville: "Oktibbeha", "Mississippi State": "Oktibbeha", MSU: "Oktibbeha",
  Columbus: "Lowndes", "Mississippi University for Women": "Lowndes", MUW: "Lowndes", "West Point": "Clay",
  Tupelo: "Lee", Saltillo: "Lee", Guntown: "Lee", Corinth: "Alcorn", Iuka: "Tishomingo", Booneville: "Prentiss",
  Ripley: "Tippah", "New Albany": "Union", Pontotoc: "Pontotoc", Fulton: "Itawamba", Mantachie: "Itawamba",
  Aberdeen: "Monroe", Amory: "Monroe", Houston: "Chickasaw", Okolona: "Chickasaw", Eupora: "Webster",
  Ackerman: "Choctaw", "Hickory Flat": "Benton", Ashland: "Benton", "Michigan City": "Benton",
  // The North
  Oxford: "Lafayette", "Ole Miss": "Lafayette", "University of Mississippi": "Lafayette",
  Southaven: "DeSoto", "Olive Branch": "DeSoto", "Horn Lake": "DeSoto", Hernando: "DeSoto", "De Soto County": "DeSoto",
  "Holly Springs": "Marshall", Byhalia: "Marshall", "Rust College": "Marshall", Senatobia: "Tate",
  Batesville: "Panola", Sardis: "Panola", "Water Valley": "Yalobusha", Coffeeville: "Yalobusha",
  Grenada: "Grenada", Winona: "Montgomery", Carrollton: "Carroll", Vaiden: "Carroll",
  "Calhoun City": "Calhoun", Vardaman: "Calhoun",
  // The Delta
  Tunica: "Tunica", Robinsonville: "Tunica", Clarksdale: "Coahoma",
  Cleveland: "Bolivar", "Delta State": "Bolivar", Rosedale: "Bolivar", "Mound Bayou": "Bolivar",
  Greenville: "Washington", Leland: "Washington", Hollandale: "Washington",
  Greenwood: "Leflore", "Itta Bena": "Leflore", "Mississippi Valley State": "Leflore",
  Indianola: "Sunflower", Ruleville: "Sunflower", Moorhead: "Sunflower", Charleston: "Tallahatchie",
  "Yazoo City": "Yazoo", Belzoni: "Humphreys", "Rolling Fork": "Sharkey", Mayersville: "Issaquena",
  Lexington: "Holmes", Durant: "Holmes", Goodman: "Holmes",
};

// Mississippi place names unlikely to mean anywhere else: enough to place someone in Mississippi
// when they did not write the state. Not here: names shared with a town elsewhere, in the US or
// abroad (Jackson, Columbus, Oxford, Columbia, Meridian, Greenville, Clinton, Madison, Gulfport,
// Vicksburg, Kosciusko, Corinth), or that are also a word or a surname (Olive Branch, Picayune, Gautier).
export const ONLY = [
  "Hattiesburg", "Starkville", "Tupelo", "Pascagoula", "Biloxi", "Southaven", "Ocean Springs", "Moss Point",
  "D'Iberville", "Bay St. Louis", "Pass Christian", "Flowood", "Natchez", "Clarksdale", "Yazoo City", "Itta Bena",
  "Senatobia", "Lucedale", "Poplarville", "Tylertown", "Ole Miss", "Southern Miss", "Stennis Space Center", "Tougaloo",
];
