// The county map's shapes: web/us-counties.json (made by scripts/make-geo.mjs) as SVG paths. Plain
// JavaScript with nothing from Node, because the page carries a copy of decodeGeo.

/**
 * Turns the shapes file into SVG path strings. Everything it returns is in the file's grid units,
 * 1/grid px, so the SVG's viewBox is `0 0 ${size[0] * grid} ${size[1] * grid}`; outer rings and
 * holes turn opposite ways, so the default fill rule draws holes as holes.
 * @returns {{ counties: { id: string, d: string, cx: number, cy: number }[], borders: string, dc: string,
 *   states: Record<string, { box: number[], cent: number[] }> }}
 *   counties: each county's path and centre, in the file's order (by FIPS); borders: the state
 *   lines and coasts as one path to stroke; dc: Washington, DC; states: by state FIPS, its box
 *   [x0, y0, x1, y1] and centre [x, y].
 */
export function decodeGeo(geo) {
  const { arcs, grid } = geo;
  // Where each arc ends.
  const ends = arcs.map((a) => {
    let x = a[0], y = a[1];
    for (let i = 2; i < a.length; i += 2) (x += a[i]), (y += a[i + 1]);
    return [x, y];
  });
  const nums = (steps) => steps.join(" ").replace(/ -/g, "-");
  // A ring: its arcs' steps in turn (a reversed arc's steps reversed and negated), from the first
  // arc's start. The last step comes back to the start, which z draws.
  const ring = (r) => {
    const steps = [];
    for (const k of r) {
      const a = arcs[k < 0 ? ~k : k];
      if (k >= 0) for (let i = 2; i < a.length; i++) steps.push(a[i]);
      else for (let i = a.length - 2; i >= 2; i -= 2) steps.push(-a[i], -a[i + 1]);
    }
    steps.length -= 2;
    const [x, y] = r[0] < 0 ? ends[~r[0]] : arcs[r[0]];
    return `M${x} ${y}l${nums(steps)}z`;
  };
  const shape = (polys) => polys.map((p) => p.map(ring).join("")).join("");
  const scale = (v) => v.map((n) => n * grid);
  return {
    counties: geo.ids.map((id, i) => ({ id, d: shape(geo.shapes[i]), cx: geo.cent[2 * i] * grid, cy: geo.cent[2 * i + 1] * grid })),
    // Each border arc its own line; an arc rounded to a single point has nothing to draw.
    borders: geo.borders.map((k) => arcs[k]).filter((a) => a.length > 2).map((a) => `M${a[0]} ${a[1]}l${nums(a.slice(2))}`).join(""),
    dc: shape(geo.dc),
    states: Object.fromEntries(Object.entries(geo.states).map(([fp, s]) => [fp, { box: scale(s.box), cent: scale(s.cent) }])),
  };
}
