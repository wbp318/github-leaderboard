// The county map's shapes (web/us-counties.json, made by scripts/make-geo.mjs) and their decoder
// (src/geo.mjs): every county of the 50 states once, every ring a real shape, neighbours still
// sharing the lines between them, and the file small enough to send with the page.
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { decodeGeo } from "../src/geo.mjs";

const FILE = new URL("../web/us-counties.json", import.meta.url);
const geo = JSON.parse(readFileSync(FILE, "utf8"));
const rings = (shape) => shape.flat();
const allRings = [...geo.shapes.flatMap(rings), ...rings(geo.dc)];
const ix = (k) => (k < 0 ? ~k : k);

// A ring's points, on the grid: each arc's points in turn, without the point two arcs share.
function ringPoints(ring) {
  const out = [];
  for (const k of ring) {
    const a = geo.arcs[ix(k)];
    const p = [];
    for (let i = 0, x = 0, y = 0; i < a.length; i += 2) p.push([(x += a[i]), (y += a[i + 1])]);
    if (k < 0) p.reverse();
    out.push(...(out.length ? p.slice(1) : p));
  }
  return out;
}

test("the counties are the 3,141 of the 50 states, once each, in order, without DC", () => {
  assert.equal(geo.ids.length, 3141);
  assert.equal(new Set(geo.ids).size, geo.ids.length);
  assert.ok(geo.ids.every((id) => /^\d{5}$/.test(id)));
  assert.deepEqual(geo.ids, [...geo.ids].sort());
  assert.ok(!geo.ids.includes("11001"));
  const states = new Set(geo.ids.map((id) => id.slice(0, 2)));
  assert.equal(states.size, 50);
  assert.ok(!states.has("11"));
  assert.deepEqual(Object.keys(geo.states).sort(), [...states].sort());
  assert.equal(geo.shapes.length, geo.ids.length);
  assert.equal(geo.cent.length, 2 * geo.ids.length);
  assert.ok(geo.dc.length > 0);
});

test("every arc index is in range, and every arc is used", () => {
  const used = new Set();
  for (const r of allRings) for (const k of r) {
    assert.ok(Number.isInteger(k) && ix(k) < geo.arcs.length, `arc ${k}`);
    used.add(ix(k));
  }
  assert.equal(used.size, geo.arcs.length);
  for (const k of geo.borders) assert.ok(Number.isInteger(k) && k >= 0 && k < geo.arcs.length, `border ${k}`);
  assert.equal(new Set(geo.borders).size, geo.borders.length);
});

test("every ring is closed, with at least three distinct points and some area", () => {
  for (const poly of [...geo.shapes, geo.dc].flat()) {
    poly.forEach((r, hole) => {
      const p = ringPoints(r);
      assert.deepEqual(p.at(-1), p[0], `ring ${r} is not closed`);
      assert.ok(new Set(p.map(String)).size >= 3, `ring ${r} has fewer than 3 points`);
      let area = 0;
      for (let i = 1; i < p.length; i++) area += p[i - 1][0] * p[i][1] - p[i][0] * p[i - 1][1];
      // Outer rings and holes turn opposite ways, so SVG's default fill rule leaves holes empty.
      assert.ok(hole ? area < 0 : area > 0, `ring ${r} has ${area ? "the wrong turn" : "no area"}`);
    });
  }
});

test("every county's centre is inside its state's box", () => {
  geo.ids.forEach((id, i) => {
    const [x0, y0, x1, y1] = geo.states[id.slice(0, 2)].box;
    const [x, y] = [geo.cent[2 * i], geo.cent[2 * i + 1]];
    assert.ok(x >= x0 && x <= x1 && y >= y0 && y <= y1, `${id} at ${x},${y}`);
  });
});

test("neighbours share the line between them, each going its own way along it", () => {
  const uses = new Map();
  for (const r of geo.shapes.flatMap(rings)) for (const k of r) uses.set(ix(k), [...(uses.get(ix(k)) ?? []), k]);
  let shared = 0;
  for (const [i, u] of uses) {
    assert.ok(u.length <= 2, `arc ${i} is used ${u.length} times`);
    if (u.length === 2) assert.deepEqual(u.toSorted((a, b) => b - a), [i, ~i], `arc ${i} is used the same way twice`), shared++;
  }
  assert.ok(shared > 8000);
});

test("decodeGeo draws every county", () => {
  const { counties, borders, dc, states } = decodeGeo(geo);
  assert.equal(counties.length, 3141);
  // Whole numbers: a space before each, or only its minus sign.
  const line = String.raw`M-?\d+ -?\d+l-?\d+(?: -?\d+|-\d+)*`;
  const path = new RegExp(`^(?:${line}z)+$`);
  for (const c of counties) {
    assert.match(c.d, path, c.id);
    assert.ok(Number.isFinite(c.cx) && Number.isFinite(c.cy), c.id);
  }
  assert.deepEqual(counties.map((c) => c.id), geo.ids);
  assert.match(dc, path);
  assert.match(borders, new RegExp(`^(?:${line})+$`));
  assert.equal(Object.keys(states).length, 50);
});

test("the file is small enough to send with the page", () => {
  assert.ok(statSync(FILE).size <= 500 * 1024, `${statSync(FILE).size} bytes`);
});
