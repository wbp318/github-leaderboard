// Makes web/us-counties.json: the shape of every county in the 50 states, for the page's map.
// The shapes come from us-atlas, already projected to a 975×610 px picture (Albers USA, with Alaska
// and Hawaii set in at the lower left), with neighbouring counties sharing the lines between them.
// Each line is simplified for the closest the map comes to it, zoomed into its state, so the small
// states keep their detail and the large ones lose what is hard to see; the result is small enough
// to send with the page. Run it by hand; its output is committed, and src/geo.mjs turns it into SVG
// paths. It downloads us-atlas once, to the system's temporary folder.
//   node scripts/make-geo.mjs
//
// The file:
//   grid     coordinates in arcs are in 1/grid px
//   size     the picture, in px: [975, 610]
//   arcs     the lines, each [x0, y0, dx1, dy1, ...]: its first point, then each step to the next
//   ids      the counties' five-digit FIPS codes, sorted
//   shapes   each county as polygons, of rings, of arcs: ~i is arc i backwards
//   cent     each county's centre in px, two numbers a county: [x, y, x, y, ...]
//   states   by state FIPS, its bounding box [x0, y0, x1, y1] and centre [x, y] in px
//   borders  the arcs drawn as state lines and coasts
//   dc       Washington, DC, as one more shape: drawn, but not a county one can choose
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";

const SOURCE = "https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/counties-albers-10m.json";
const SHA256 = "a674dfa31b625e92635f32684a61ae135b05a91507f17f2d5164833237fecf46";
const LICENSE = "us-atlas 3.0.1 (ISC) by Mike Bostock, from U.S. Census Bureau cartographic boundary files (public domain)";
const OUT = new URL("../web/us-counties.json", import.meta.url);
const SIZE = [975, 610];
// Points are rounded to 1/GRID px. 1/8 px is under 2 px on screen even zoomed into Rhode Island,
// and finer costs more than it shows.
const GRID = 8;
// A state zoomed into fills this much of the picture.
const FIT = 0.9;
// A point is dropped when the triangle it makes with its neighbours, zoomed into its state, is
// smaller than TOLERANCE² px² (px of the 975 px picture): with 3, a bump 6 px long and 3 px high.
const TOLERANCE = 3;
// The area, in px², of the stand-in for a county the atlas has as only a point or a line.
const STAND_IN = 0.1;
const DC = "11001";

async function source() {
  const file = join(tmpdir(), "gh-leaderboard-census", "counties-albers-10m.json");
  const sha = (buf) => createHash("sha256").update(buf).digest("hex");
  if (existsSync(file)) {
    const buf = readFileSync(file);
    if (sha(buf) !== SHA256) throw new Error(`${file} is not us-atlas 3.0.1 (sha256 ${sha(buf)}); delete it to download it again`);
    return JSON.parse(buf);
  }
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`${SOURCE}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (sha(buf) !== SHA256) throw new Error(`${SOURCE} has changed (sha256 ${sha(buf)})`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, buf);
  return JSON.parse(buf);
}

const topo = await source();
const { scale: [kx, ky], translate: [tx, ty] } = topo.transform;
// Every arc's points, in px.
const pts = topo.arcs.map((arc) => {
  let x = 0, y = 0;
  return arc.map(([dx, dy]) => [(x += dx) * kx + tx, (y += dy) * ky + ty]);
});
const before = pts.reduce((n, p) => n + p.length, 0);
const ix = (k) => (k < 0 ? ~k : k);
const arcPts = (k) => (k < 0 ? pts[~k].slice().reverse() : pts[k]);
const ringPts = (ring) => ring.flatMap((k, i) => (i ? arcPts(k).slice(1) : arcPts(k)));
// Twice the signed area of a closed ring of points, and its centroid's moments, for adding up.
function moments(p) {
  let a = 0, x = 0, y = 0;
  for (let i = 1; i < p.length; i++) {
    const c = p[i - 1][0] * p[i][1] - p[i][0] * p[i - 1][1];
    a += c;
    x += (p[i - 1][0] + p[i][0]) * c;
    y += (p[i - 1][1] + p[i][1]) * c;
  }
  return [a, x, y];
}
const area = (p) => moments(p)[0] / 2;
const q = (v) => Math.round(v * GRID);

// A ring that goes along an arc and straight back, a spike of no width, loses both.
let spikes = 0;
function unspike(ring) {
  const r = [...ring];
  for (let i; r.length > 2 && (i = r.findIndex((k, j) => r[(j + 1) % r.length] === ~k)) >= 0; spikes++) {
    if (i === r.length - 1) r.splice(i, 1), r.shift();
    else r.splice(i, 2);
  }
  return r;
}

let dc;
const counties = [];
for (const g of topo.objects.counties.geometries) {
  const shape = (g.type === "Polygon" ? [g.arcs] : g.arcs).map((p) => p.map(unspike));
  if (g.id === DC) dc = shape;
  else counties.push({ id: g.id, st: g.id.slice(0, 2), shape });
}
counties.sort((a, b) => (a.id < b.id ? -1 : 1));

// A few small independent cities are only a point or a line in the atlas. Each gets a small stand-in
// of its own, cut from the neighbour on one side, so it can be drawn and chosen.
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const crosses = (a, b, c, d) => cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
function clear(edges, mine) {
  for (let k = 0; k < pts.length; k++) {
    if (mine.includes(k)) continue;
    for (let i = 1; i < pts[k].length; i++) for (const [a, b] of edges) if (crosses(a, b, pts[k][i - 1], pts[k][i])) return false;
  }
  return true;
}
function standIn(c) {
  const ring = c.shape[0][0];
  const mine = ring.map(ix);
  // New points for the ring's last arc, in the ring's direction, turning the way outer rings do.
  let make;
  if (ring.length === 1 && new Set(pts[mine[0]].map(String)).size === 1) {
    // A point: a small diamond around it.
    const [x, y] = pts[mine[0]][0];
    make = (s) => {
      const r = Math.sqrt(s / 2);
      return [[x + r, y], [x, y + r], [x - r, y], [x, y - r], [x + r, y]];
    };
  } else if (ring.length === 2 && ringPts(ring).length === 3) {
    // A line there and back, a to b: the way back bends out to a third point.
    const [a, b] = ringPts(ring);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    make = (s) => {
      const h = Math.min((2 * s) / len, len);
      return [b, [(a[0] + b[0]) / 2 + (h * (a[1] - b[1])) / len, (a[1] + b[1]) / 2 + (h * (b[0] - a[0])) / len], a];
    };
  } else throw new Error(`${c.id}: no shape to stand in for`);
  // As large as fits without crossing another line.
  for (let s = STAND_IN; s > STAND_IN / 64; s /= 2) {
    const p = make(s);
    if (!clear(p.slice(1).map((v, i) => [p[i], v]), mine)) continue;
    const k = ring.at(-1);
    pts[ix(k)] = k < 0 ? p.reverse() : p;
    if (area(ringPts(ring)) <= 0) throw new Error(`${c.id}: the stand-in turns the wrong way`);
    return;
  }
  throw new Error(`${c.id}: no room for a stand-in`);
}
const stoodIn = [];
for (const c of counties) if (c.shape.every((p) => area(ringPts(p[0])) === 0)) standIn(c), stoodIn.push(c.id);

// Rings with no area at full detail: a hole is dropped, a polygon too if its county has others.
const flat = (ring) => {
  const p = ringPts(ring).map(([x, y]) => [q(x), q(y)]);
  return new Set(p.map(String)).size < 3 || area(p) === 0;
};
let flats = 0;
const unflat = (shape, id) => {
  const out = shape.filter((p) => !flat(p[0]) || (flats++, false)).map((p) => p.filter((r, i) => !i || !flat(r) || (flats++, false)));
  if (!out.length) throw new Error(`${id} has no shape left`);
  return out;
};
for (const c of counties) c.shape = unflat(c.shape, c.id);
dc = unflat(dc, DC);

// Which counties use each arc.
const users = pts.map(() => []);
counties.forEach((c, n) => c.shape.flat(2).forEach((k) => users[ix(k)].push(n)));
const dcArcs = new Set(dc.flat(2).map(ix));

// How far the map zooms into each state.
const box = {};
for (const c of counties) {
  const b = (box[c.st] ??= [Infinity, Infinity, -Infinity, -Infinity]);
  for (const p of c.shape) for (const k of p[0]) for (const [x, y] of pts[ix(k)]) {
    b[0] = Math.min(b[0], x), b[1] = Math.min(b[1], y), b[2] = Math.max(b[2], x), b[3] = Math.max(b[3], y);
  }
}
const zoom = Object.fromEntries(Object.entries(box).map(([st, b]) => [st, Math.min(SIZE[0] / (b[2] - b[0]), SIZE[1] / (b[3] - b[1])) * FIT]));

// Visvalingam–Whyatt: each point's effective area, the size of the triangle it makes with its
// neighbours when it is dropped, never less than any dropped before it. The ends are always kept.
function effective(p) {
  const n = p.length;
  const eff = new Float64Array(n).fill(Infinity);
  const prev = Array.from(p, (_, i) => i - 1), next = Array.from(p, (_, i) => i + 1);
  const tri = (i) => Math.abs(cross(p[prev[i]], p[i], p[next[i]])) / 2;
  const cur = Array.from(p, (_, i) => (i && i < n - 1 ? tri(i) : Infinity));
  for (let left = n - 2, last = 0; left > 0; left--) {
    let i = -1;
    for (let j = next[0]; j < n - 1; j = next[j]) if (i < 0 || cur[j] < cur[i]) i = j;
    eff[i] = last = Math.max(cur[i], last);
    next[prev[i]] = next[i], prev[next[i]] = prev[i];
    if (prev[i] > 0) cur[prev[i]] = tri(prev[i]);
    if (next[i] < n - 1) cur[next[i]] = tri(next[i]);
  }
  return eff;
}
const eff = pts.map(effective);
// Each arc is simplified for the deepest zoom it is seen at: the larger of its states'.
const cut = pts.map((_, k) => {
  const z = Math.max(0, ...users[k].map((n) => zoom[counties[n].st]));
  return z ? (TOLERANCE / z) ** 2 : 0;
});
const kept = (k) => pts[k].filter((_, i) => eff[k][i] >= cut[k]);
const keptPts = (k) => (k < 0 ? kept(~k).reverse() : kept(k));

// A ring keeps at least three distinct points and some area, turning the way it did (outer rings
// one way, holes the other), after rounding to the grid: its arcs get back their most important
// points until it does.
let restored = 0;
for (const poly of [...counties.flatMap((c) => c.shape), ...dc]) {
  poly.forEach((ring, hole) => {
    for (;;) {
      const p = ring.flatMap((k, i) => (i ? keptPts(k).slice(1) : keptPts(k))).map(([x, y]) => [q(x), q(y)]);
      if (new Set(p.map(String)).size >= 3 && (hole ? area(p) < 0 : area(p) > 0)) break;
      let best = -1, arc = -1;
      for (const k of ring.map(ix)) for (const e of eff[k]) if (e < cut[k] && e > best) best = e, arc = k;
      if (arc < 0) throw new Error(`a ring of ${ring} has no area`);
      cut[arc] = best;
      restored++;
    }
  });
}

// Number the arcs still used in the order the counties first use them, which packs smaller, and
// write each on the grid.
const used = [...new Set([...counties, { shape: dc }].flatMap((c) => c.shape.flat(2).map(ix)))];
const index = new Map(used.map((k, i) => [k, i]));
const arcs = used.map((k) => {
  const out = [];
  let x, y;
  for (const [px, py] of kept(k)) {
    const [gx, gy] = [q(px), q(py)];
    if (x === undefined) out.push(gx, gy);
    else if (gx !== x || gy !== y) out.push(gx - x, gy - y);
    [x, y] = [gx, gy];
  }
  return out;
});
const renumber = (shape) => shape.map((p) => p.map((r) => r.map((k) => (k < 0 ? ~index.get(~k) : index.get(k)))));

// State lines and coasts: arcs one county uses, or counties in two states share (DC counts as a state).
const borders = used.flatMap((k, i) => {
  const states = new Set(users[k].map((n) => counties[n].st));
  if (dcArcs.has(k)) states.add(DC.slice(0, 2));
  return users[k].length + dcArcs.has(k) === 1 || states.size > 1 ? [i] : [];
});

// Centres: of a county, its largest polygon's; of a state, all of its land's.
const r1 = (v) => Math.round(v * 10) / 10;
const polyMoments = (p) => p.map((r) => moments(ringPts(r))).reduce((a, m) => a.map((v, i) => v + m[i]), [0, 0, 0]);
const centre = ([a, x, y]) => [r1(x / (3 * a)), r1(y / (3 * a))];
const cent = counties.flatMap((c) => centre(c.shape.map(polyMoments).reduce((a, m) => (m[0] > a[0] ? m : a))));
const states = {};
for (const c of counties) {
  const s = (states[c.st] ??= { box: [Infinity, Infinity, -Infinity, -Infinity], m: [0, 0, 0] });
  for (const p of c.shape) {
    const m = polyMoments(p);
    s.m = s.m.map((v, i) => v + m[i]);
    for (const k of p[0]) for (const [x, y] of kept(ix(k)).map(([x, y]) => [q(x) / GRID, q(y) / GRID])) {
      s.box = [Math.min(s.box[0], x), Math.min(s.box[1], y), Math.max(s.box[2], x), Math.max(s.box[3], y)];
    }
  }
}
for (const [st, s] of Object.entries(states)) {
  const [x0, y0, x1, y1] = s.box;
  states[st] = { box: [Math.floor(x0 * 10) / 10, Math.floor(y0 * 10) / 10, Math.ceil(x1 * 10) / 10, Math.ceil(y1 * 10) / 10], cent: centre(s.m) };
}

const json = JSON.stringify({
  license: LICENSE,
  grid: GRID,
  size: SIZE,
  arcs,
  ids: counties.map((c) => c.id),
  shapes: counties.map((c) => renumber(c.shape)),
  cent,
  states,
  borders,
  dc: renumber(dc),
});
writeFileSync(OUT, `${json}\n`);

const after = arcs.reduce((n, a) => n + a.length / 2, 0);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`${counties.length} counties and DC, ${arcs.length} arcs, ${borders.length} of them borders`);
console.log(`stand-ins for ${stoodIn.join(", ")}; dropped ${spikes} spike, ${flats} flat rings; ${restored} points kept to keep rings whole`);
console.log(`points: ${before} → ${after}`);
console.log(`web/us-counties.json: ${kb(Buffer.byteLength(json))}, ${kb(gzipSync(json, { level: 9 }).length)} gzipped`);
