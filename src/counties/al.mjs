// Alabama's 67 counties, and the towns, cities, universities, and bases people write in their GitHub
// location, mapped to the county they are in. Used only for people already placed in Alabama,
// so town names shared with other states (Auburn, Florence, Athens, Troy) are safe here. A city in
// more than one county is in its principal one: Birmingham and Hoover are Jefferson, Huntsville is
// Madison, Dothan is Houston. Same shape as src/counties/la.mjs.
export const STATE = "AL";
// What the state calls its counties, one and many.
export const KIND = ["county", "counties"];
export const COUNTIES = [
  "Autauga", "Baldwin", "Barbour", "Bibb", "Blount", "Bullock", "Butler", "Calhoun", "Chambers", "Cherokee",
  "Chilton", "Choctaw", "Clarke", "Clay", "Cleburne", "Coffee", "Colbert", "Conecuh", "Coosa", "Covington",
  "Crenshaw", "Cullman", "Dale", "Dallas", "DeKalb", "Elmore", "Escambia", "Etowah", "Fayette", "Franklin",
  "Geneva", "Greene", "Hale", "Henry", "Houston", "Jackson", "Jefferson", "Lamar", "Lauderdale", "Lawrence",
  "Lee", "Limestone", "Lowndes", "Macon", "Madison", "Marengo", "Marion", "Marshall", "Mobile", "Monroe",
  "Montgomery", "Morgan", "Perry", "Pickens", "Pike", "Randolph", "Russell", "Shelby", "St. Clair", "Sumter",
  "Talladega", "Tallapoosa", "Tuscaloosa", "Walker", "Washington", "Wilcox", "Winston",
];

// Place → county. Longest names are tried first, so "University of Alabama at Birmingham" wins over
// "University of Alabama", and "Auburn University at Montgomery" over "Auburn University". A county
// named in full ("Marion County") wins over any place. Mobile, Montgomery, Tuscaloosa, and Madison
// are each a city in the county of the same name, so the two readings agree.
// Left out: towns whose name is also a different county in the state (Jackson, Butler, Marion, Clay,
// Cherokee), towns named like a word that would misfire inside a location (Valley, as in "Tennessee
// Valley"; Warrior, as in "Black Warrior River"; York, as in "New York"; Southside, a Birmingham
// neighborhood; Centre, Normal, Trinity, Reform, Eclectic), and small towns named for a far bigger
// place (Hartford, Lincoln). "Alabama State" alone is left out too: "Auburn, Alabama state" is Auburn.
export const PLACES = {
  // Huntsville and the Tennessee Valley. Huntsville reaches into Limestone and Morgan, Madison into
  // Limestone, and Decatur into Limestone; each is in its principal county.
  Huntsville: "Madison", "Rocket City": "Madison", Madison: "Madison", "Redstone Arsenal": "Madison",
  "Marshall Space Flight Center": "Madison", MSFC: "Madison", "Cummings Research Park": "Madison", HudsonAlpha: "Madison",
  "University of Alabama in Huntsville": "Madison", "University of Alabama at Huntsville": "Madison", UAH: "Madison",
  "Alabama A&M": "Madison", AAMU: "Madison", "Oakwood University": "Madison",
  Meridianville: "Madison", "Hazel Green": "Madison", Harvest: "Madison", "New Market": "Madison", Gurley: "Madison",
  "Owens Cross Roads": "Madison", Triana: "Madison", Brownsboro: "Madison",
  Athens: "Limestone", "Athens State": "Limestone", Ardmore: "Limestone", Elkmont: "Limestone", Tanner: "Limestone",
  Mooresville: "Limestone", "Calhoun Community College": "Limestone", "Browns Ferry": "Limestone",
  Decatur: "Morgan", Hartselle: "Morgan", Priceville: "Morgan", Falkville: "Morgan", Somerville: "Morgan",
  Moulton: "Lawrence", "Town Creek": "Lawrence", Courtland: "Lawrence",
  Scottsboro: "Jackson", Stevenson: "Jackson", Bridgeport: "Jackson", Pisgah: "Jackson",
  Guntersville: "Marshall", Albertville: "Marshall", Boaz: "Marshall", Arab: "Marshall", Douglas: "Marshall",
  "Snead State": "Marshall",
  // The Shoals and the Northwest
  Florence: "Lauderdale", "University of North Alabama": "Lauderdale", Killen: "Lauderdale", Rogersville: "Lauderdale",
  "Muscle Shoals": "Colbert", Tuscumbia: "Colbert", Sheffield: "Colbert", Leighton: "Colbert",
  Russellville: "Franklin", "Red Bay": "Franklin", "Phil Campbell": "Franklin",
  Hamilton: "Marion", Winfield: "Marion", Guin: "Marion", Hackleburg: "Marion",
  "Double Springs": "Winston", Haleyville: "Winston", Addison: "Winston", Arley: "Winston",
  Vernon: "Lamar", Sulligent: "Lamar", Millport: "Lamar", Fayette: "Fayette",
  // Northeast
  "Fort Payne": "DeKalb", Rainsville: "DeKalb", Mentone: "DeKalb", Fyffe: "DeKalb", Henagar: "DeKalb",
  Collinsville: "DeKalb", "Valley Head": "DeKalb", Crossville: "DeKalb", Sylvania: "DeKalb", "De Kalb County": "DeKalb",
  Leesburg: "Cherokee", "Cedar Bluff": "Cherokee", Gaylesville: "Cherokee",
  Gadsden: "Etowah", "Rainbow City": "Etowah", Attalla: "Etowah", Glencoe: "Etowah", "Hokes Bluff": "Etowah",
  // Anniston and Talladega. Oxford reaches into Talladega, and Piedmont into Cherokee.
  Anniston: "Calhoun", Oxford: "Calhoun", Jacksonville: "Calhoun", "Jacksonville State": "Calhoun", JSU: "Calhoun",
  Piedmont: "Calhoun", Alexandria: "Calhoun", Ohatchee: "Calhoun", "Fort McClellan": "Calhoun",
  Heflin: "Cleburne", Ranburne: "Cleburne",
  Talladega: "Talladega", Sylacauga: "Talladega", Childersburg: "Talladega", Munford: "Talladega",
  Ashland: "Clay", Lineville: "Clay", Wedowee: "Randolph", Roanoke: "Randolph", Wadley: "Randolph",
  // Birmingham and the metro. Birmingham, Hoover, and Vestavia Hills reach into Shelby, and Trussville
  // and Leeds into St. Clair; each is in Jefferson, its principal county. Helena is mostly Shelby.
  Birmingham: "Jefferson", UAB: "Jefferson", "University of Alabama at Birmingham": "Jefferson", Samford: "Jefferson",
  "Miles College": "Jefferson", "Lawson State": "Jefferson",
  Hoover: "Jefferson", "Vestavia Hills": "Jefferson", Vestavia: "Jefferson", "Mountain Brook": "Jefferson",
  Homewood: "Jefferson", Bessemer: "Jefferson", Hueytown: "Jefferson", Trussville: "Jefferson", Gardendale: "Jefferson",
  Fultondale: "Jefferson", "Center Point": "Jefferson", Irondale: "Jefferson", Leeds: "Jefferson", Fairfield: "Jefferson",
  Adamsville: "Jefferson", Pinson: "Jefferson", "Pleasant Grove": "Jefferson", McCalla: "Jefferson",
  Forestdale: "Jefferson",
  Pelham: "Shelby", Alabaster: "Shelby", Helena: "Shelby", Chelsea: "Shelby", Calera: "Shelby", Columbiana: "Shelby",
  Montevallo: "Shelby", Harpersville: "Shelby", Wilsonville: "Shelby",
  "Pell City": "St. Clair", Moody: "St. Clair", Springville: "St. Clair", Odenville: "St. Clair", Ashville: "St. Clair",
  Oneonta: "Blount", Blountsville: "Blount", "Locust Fork": "Blount", Snead: "Blount",
  Cullman: "Cullman", Hanceville: "Cullman", "Wallace State": "Cullman", Vinemont: "Cullman", "Holly Pond": "Cullman",
  Jasper: "Walker", Sumiton: "Walker", Cordova: "Walker", "Carbon Hill": "Walker", Oakman: "Walker", Nauvoo: "Walker",
  // Tuscaloosa and West Alabama. Moundville reaches into Tuscaloosa; it is in Hale.
  Tuscaloosa: "Tuscaloosa", "University of Alabama": "Tuscaloosa", Northport: "Tuscaloosa", Cottondale: "Tuscaloosa",
  "Stillman College": "Tuscaloosa", "Shelton State": "Tuscaloosa",
  Centreville: "Bibb", Brent: "Bibb", "West Blocton": "Bibb",
  Carrollton: "Pickens", Aliceville: "Pickens", Pickensville: "Pickens",
  Eutaw: "Greene", Boligee: "Greene", Greensboro: "Hale", Moundville: "Hale",
  Livingston: "Sumter", "University of West Alabama": "Sumter",
  Demopolis: "Marengo", Linden: "Marengo",
  Uniontown: "Perry", "Marion Military Institute": "Perry", "Judson College": "Perry",
  // Montgomery and the River Region. Prattville reaches into Elmore, and Millbrook and Tallassee
  // into Autauga and Tallapoosa; each is in its principal county.
  Montgomery: "Montgomery", "Pike Road": "Montgomery", "Maxwell AFB": "Montgomery", "Maxwell Air Force Base": "Montgomery",
  "Maxwell-Gunter": "Montgomery", "Gunter Annex": "Montgomery", "Air University": "Montgomery",
  "Alabama State University": "Montgomery", "Auburn University at Montgomery": "Montgomery", AUM: "Montgomery",
  "Huntingdon College": "Montgomery", "Faulkner University": "Montgomery",
  Prattville: "Autauga", Autaugaville: "Autauga",
  Wetumpka: "Elmore", Millbrook: "Elmore", Tallassee: "Elmore", Elmore: "Elmore", Coosada: "Elmore", Deatsville: "Elmore",
  Clanton: "Chilton", Jemison: "Chilton", Thorsby: "Chilton", Maplesville: "Chilton",
  Rockford: "Coosa", Goodwater: "Coosa",
  Hayneville: "Lowndes", "Fort Deposit": "Lowndes",
  Selma: "Dallas", Orrville: "Dallas", "Valley Grande": "Dallas",
  Camden: "Wilcox", "Pine Hill": "Wilcox",
  // East Alabama. Phenix City reaches into Lee, and Smiths Station into Russell.
  Auburn: "Lee", "Auburn University": "Lee", Opelika: "Lee", "Smiths Station": "Lee", Loachapoka: "Lee",
  "Phenix City": "Russell", Hurtsboro: "Russell",
  Tuskegee: "Macon", Notasulga: "Macon",
  LaFayette: "Chambers", Lanett: "Chambers",
  "Alexander City": "Tallapoosa", Dadeville: "Tallapoosa", "Camp Hill": "Tallapoosa",
  // The Wiregrass. Dothan reaches into Dale and Henry; it is in Houston. Fort Novosel, formerly
  // Fort Rucker, is mostly in Dale, and Enterprise mostly in Coffee.
  Dothan: "Houston", Ashford: "Houston", Cottonwood: "Houston",
  "Fort Novosel": "Dale", "Ft. Novosel": "Dale", "Ft Novosel": "Dale",
  "Fort Rucker": "Dale", "Ft. Rucker": "Dale", "Ft Rucker": "Dale",
  Ozark: "Dale", Daleville: "Dale", "Midland City": "Dale", "Level Plains": "Dale",
  Enterprise: "Coffee", Elba: "Coffee", "New Brockton": "Coffee", Kinston: "Coffee",
  Geneva: "Geneva", Samson: "Geneva", Slocomb: "Geneva",
  Abbeville: "Henry", Headland: "Henry",
  Eufaula: "Barbour", Clayton: "Barbour", Troy: "Pike", Brundidge: "Pike", "Union Springs": "Bullock",
  Greenville: "Butler", Georgiana: "Butler", Luverne: "Crenshaw", Brantley: "Crenshaw",
  Andalusia: "Covington", Opp: "Covington", Florala: "Covington", "Red Level": "Covington",
  // Mobile and the Gulf Coast
  Mobile: "Mobile", "University of South Alabama": "Mobile", "Spring Hill College": "Mobile", "Bishop State": "Mobile",
  Prichard: "Mobile", Saraland: "Mobile", Theodore: "Mobile", Satsuma: "Mobile", Chickasaw: "Mobile", Creola: "Mobile",
  Citronelle: "Mobile", Semmes: "Mobile", "Grand Bay": "Mobile", "Tillmans Corner": "Mobile", "Dauphin Island": "Mobile",
  "Bayou La Batre": "Mobile",
  Daphne: "Baldwin", Fairhope: "Baldwin", Foley: "Baldwin", "Gulf Shores": "Baldwin", "Orange Beach": "Baldwin",
  "Spanish Fort": "Baldwin", "Bay Minette": "Baldwin", Loxley: "Baldwin", Robertsdale: "Baldwin", Summerdale: "Baldwin",
  "Point Clear": "Baldwin", "Magnolia Springs": "Baldwin", Silverhill: "Baldwin", Elberta: "Baldwin",
  Brewton: "Escambia", "East Brewton": "Escambia", Atmore: "Escambia", Flomaton: "Escambia",
  Monroeville: "Monroe", "Frisco City": "Monroe", Evergreen: "Conecuh", Castleberry: "Conecuh",
  Chatom: "Washington", McIntosh: "Washington", Millry: "Washington",
  "Grove Hill": "Clarke", Thomasville: "Clarke", Coffeeville: "Clarke", Gilbertown: "Choctaw",
};

// Alabama place names unlikely to mean anywhere else: enough to place someone in Alabama when they
// did not write the state. Not here: names shared with a town elsewhere, in the US or abroad
// (Huntsville, Birmingham, Montgomery, Auburn, Florence, Decatur, Athens, Gadsden, Eufaula, Selma,
// Northport, Bessemer, Tuscumbia, Montevallo), or that are also a word or a name (Mobile, Hoover,
// Daphne, Enterprise, Alabaster, Opp, Mountain Brook).
export const ONLY = [
  "Tuscaloosa", "Dothan", "Opelika", "Muscle Shoals", "Vestavia Hills", "Trussville", "Hueytown", "Phenix City",
  "Prattville", "Wetumpka", "Sylacauga", "Talladega", "Guntersville", "Scottsboro", "Fort Payne", "Cullman",
  "Hartselle", "Saraland", "Bayou La Batre", "Dauphin Island", "Gulf Shores", "Demopolis", "Tuskegee", "Anniston",
  "Alexander City", "Pell City", "Auburn University", "Jacksonville State", "Redstone Arsenal",
  "Marshall Space Flight Center", "Cummings Research Park", "Maxwell AFB", "Maxwell Air Force Base", "Fort Novosel",
  "Fort Rucker",
];
