// The README badge (src/badge.mjs): the ranks it gives match Find yourself's, and what it says is
// escaped and sized to fit.
import assert from "node:assert/strict";
import { test } from "node:test";
import { badgeMessage, badgeSvg, ranksOf, textWidth } from "../src/badge.mjs";

const people = [
  { login: "a", state: "MS", county: "Hinds", total: 50 },
  { login: "b", state: "MS", county: "Hinds", total: 90 },
  { login: "c", state: "MS", county: "", total: 70 },
  { login: "d", state: "MS", county: "Hinds", total: 50 },
  { login: "e", state: "TX", county: "", total: 10 },
];

test("ranks go by total, ties in the order people are listed, as the page sorts them", () => {
  const r = ranksOf(people);
  assert.deepEqual(r.get("b"), { state: [1, 4], county: [1, 3] });
  assert.deepEqual(r.get("c"), { state: [2, 4], county: null });
  assert.deepEqual(r.get("a"), { state: [3, 4], county: [2, 3] });
  assert.deepEqual(r.get("d"), { state: [4, 4], county: [3, 3] });
  assert.deepEqual(r.get("e"), { state: [1, 1], county: null });
});

test("the message names the county where there is one, and the state's size where there is not", () => {
  const r = ranksOf(people);
  assert.equal(badgeMessage(r.get("a"), "Mississippi", "Hinds", "county"), "#2 in Hinds County · #3 in Mississippi");
  assert.equal(badgeMessage(r.get("c"), "Mississippi", "", "county"), "#2 of 4 in Mississippi");
  assert.equal(badgeMessage({ state: [5, 9], county: [1, 2] }, "Louisiana", "Caddo", "parish"), "#1 in Caddo Parish · #5 in Louisiana");
});

test("the badge escapes its text, says it to screen readers, and is as wide as its parts", () => {
  const label = 'a <b> & "c"';
  const svg = badgeSvg(label, "#1 of 2 in Texas");
  assert.match(svg, /^<svg [^>]*role="img" aria-label="a &lt;b&gt; &amp; &quot;c&quot;: #1 of 2 in Texas">/);
  assert.ok(!svg.includes("<b>"));
  const w = Number(svg.match(/width="(\d+)"/)[1]);
  assert.ok(Math.abs(w - (6 + 16 + 4 + textWidth(label) + 6 + 6 + textWidth("#1 of 2 in Texas") + 6)) <= 1);
  assert.ok(textWidth("WWW") > textWidth("iii"));
});
