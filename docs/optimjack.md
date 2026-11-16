# OPTIMJACK: the November 2026 third-party script attack

In November 2026, attackers got malicious JavaScript into scripts that large websites load from outside companies, mainly the A/B-testing service Optimizely. Visitors' browsers ran it as part of the site. It swapped cryptocurrency addresses, skimmed card numbers, and on iPhones and iPads pointed to known exploit-kit infrastructure. This note sets out what is known as of November 16, 2026, and why this site was not affected. Early reports disagree in places; where they do, or a claim comes from one source, it says so.

## What happened

- **Where the code was.** Inside customer project bundles served from Optimizely's CDN (`cdn.optimizely.com`, files such as `landingprod.js`). The same loader also turned up in responses from Kissmetrics, StorifyMe, and minute-ly. A few sites carried it some other way: Fox News through an ad wrapper, American Eagle in a first-party bundle, and Air France in a Jscrambler-protected script.
- **How it got there: not known.** Hudson Rock says the evidence doesn't show whether the attackers came in through Optimizely's own systems, through stolen publishing credentials, through an integration, or through separate customer accounts. Neither Optimizely nor any affected site had commented as of November 16.
- **When.** It was first seen on **November 13, 2026, at 05:42 UTC**, and most captures fall between November 13 and 16. Hudson Rock was still recovering live samples around 21:00 UTC on November 16. By then some copies were clean (BBC's, at about 21:10 UTC), but nobody has said it is gone everywhere.
- **The cleanup.** Later on November 16, Scott Helme posted on X that "the affected 3P provider is now aware and working to resolve." He had seen the infected files being cleaned up and their Last-Modified headers changing. At that point he counted 41 of 188 (the rest of the post is cut off in the screenshot this note was written from).

## Who was hit

Named in the reports: CNN, Zoom, Fox News, BBC, GitLab, Salesforce, HSBC (UAE and Singapore insurance sites), Hootsuite, Smartsheet, Air France (Italy), Virgin Media O2, Stamps.com, Tricentis, Mutual of Omaha, Talkwalker, and American Eagle.

Counts differ by how strictly they are checked:

| Source | Sites |
|---|---:|
| Hudson Rock, verified captures | 21 named |
| One researcher's traced list, not verified | 51 |
| Scott Helme, on X (November 16) | 186, then 188 |

Two sites in Amirul Cyber's set had a Content Security Policy that blocked the loader, so the payload never ran there. How many visitors were affected is unknown: a site's monthly audience is its reach, not a count of victims.

## What the code did

1. **Crypto clipper.** It replaced wallet addresses for ETH, BTC, BCH, LTC, TRX, DOGE, SOL, and TON with the attackers' own. That covered the page text, form fields, links, the clipboard (copy and paste), and outgoing network requests. Someone who copied an address from an affected page, or pasted one into it, could send money to the wrong place.
2. **Card skimmer.** It read card numbers from form submissions and network requests (those that pass format checks) and sent them to the attackers.
3. **Exfiltration.** In some cases it also sent the page address, the cookies scripts can read, and a screenshot of the page. Cookies marked HttpOnly were out of its reach.
4. **An iPhone and iPad stage.** On iOS it loaded another script, which routes by iOS version to entries tied to two known exploit kits, Coruna and DarkSword:

   | iOS version | Routed to |
   |---|---|
   | 13 to 17 | Coruna |
   | 18 to 25 | DarkSword |
   | 26 | an untested branch; a test on 26.3 got nothing |
   | above 26 | nothing |

   This is a link to exploit-kit infrastructure, **not a confirmed compromise of any phone**: the tests show what was served, not that an iPhone was broken into, and what later stages would steal is not established.

No cryptomining code was found.

**The clipper was paying out.** Scott Helme reported that the attackers' addresses had received about **$7,000 across BTC, LTC, TRON, and ETH, all verified on-chain**. His list of what the malware does matches the one above: DarkSword or Coruna iOS exploits, a card skimmer, cookie exfiltration, crypto address swapping on the page and on the clipboard, and a screenshot-and-exfiltration payload.

## Indicators of compromise

These come from Amirul Cyber and from Scott Helme's "additional IOCs, block now" post on X. The domains are written with `[.]` so they don't become links.

- **Domains, Amirul Cyber:** `1688360[.]cc`, `5vobauua3ojpklx[.]icu`, `eil786npto9u5bq[.]icu`
- **More domains, Scott Helme:**
  - `eil786npto9u5bq[.]icu`
  - `l7bcsnwc7nzr3uo[.]icu`
  - `q1ls1ho9x7wsxlu[.]icu`
  - `p55abnw2pnsz0bo[.]icu`
  - `1y69gy2mdzaltz1[.]icu`
  - `gm38duxoihbmy5o[.]icu`

  These were copied from a screenshot of his post. Characters like `l` and `1`, or `0` and `o`, are easy to misread there, so check them against the post before blocking.
- **File names:** `track.js`, `hit.php`, `card.php`, `html2canvas.min.js`, `boot.js`, `weifile.html`
- **Hashes:** only prefixes were published: `track.js` begins `f7b84b9a`, and `eil786…`'s `boot.js` begins `2f69879f`.

A site owner can fetch the Optimizely bundle their site is actually served and search it for `1688360`, and watch Content Security Policy reports for `script-src` violations from unknown hosts.

## What a visitor can do

The reports say little here. This is general advice, not from them:

- If you visited an affected site from November 13 on, don't trust a crypto address you copied from it or pasted into it. Check it against an independent source before sending anything.
- If you entered a card number on one of them in that window, watch your statements, and wait for that company's own notice before doing more.
- Keep iPhones and iPads on the latest iOS.

## Why this site was not affected

The page loads no code from anywhere else. Checked on the live page on November 16, 2026:

- **No outside scripts.** It has no `<script src>` tags. Its code is inline in [web/template.html](../web/template.html), built into one HTML file, with no frameworks and no dependencies.
- **Nothing it loads from elsewhere runs.** Its only links out are to github.com. The only thing it loads from another host is people's avatars from `avatars.githubusercontent.com`, as images, for the share card. An image cannot run code.
- **No tag managers or tracking.** There is no analytics, A/B testing, or ad code: nothing like Optimizely for an attacker to borrow.
- **The county map keeps it that way.** Its shapes come from `us-atlas`, downloaded once by a script run by hand, checked against a pinned SHA-256 hash, committed, and then served from this site. Visitors never fetch it from a CDN.
- **Updates need the repository.** The page changes only through a commit to `main` and the [Refresh and deploy](../.github/workflows/refresh.yml) workflow. Playwright is pinned to an exact version and used only to test the page, never shipped in it.

The lesson for anyone adding to the page: **keep it free of third-party scripts.** If one is ever truly needed:

- copy it into the repository and serve it from here;
- or load it with [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) and an exact version, so the browser refuses a changed file;
- and add a Content Security Policy that names only the hosts the page needs.

## Sources

- Hudson Rock / Infostealers, [Poisoned scripts on BBC, Zoom and other major websites linked to iPhone exploit loaders](https://www.infostealers.com/article/poisoned-scripts-on-bbc-zoom-and-other-major-websites-linked-to-iphone-exploit-loaders/). The timeline, the vendors the code appeared in, the iOS routing, and the caveats.
- Amirul Cyber, [CNN, Zoom, Fox News served visitors a crypto-stealing skimmer](https://amirulcyber.com/2026/11/16/optimjack-optimizely-skimmer/). The payload, the list of sites, the indicators, and the two sites whose CSP blocked it.
- Scott Helme (@Scott_Helme) on X, a thread on November 16, 2026. The additional indicators, the list of what the malware does, the roughly $7,000 received on-chain, the provider's cleanup, and the 188 count.
- KuCoin News, [OPTIMJACK attack infects 186 websites, including CNN and BBC](https://www.kucoin.com/news/flash/optimjack-attack-infects-186-websites-including-cnn-and-bbc). An earlier count of 186, quoting Scott Helme.
