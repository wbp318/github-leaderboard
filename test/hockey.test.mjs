// Ice Storm's hockey (src/hockey.mjs): whole games, the computer on both sides, and the rules a
// player meets first: the boards, the posts and the goal, the goalie, passing, checking, faceoffs,
// and the controls.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeHockey, RINK, boards } from "../src/hockey.mjs";

const STEP = 1 / 60;
const run = (g, secs, each) => {
  for (let i = 0; i < secs / STEP; i++) {
    g.step(STEP);
    each?.(g);
  }
};
const until = (g, ok, secs = 30) => {
  for (let i = 0; i < secs / STEP; i++) {
    g.step(STEP);
    if (ok(g)) return true;
  }
  return false;
};
// Into live play, past the opening faceoff.
const live = (opts = {}) => {
  const g = makeHockey({ seed: 3, human: false, ...opts });
  assert.ok(until(g, (x) => x.phase === "live", 5), "the opening faceoff is won");
  return g;
};
// A rink in a known state: everyone well away, the puck set down where it's wanted.
function clear(g) {
  g.skaters.forEach((s, i) => Object.assign(s, { x: -60 + (i % 5) * 4, y: -38 + Math.floor(i / 5) * 4, vx: 0, vy: 0, cool: 0, down: 0 }));
}

test("whole games, computer against computer, at each level: they finish, with sensible scores and nothing out of the rink", () => {
  for (const level of [0, 1, 2]) {
    for (let seed = 1; seed <= 3; seed++) {
      const g = makeHockey({ seed, level, periodLen: 90, human: false });
      let bad = null;
      run(g, 12 * 60, (x) => {
        const p = x.puck;
        if (!Number.isFinite(p.x + p.y + p.z + p.vx + p.vy)) bad ??= "the puck went to NaN";
        if (Math.abs(p.x) > RINK.L + 0.01 || Math.abs(p.y) > RINK.W + 0.01) bad ??= `the puck left the rink at ${p.x}, ${p.y}`;
        for (const s of [...x.skaters, ...x.goalies]) {
          if (!Number.isFinite(s.x + s.y)) bad ??= "a player went to NaN";
          if (Math.abs(s.x) > RINK.L || Math.abs(s.y) > RINK.W) bad ??= `a player left the rink at ${s.x}, ${s.y}`;
        }
      });
      assert.equal(bad, null);
      assert.equal(g.phase, "final", `level ${level}, game ${seed} ends`);
      const goals = g.score[0] + g.score[1];
      assert.ok(goals <= 20, `level ${level}, game ${seed}: ${g.score.join("-")} is a hockey score`);
      assert.ok(g.shots[0] >= g.score[0] && g.shots[1] >= g.score[1], "every goal counts as a shot");
      assert.ok(g.period >= 3, "three periods at least");
      if (g.period === 3) assert.notEqual(g.score[0], g.score[1], "a tie after three goes to overtime");
    }
  }
});

test("over many games both sides score, and an even game is about even", () => {
  const tot = [0, 0];
  for (let seed = 1; seed <= 8; seed++) {
    const g = makeHockey({ seed, level: 1, periodLen: 120, human: false });
    run(g, 15 * 60);
    tot[0] += g.score[0];
    tot[1] += g.score[1];
  }
  assert.ok(tot[0] > 4 && tot[1] > 4, `goals ${tot.join(" to ")}`);
  assert.ok(tot[0] + tot[1] < 8 * 14, `about 3 to 12 goals a game: ${tot[0] + tot[1]} in 8`);
  assert.ok(Math.max(...tot) / Math.min(...tot) < 2.2, `neither side runs away with it: ${tot.join(" to ")}`);
});

test("the boards keep things in, corners included", () => {
  const o = { x: 120, y: 60 };
  assert.ok(boards(o, 1));
  assert.ok(Math.hypot(Math.abs(o.x) - (RINK.L - RINK.R), Math.abs(o.y) - (RINK.W - RINK.R)) <= RINK.R - 1 + 1e-9);
  const side = { x: 10, y: -50 };
  assert.deepEqual(boards(side, 0.5), [0, -1]);
  assert.equal(side.y, -RINK.W + 0.5);
  assert.equal(boards({ x: 0, y: 0 }, 1), null);
});

test("a puck fired into an empty net is a goal for the side attacking it, and the score and shots count it", () => {
  const g = live();
  clear(g);
  const a = g.att(0);
  g.goalies[1].y = 30;
  Object.assign(g.puck, { owner: null, x: a * 70, y: 0, z: 0.5, vx: a * 80, vy: 0, vz: 2, pass: null, shot: null, last: g.skaters[0] });
  g.events.length = 0;
  assert.ok(until(g, (x) => x.phase === "goal", 2));
  assert.deepEqual(g.score, [1, 0]);
  assert.equal(g.shots[0], 1);
  const e = g.events.find((x) => x.k === "goal");
  assert.equal(e.team, 0);
  assert.equal(e.by, g.skaters[0].num);
  assert.ok(until(g, (x) => x.phase === "faceoff", 5), "then a faceoff at centre");
  assert.deepEqual(g.dot, [0, 0]);
});

test("a puck at the post rings off it, and one over the bar isn't a goal", () => {
  const g = live();
  clear(g);
  const a = g.att(0);
  g.goalies[1].y = -30;
  Object.assign(g.puck, { owner: null, x: a * 75, y: RINK.MOUTH + 0.05, z: 0.3, vx: a * 60, vy: 0, vz: 1, pass: null, shot: null });
  g.events.length = 0;
  run(g, 0.6);
  assert.ok(g.events.some((e) => e.k === "post"), "it hits the post");
  assert.deepEqual(g.score, [0, 0]);
  const h = live();
  clear(h);
  h.goalies[1].y = -30;
  Object.assign(h.puck, { owner: null, x: a * 80, y: 0, z: 6, vx: a * 60, vy: 0, vz: 4, pass: null, shot: null });
  run(h, 1.5);
  assert.deepEqual(h.score, [0, 0], "over the bar");
});

test("the goalie stops most shots straight at him", () => {
  let saved = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const g = live({ seed });
    clear(g);
    const a = g.att(0), gl = g.goalies[1];
    Object.assign(gl, { x: a * (RINK.GOAL - 2.2), y: 0, vx: 0, vy: 0 });
    Object.assign(g.puck, { owner: null, x: a * 50, y: 0, z: 1, vx: a * 70, vy: 0, vz: 7, pass: null, last: g.skaters[0] });
    g.puck.shot = { team: 0, by: g.skaters[0], id: 99, oneTimer: false, rebound: false, deflected: false, dist: 39, counted: false };
    run(g, 1);
    if (g.score[0] === 0) saved++;
    assert.equal(g.shots[0], 1, "it counts as a shot either way");
  }
  assert.ok(saved >= 15, `${saved} of 20 saved`);
});

test("a pass reaches an open teammate", () => {
  let got = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const g = live({ seed });
    clear(g);
    const [s, t] = g.skaters;
    Object.assign(s, { x: 0, y: 0, face: 0 });
    Object.assign(t, { x: 30, y: 10 });
    Object.assign(g.puck, { owner: s });
    for (const o of g.skaters.slice(5)) Object.assign(o, { x: -80, y: 30 });
    // The computer passes when it's the right thing to do; here the side's own (you) does it.
    g.human = true;
    g.user = s;
    g.input = { mx: 1, my: 0.33, pass: true, shoot: false, burst: false };
    g.step(STEP);
    g.input = { mx: 0, my: 0, pass: false, shoot: false, burst: false };
    if (until(g, (x) => x.puck.owner === t, 2)) got++;
  }
  assert.ok(got >= 9, `${got} of 10 passes arrive`);
});

test("a check knocks the carrier down and the puck loose", () => {
  const g = makeHockey({ seed: 5, human: true });
  until(g, (x) => x.phase === "live", 5);
  clear(g);
  const me = g.skaters[0], them = g.skaters[5];
  Object.assign(them, { x: 10, y: 0, vx: 0, vy: 0, face: 0 });
  Object.assign(me, { x: 5, y: 0, vx: 18, vy: 0, face: 0 });
  g.puck.owner = them;
  g.user = me;
  g.input = { mx: 1, my: 0, pass: false, shoot: true, burst: false };
  g.events.length = 0;
  run(g, 0.5);
  assert.ok(g.events.some((e) => e.k === "hit"), "a hit");
  assert.ok(them.down > 0, "they go down");
  assert.notEqual(g.puck.owner, them, "and lose the puck");
});

test("you: the stick moves your skater, a tap of shoot is a wrist shot, holding it a slapshot, and a pass hands you the receiver", () => {
  const g = makeHockey({ seed: 9, human: true });
  until(g, (x) => x.phase === "live", 5);
  clear(g);
  const me = g.user;
  Object.assign(me, { x: 0, y: 0, vx: 0, vy: 0 });
  g.puck.owner = me;
  g.input = { mx: 0, my: 1, pass: false, shoot: false, burst: false };
  run(g, 0.5);
  assert.ok(me.y > 2 && me.vy > 5, "up the screen is +y");
  g.events.length = 0;
  g.input = { mx: 0, my: 0, pass: false, shoot: true, burst: false };
  run(g, 0.05);
  g.input.shoot = false;
  g.step(STEP);
  assert.equal(g.events.find((e) => e.k === "shot")?.kind, "wrist");
  g.puck.owner = me;
  me.cool = 0;
  g.events.length = 0;
  g.input.shoot = true;
  run(g, 0.6);
  assert.ok(me.wind > 0.5, "winding up");
  g.input.shoot = false;
  g.step(STEP);
  assert.equal(g.events.find((e) => e.k === "shot")?.kind, "slap");
  // A pass: control goes with it.
  g.puck.owner = me;
  me.cool = 0;
  const mate = g.skaters.find((s) => s.team === 0 && s !== me);
  Object.assign(mate, { x: me.x + 25, y: me.y, vx: 0, vy: 0 });
  g.input = { mx: 1, my: 0, pass: true, shoot: false, burst: false };
  g.step(STEP);
  assert.equal(g.user, mate);
});

test("faceoffs: pass or shoot as the puck lands wins it", () => {
  let won = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const g = makeHockey({ seed, human: true, level: 2 });
    until(g, (x) => x.phase === "drop", 3);
    run(g, 0.3);
    g.input.pass = true;
    g.events.length = 0;
    until(g, (x) => x.phase === "live", 3);
    if (g.events.find((e) => e.k === "won")?.team === 0) won++;
  }
  assert.ok(won >= 8, `${won} of 10 won, at All-Star`);
});

test("the ends change after each period, and a period ends with the horn", () => {
  const g = makeHockey({ seed: 2, periodLen: 5, human: false });
  const a = g.att(0);
  assert.ok(until(g, (x) => x.phase === "break", 15));
  assert.ok(g.events.some((e) => e.k === "horn"));
  assert.ok(until(g, (x) => x.period === 2, 6));
  assert.equal(g.att(0), -a);
  assert.equal(g.clock, 5);
});
