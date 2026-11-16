// A badge for a GitHub profile README: a little tornado, then your rank in your state, and in your
// county where the state has a county list. The build (scripts/build.mjs) writes one for everyone
// placed, at site/badge/<login>.svg with the login in lower case, so it updates every day.
//
// It is drawn the way shields.io draws its badges (Verdana 11px, 20px high), so it sits well beside
// them. Node has no fonts to measure text with, so widths come from a table of Verdana's advance
// widths, and textLength holds each label to the width it was given.

// Verdana at 11px, in pixels: the printable ASCII characters, from " " to "~".
const VERDANA = [
  3.87, 4.33, 5.05, 9.0, 7.0, 11.84, 7.99, 2.95, 5.0, 5.0, 7.0, 9.0, 4.0, 5.0, 4.0, 5.0,
  7.0, 7.0, 7.0, 7.0, 7.0, 7.0, 7.0, 7.0, 7.0, 7.0, 5.0, 5.0, 9.0, 9.0, 9.0, 6.0,
  11.0, 7.52, 7.54, 7.68, 8.48, 6.96, 6.32, 8.53, 8.27, 4.63, 5.0, 7.62, 6.12, 9.27, 8.23, 8.66,
  6.63, 8.66, 7.65, 7.52, 6.78, 8.05, 7.52, 10.88, 7.54, 6.77, 7.54, 5.0, 5.0, 5.0, 9.0, 7.0,
  7.0, 6.61, 6.85, 5.73, 6.85, 6.55, 3.87, 6.85, 6.96, 3.0, 3.78, 6.51, 3.0, 10.71, 6.96, 6.68,
  6.85, 6.85, 4.69, 5.73, 4.33, 6.96, 6.51, 9.0, 6.51, 6.51, 5.78, 6.98, 5.0, 6.98, 9.0,
];
/** The width of a line of text in Verdana 11px; a character outside ASCII counts as a wide one. */
export function textWidth(text) {
  let w = 0;
  for (const ch of text) {
    const i = ch.codePointAt(0) - 32;
    w += ch === "·" ? 4.0 : VERDANA[i] ?? 9.0;
  }
  return w;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The page's own colours: the night sky, gold, and the tornado's red and blue halves.
const SKY = "#0b1430";
const INK = "#e9eef9";
const GOLD = "#f2b705";
const RED = "#e66767";
const BLUE = "#3987e5";

/** A badge: the tornado and label on the sky, the message on gold. Returns the SVG as text. */
export function badgeSvg(label, message) {
  const pad = 6;
  const icon = 16;
  const lw = Math.round(pad + icon + 4 + textWidth(label) + pad);
  const mw = Math.round(pad + textWidth(message) + pad);
  const w = lw + mw;
  const said = `${label}: ${message}`;
  // The funnel: four strokes, narrowing as they go down, each red on the left and blue on the right.
  const rings = [[5, 7], [8, 5.2], [11, 3.6], [14, 2.2]]
    .map(([y, r], i) => {
      const x = 14 + i * 0.6;
      return `<path d="M${(x - r).toFixed(1)} ${y}H${x}" stroke="${RED}"/><path d="M${x} ${y}H${(x + r).toFixed(1)}" stroke="${BLUE}"/>`;
    })
    .join("");
  const t = (x, y, width, fill, text, shadow) =>
    `<text x="${x * 10}" y="${y * 10}" transform="scale(.1)" fill="${fill}"${shadow ? ' fill-opacity=".3"' : ""} textLength="${Math.round(width * 10)}">${esc(text)}</text>`;
  const lx = pad + icon + 4 + textWidth(label) / 2;
  const mx = lw + mw / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(said)}"><title>${esc(said)}</title>` +
    `<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>` +
    `<clipPath id="r"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath>` +
    `<g clip-path="url(#r)"><rect width="${lw}" height="20" fill="${SKY}"/><rect x="${lw}" width="${mw}" height="20" fill="${GOLD}"/><rect width="${w}" height="20" fill="url(#s)"/></g>` +
    `<g fill="none" stroke-width="1.8" stroke-linecap="round">${rings}<path d="M15.8 16.5v1.5" stroke="${GOLD}"/></g>` +
    `<g text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">` +
    t(lx, 15, textWidth(label), "#010101", label, true) + t(lx, 14, textWidth(label), INK, label) +
    t(mx, 14, textWidth(message), SKY, message) +
    `</g></svg>`;
}

/**
 * Each person's ranks, as Find yourself shows them: in their state among everyone placed there, and
 * in their county among everyone placed in it, by total contributions, ties in the order people are
 * listed (the page's sort is stable over the same list). people: { login, state, county, total }.
 * Returns Map login → { state: [rank, of], county: [rank, of] | null }.
 */
export function ranksOf(people) {
  const out = new Map(people.map((p) => [p.login, { state: null, county: null }]));
  const groups = (key) => {
    const by = new Map();
    for (const p of people) {
      const k = key(p);
      if (k) (by.get(k) ?? by.set(k, []).get(k)).push(p);
    }
    return by.values();
  };
  for (const [field, key] of [["state", (p) => p.state], ["county", (p) => (p.county ? `${p.state}:${p.county}` : "")]]) {
    for (const list of groups(key)) {
      const sorted = [...list].sort((a, b) => b.total - a.total);
      sorted.forEach((p, i) => (out.get(p.login)[field] = [i + 1, sorted.length]));
    }
  }
  return out;
}

/** What a person's badge says: "#12 of 80 in Texas", or "#3 in Hinds County · #12 in Mississippi". */
export function badgeMessage(ranks, stateName, county, kind) {
  const [r, of] = ranks.state;
  if (ranks.county && county) return `#${ranks.county[0]} in ${county} ${kind[0].toUpperCase()}${kind.slice(1)} · #${r} in ${stateName}`;
  return `#${r} of ${of} in ${stateName}`;
}

export const BADGE_LABEL = "contribution tornado";
