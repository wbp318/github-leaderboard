// Ice Storm's hockey: the rink, the players, the puck, and the rules, with nothing drawn and nothing
// from the browser or Node. The page carries a copy (the build puts it in the game's script, which
// draws it and reads the keys), and test/hockey.test.mjs plays whole games with it, the computer on
// both sides.
//
// Feet and seconds. x runs the length of the rink, from -100 to 100; y runs across it, from -42.5
// (the near boards, under the camera) to 42.5 (the far ones); z is up. Team 0 is the home team
// (yours, when someone is playing), team 1 the visitors. Five skaters and a goalie a side, and no
// offsides, icing, or penalties: arcade hockey, the way the old 16-bit games played it.

export const RINK = { L: 100, W: 42.5, R: 28, GOAL: 89, BLUE: 25, MOUTH: 3, BAR: 4, DEEP: 3.4, DOTX: 69, DOTY: 22, NDOTX: 20, CREASE: 6 };
export const ROLES = ["C", "LW", "RW", "LD", "RD"];
// Rookie, Pro, and All-Star: how the visitors skate, think, and win the puck, and how good each
// goalie is (save: yours, then theirs).
export const LEVELS = [
  { name: "Rookie", speed: 0.88, think: 0.42, steal: 0.6, check: 0.4, faceoff: [0.32, 0.62], save: [0.97, 0.86], aim: 0.8 },
  { name: "Pro", speed: 0.96, think: 0.3, steal: 0.95, check: 0.75, faceoff: [0.2, 0.5], save: [0.95, 0.93], aim: 1 },
  { name: "All-Star", speed: 1.02, think: 0.22, steal: 1.25, check: 1.05, faceoff: [0.12, 0.36], save: [0.93, 0.96], aim: 1.2 },
];
// The home side's computer players: the same at every level.
const HOME = { speed: 1, think: 0.28, steal: 1, check: 0.75, faceoff: [0.2, 0.5], aim: 1 };
// Where each skater lines up for a faceoff, from the dot: feet toward the goal they attack (u) and
// to their left (v).
const FO_SPOT = { C: [-2.2, 0], LW: [-3.5, 14], RW: [-3.5, -14], LD: [-19, 10], RD: [-19, -10] };
const NUMS = [[19, 27, 9, 4, 44, 31], [91, 13, 88, 2, 55, 1]];
const VMAX = 25, GRAV = 32, TAU = Math.PI * 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const angTo = (a, b) => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// How far p is from the segment a→b, and how far along it (0 to 1) the nearest point lies.
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return [Math.hypot(px - ax - dx * t, py - ay - dy * t), t];
}
// Keeps a circle of radius r inside the boards, a rectangle with rounded corners. Returns the
// boards' outward normal where it touched them, or null.
export function boards(o, r) {
  const cx = RINK.L - RINK.R, cy = RINK.W - RINK.R, ax = Math.abs(o.x), ay = Math.abs(o.y);
  if (ax > cx && ay > cy) {
    const dx = ax - cx, dy = ay - cy, d = Math.hypot(dx, dy), lim = RINK.R - r;
    if (d <= lim) return null;
    const sx = Math.sign(o.x), sy = Math.sign(o.y);
    o.x = sx * (cx + (dx / d) * lim);
    o.y = sy * (cy + (dy / d) * lim);
    return [(dx / d) * sx, (dy / d) * sy];
  }
  if (ax > RINK.L - r) {
    o.x = Math.sign(o.x) * (RINK.L - r);
    return [Math.sign(o.x), 0];
  }
  if (ay > RINK.W - r) {
    o.y = Math.sign(o.y) * (RINK.W - r);
    return [0, Math.sign(o.y)];
  }
  return null;
}
// Bounces a moving thing off a surface with outward normal n: e of the speed into it comes back,
// and f of the speed along it is kept. Returns the speed it hit with.
function bounce(o, n, e, f) {
  const vn = o.vx * n[0] + o.vy * n[1];
  if (vn <= 0) return 0;
  const tx = o.vx - vn * n[0], ty = o.vy - vn * n[1];
  o.vx = tx * f - vn * e * n[0];
  o.vy = ty * f - vn * e * n[1];
  return vn;
}
// Pushes a skater out of either net, which stands behind its goal line.
function nets(o, r) {
  for (const s of [1, -1]) {
    const x0 = RINK.GOAL - r, x1 = RINK.GOAL + RINK.DEEP + r, h = RINK.MOUTH + r, u = o.x * s;
    if (u <= x0 || u >= x1 || Math.abs(o.y) >= h) continue;
    const pen = [u - x0, x1 - u, h - Math.abs(o.y)];
    const m = pen.indexOf(Math.min(...pen));
    if (m === 0) o.x = x0 * s, (o.vx = Math.min(0, o.vx * s) * s);
    else if (m === 1) o.x = x1 * s, (o.vx = Math.max(0, o.vx * s) * s);
    else o.y = Math.sign(o.y || 1) * h, (o.vy = 0);
  }
}

export function makeHockey({ seed = 1, level = 1, periodLen = 180, human = true } = {}) {
  const R = rng(seed);
  const gauss = () => (R() + R() + R() + R() - 2) * 1.73;
  const LV = LEVELS[level] ?? LEVELS[1];
  const team = [{ ...HOME, save: LV.save[0] }, { ...LV, save: LV.save[1] }];
  const skaters = [];
  for (let t = 0; t < 2; t++) {
    ROLES.forEach((role, i) =>
      skaters.push({ team: t, role, i, num: NUMS[t][i], hand: i % 2 ? 1 : -1, r: 1.3, x: 0, y: 0, vx: 0, vy: 0, face: 0, want: [0, 0], burst: false,
        faceTo: null, down: 0, lunge: 0, lungeCd: 0, cool: 0, stam: 1, tired: false, wind: 0, windFor: 0, swing: 0, stride: 0, spray: 0, think: 0, plan: null, hold: 0 }),
    );
  }
  const goalies = [0, 1].map((t) => ({ team: t, role: "G", num: NUMS[t][5], r: 1.7, x: 0, y: 0, vx: 0, vy: 0, face: 0, react: 0, shotId: 0, judged: false, save: 0, down: 0, lunge: 0 }));
  const puck = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, prev: null, pass: null, shot: null, net: 0, still: 0 };
  const g = {
    t: 0, period: 1, periodLen, clock: periodLen, score: [0, 0], shots: [0, 0], phase: "faceoff", phaseT: 0, human, level, skaters, goalies, puck,
    user: null, input: { mx: 0, my: 0, pass: false, shoot: false, burst: false }, was: {}, events: [], dot: [0, 0], next: [0, 0], fo: null,
    shotId: 0, lastSave: -9, winner: -1, oneTimer: false, chase: [null, null], nearer: 0, marks: new Map(), step, att, blade,
  };
  const emit = (k, o = {}) => {
    g.events.push({ k, t: g.t, ...o });
    if (g.events.length > 400) g.events.splice(0, 200);
  };
  // Which way a team attacks: +1 toward x = 89, -1 toward x = -89. The ends change each period.
  function att(t) {
    return (t === 0 ? 1 : -1) * (g.period % 2 ? 1 : -1);
  }
  // Where a player's stick blade is on the ice: out in front, to the side they shoot from.
  function blade(s) {
    const c = Math.cos(s.face), n = Math.sin(s.face);
    if (s.role === "G") return [s.x + c * 1.6, s.y + n * 1.6];
    return [s.x + c * 2.3 - n * 0.6 * s.hand, s.y + n * 2.3 + c * 0.6 * s.hand];
  }
  const pressed = (k) => g.input[k] && !g.was[k];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // ---------------------------------------------------------------- stoppages and the clock
  function faceoff(fx, fy) {
    g.phase = "faceoff";
    g.phaseT = 0;
    g.dot = [fx, fy];
    g.fo = null;
    g.oneTimer = false;
    for (const s of skaters) {
      const a = att(s.team), [u, v] = FO_SPOT[s.role];
      s.x = clamp(fx + a * u, -82, 82);
      s.y = fy + a * v;
      boards(s, s.r);
      nets(s, s.r);
      Object.assign(s, { vx: 0, vy: 0, face: a > 0 ? 0 : Math.PI, want: [0, 0], down: 0, lunge: 0, wind: 0, cool: 0, swing: 0, think: 0, plan: null, hold: 0, faceTo: null });
    }
    for (const gl of goalies) {
      const a = att(gl.team);
      Object.assign(gl, { x: -a * (RINK.GOAL - 2.2), y: 0, vx: 0, vy: 0, face: a > 0 ? 0 : Math.PI, react: 0, judged: false, save: 0 });
    }
    Object.assign(puck, { x: fx, y: fy, z: 3.5, vx: 0, vy: 0, vz: 0, owner: null, last: null, prev: null, pass: null, shot: null, net: 0, still: 0 });
    if (human) g.user = skaters.find((s) => s.team === 0 && s.role === "C");
    emit("faceoff", { x: fx, y: fy });
  }
  // The referee drops the puck, and the centres swipe at it: whoever's first wins it back to a defenceman.
  // You win it by pressing pass or shoot as it lands; too early and you're late.
  function drop(dt) {
    puck.vz -= GRAV * dt;
    puck.z = Math.max(0, puck.z + puck.vz * dt);
    if (!g.fo) {
      const at = [0, 1].map((t) => 0.3 + team[t].faceoff[0] + R() * (team[t].faceoff[1] - team[t].faceoff[0]));
      if (human) at[0] = 1.05 + R() * 0.3;
      g.fo = { at };
    }
    if (human && (pressed("pass") || pressed("shoot"))) g.fo.at[0] = Math.min(g.fo.at[0], g.phaseT < 0.26 ? 0.62 : g.phaseT);
    const w = g.fo.at[0] === g.fo.at[1] ? (R() < 0.5 ? 0 : 1) : g.fo.at[0] < g.fo.at[1] ? 0 : 1;
    if (g.phaseT < g.fo.at[w]) return;
    const c = skaters.find((s) => s.team === w && s.role === "C"), loser = skaters.find((s) => s.team !== w && s.role === "C");
    const back = R() < 0.5 ? "LD" : "RD";
    const d = skaters.find((s) => s.team === w && s.role === back);
    const dx = d.x - puck.x, dy = d.y - puck.y, l = Math.hypot(dx, dy) || 1;
    Object.assign(puck, { z: 0, vz: 0, vx: (dx / l) * 30, vy: (dy / l) * 30 });
    touch(c);
    puck.pass = { to: d, from: c, t: g.t };
    c.cool = 0.3;
    loser.cool = 0.35;
    g.phase = "live";
    g.phaseT = 0;
    emit("won", { team: w });
  }
  function whistle(x, y) {
    g.phase = "whistle";
    g.phaseT = 0;
    g.next = [x, y];
    emit("whistle");
  }
  function endPeriod() {
    emit("horn", { period: g.period });
    if (g.period >= 4 || (g.period >= 3 && g.score[0] !== g.score[1])) return end();
    g.phase = "break";
    g.phaseT = 0;
  }
  function end() {
    g.phase = "final";
    g.phaseT = 0;
    g.winner = g.score[0] === g.score[1] ? -1 : g.score[0] > g.score[1] ? 0 : 1;
    emit("final", { winner: g.winner });
  }
  // The faceoff dot nearest a spot: centre ice, the four in the neutral zone, or the four in the ends.
  function nearestDot(x, y) {
    const dots = [[0, 0]];
    for (const sx of [1, -1]) for (const sy of [1, -1]) dots.push([sx * RINK.NDOTX, sy * RINK.DOTY], [sx * RINK.DOTX, sy * RINK.DOTY]);
    return dots.reduce((b, d) => (Math.hypot(d[0] - x, d[1] - y) < Math.hypot(b[0] - x, b[1] - y) ? d : b));
  }

  // ---------------------------------------------------------------- the puck changing hands
  function touch(s) {
    if (puck.last !== s) {
      puck.prev = puck.last;
      puck.last = s;
    }
    for (const gl of goalies) gl.judged = false;
  }
  function take(s) {
    const pass = puck.pass;
    puck.owner = s;
    puck.z = puck.vz = 0;
    touch(s);
    puck.pass = puck.shot = null;
    s.hold = 0;
    s.think = 0.05;
    emit("take", { team: s.team });
    if (human && s.team === 0) {
      g.user = s;
      if (g.oneTimer) {
        g.oneTimer = false;
        return shoot(s, 0.85, aimOf(g.input.my), "slap", true);
      }
    } else if (human && s.team === 1) {
      // The other side has it: you take over whoever's nearest, if that's well nearer than you are.
      const near = closest(0);
      if (near && g.user && dist(g.user, puck) - dist(near, puck) > 14) setUser(near);
    }
    g.oneTimer = false;
    // A pass to someone in a good spot: one-timer.
    if (!(human && s.team === 0) && pass?.to === s && pass.from.team === s.team && shotQ(s) > 0.42 && R() < 0.55) shoot(s, 0.8, null, "slap", true);
  }
  function loose(o, vx, vy) {
    puck.owner = null;
    Object.assign(puck, { vx, vy, vz: 0, z: 0 });
    o.cool = Math.max(o.cool, 0.45);
    o.wind = 0;
  }
  function closest(t) {
    let best = null, bd = 1e9;
    for (const s of skaters) {
      if (s.team !== t || s.down > 0) continue;
      const d = dist(s, puck);
      if (d < bd) [best, bd] = [s, d];
    }
    return best;
  }
  function setUser(s) {
    if (s === g.user) return;
    g.user = s;
    emit("switch");
  }

  // ---------------------------------------------------------------- passing and shooting
  function pass(s, t) {
    const [bx, by] = blade(s);
    let tx = t.x, ty = t.y;
    const sp = clamp(28 + Math.hypot(t.x - bx, t.y - by) * 0.75, 38, 76);
    for (let k = 0; k < 2; k++) {
      const T = Math.hypot(tx - bx, ty - by) / sp;
      tx = t.x + t.vx * T * 0.9;
      ty = t.y + t.vy * T * 0.9;
    }
    const aim = { x: tx, y: ty };
    boards(aim, 2);
    const a = Math.atan2(aim.y - by, aim.x - bx) + gauss() * 0.025;
    release(s, bx, by, Math.cos(a) * sp, Math.sin(a) * sp, 0);
    puck.pass = { to: t, from: s, t: g.t };
    emit("pass", { team: s.team });
  }
  function passTo(s, ang, sp) {
    const [bx, by] = blade(s);
    release(s, bx, by, Math.cos(ang) * sp, Math.sin(ang) * sp, 0);
    emit("pass", { team: s.team });
  }
  function release(s, bx, by, vx, vy, vz) {
    const p = { x: bx, y: by };
    boards(p, 0.3);
    nets(p, 0.3);
    Object.assign(puck, { owner: null, x: p.x, y: p.y, z: 0.05, vx, vy, vz, pass: null, shot: null });
    s.cool = 0.3;
    s.hold = 0;
    s.wind = 0;
    s.swing = 0.3;
  }
  // A shot at the far goal: aim +1 for the far post (up the screen), -1 for the near, or null to
  // pick the side the goalie leaves open. A slapshot is harder and less sure than a wrist shot.
  const aimOf = (my) => (my > 0.35 ? 1 : my < -0.35 ? -1 : null);
  function shoot(s, power, aim, kind, oneTimer = false) {
    const a = att(s.team), gx = a * RINK.GOAL, gl = goalies[1 - s.team];
    const [bx, by] = blade(s);
    let ty = aim === null ? (Math.abs(gl.y) > 0.4 ? -Math.sign(gl.y) * 2.2 : (R() < 0.5 ? -1 : 1) * 2.2) : aim * 2.3;
    const d = Math.max(4, Math.hypot(gx - bx, ty - by));
    ty += (gauss() * (0.5 + d * 0.016 + power * 0.45)) / team[s.team].aim;
    const sp = (kind === "slap" ? 84 + power * 32 : 64 + power * 22) * (oneTimer ? 1.06 : 1);
    const T = Math.hypot(gx - bx, ty - by) / sp;
    const tz = clamp(0.3 + R() * (kind === "slap" ? 3 : 2.5), 0.15, 4.6);
    const l = Math.hypot(gx - bx, ty - by) || 1;
    release(s, bx, by, ((gx - bx) / l) * sp, ((ty - by) / l) * sp, (tz - 0.05 + (GRAV / 2) * T * T) / T);
    puck.shot = { team: s.team, by: s, id: ++g.shotId, oneTimer, rebound: g.t - g.lastSave < 1.3, deflected: false, dist: d, counted: false };
    s.swing = kind === "slap" ? 0.45 : 0.3;
    emit("shot", { team: s.team, kind, power, oneTimer });
  }
  // Out of trouble: a hard one off the boards, up the ice.
  function clear(s) {
    const a = att(s.team), [bx, by] = blade(s);
    const ang = Math.atan2((R() < 0.5 ? 1 : -1) * 30 - by, a * 95 - bx);
    release(s, bx, by, Math.cos(ang) * 68, Math.sin(ang) * 68, 2);
    emit("shot", { team: s.team, kind: "clear", power: 0.6 });
  }
  // How good a place s is to shoot from: close, in front, and with no one in the way.
  function shotQ(s) {
    const a = att(s.team), gx = a * RINK.GOAL, ahead = (gx - s.x) * a;
    if (ahead < 3) return 0;
    const d = Math.hypot(gx - s.x, s.y), ang = Math.atan2(Math.abs(s.y), ahead);
    let q = clamp(1.25 - d / 42, 0, 1) * clamp(1.35 - ang / 1.05, 0, 1);
    for (const o of skaters) {
      if (o.team === s.team || o.down > 0) continue;
      const [dd, t] = segDist(o.x, o.y, s.x, s.y, gx, 0);
      if (dd < 2.2 && t > 0.05 && t < 0.92) q *= 0.55;
    }
    return q;
  }
  function nearestOpp(s) {
    let o = null, d = 1e9;
    for (const x of skaters) {
      if (x.team === s.team || x.down > 0) continue;
      const e = dist(s, x);
      if (e < d) [o, d] = [x, e];
    }
    const a = att(s.team);
    return { o, d, front: o ? (o.x - s.x) * a > -2 : false };
  }
  // The open teammate worth passing to, if any: up the ice, in a spot to shoot, with a clear lane.
  function bestPass(s) {
    const a = att(s.team), [bx, by] = blade(s);
    let best = null;
    for (const t of skaters) {
      if (t.team !== s.team || t === s || t.down > 0) continue;
      const d = dist(s, t);
      if (d < 9 || d > 90) continue;
      const T = d / 60, tx = t.x + t.vx * T, ty = t.y + t.vy * T;
      let lane = 1e9, open = 1e9;
      for (const o of [...skaters, ...goalies]) {
        if (o.team === s.team || o.down > 0) continue;
        const [dd, k] = segDist(o.x, o.y, bx, by, tx, ty);
        if (k > 0.04 && k < 0.97) lane = Math.min(lane, dd);
        open = Math.min(open, Math.hypot(o.x - tx, o.y - ty));
      }
      if (lane < 3.4) continue;
      const v = (tx - s.x) * a * 0.5 + shotQ(t) * 45 + Math.min(open, 20) * 0.8 - d * 0.08;
      if (!best || v > best.v) best = { t, v };
    }
    return best;
  }

  // ---------------------------------------------------------------- the computer's players
  // Each step: who goes for the puck on each side, which side is nearer it, and who marks whom.
  function roles() {
    const d = [1e9, 1e9];
    for (const t of [0, 1]) {
      g.chase[t] = null;
      for (const s of skaters) {
        if (s.team !== t || s.down > 0) continue;
        const e = dist(s, puck) - Math.max(0, ((puck.x - s.x) * puck.vx + (puck.y - s.y) * puck.vy) / 40);
        if (e < d[t]) [d[t], g.chase[t]] = [e, s];
      }
    }
    g.nearer = d[0] <= d[1] ? 0 : 1;
    // Your side: the computer goes for it only when you're not close yourself.
    if (human && g.user) {
      const ud = g.user.down > 0 ? 1e9 : dist(g.user, puck);
      if (g.chase[0] === g.user || ud < 13) g.chase[0] = null;
      if (!g.chase[0] && ud >= 13) {
        let b = null, bd = 1e9;
        for (const s of skaters) if (s.team === 0 && s !== g.user && s.down <= 0 && dist(s, puck) < bd) [b, bd] = [s, dist(s, puck)];
        if (b && bd < ud) g.chase[0] = b;
      }
    }
    g.marks.clear();
    const owner = puck.owner;
    for (const t of [0, 1]) {
      const defending = owner ? owner.team !== t : g.nearer !== t;
      if (!defending) continue;
      const free = skaters.filter((o) => o.team !== t && o !== owner && o.down <= 0);
      for (const role of ["LD", "RD", "C", "LW", "RW"]) {
        const s = skaters.find((x) => x.team === t && x.role === role);
        if (s === g.chase[t] || (human && s === g.user) || !free.length) continue;
        const [sx, sy] = zoneSpot(s);
        let k = 0;
        for (let j = 1; j < free.length; j++) if (Math.hypot(free[j].x - sx, free[j].y - sy) < Math.hypot(free[k].x - sx, free[k].y - sy)) k = j;
        if (Math.hypot(free[k].x - sx, free[k].y - sy) < 28) g.marks.set(s, free.splice(k, 1)[0]);
      }
    }
  }
  const inRink = (x, y, m) => {
    const p = { x, y };
    boards(p, m);
    nets(p, 1.5);
    return [p.x, p.y];
  };
  // With the puck: spread out ahead of it, wingers wide, the centre in the middle, the defence back.
  function attackSpot(s) {
    const a = att(s.team), pu = puck.x * a, pv = puck.y * a, wob = Math.sin(g.t * 0.6 + s.i * 1.7) * 4;
    let u, v;
    if (s.role === "C") [u, v] = [clamp(pu + 10, -55, 62), clamp(-pv * 0.5, -12, 12) + wob];
    else if (s.role === "LW") [u, v] = [clamp(pu + 20, -45, 78), (pu > 45 ? 14 : 24) + wob];
    else if (s.role === "RW") [u, v] = [clamp(pu + 20, -45, 78), -(pu > 45 ? 14 : 24) + wob];
    else [u, v] = [clamp(pu - 32, -70, 34), s.role === "LD" ? 16 : -16];
    const c = puck.owner;
    if (c && c !== s) {
      const du = u - c.x * a, dv = v - c.y * a, d = Math.hypot(du, dv) || 1;
      if (d < 10) [u, v] = [c.x * a + (du / d) * 10, c.y * a + (dv / d) * 10];
    }
    return inRink(u * a, v * a, 3);
  }
  // Without it: between the puck and your own net, the defence nearest the net.
  function zoneSpot(s) {
    const a = att(s.team), pu = puck.x * a, pv = puck.y * a, gu = -RINK.GOAL + 3;
    const T = { C: 0.5, LW: 0.62, RW: 0.62, LD: 0.3, RD: 0.3 }[s.role];
    const side = { C: 0, LW: 1, RW: -1, LD: 1, RD: -1 }[s.role];
    const u = clamp(gu + (pu - gu) * T, -84, Math.max(-84, pu - 4));
    const v = pv * T + side * (s.role[1] === "D" ? 8 : 16);
    return inRink(u * a, v * a, 3);
  }
  function guardSpot(s) {
    const [zx, zy] = zoneSpot(s), m = g.marks.get(s);
    if (!m) return [zx, zy];
    const gx = -att(s.team) * RINK.GOAL, d = Math.hypot(gx - m.x, m.y) || 1;
    // Goal-side of the one you're marking.
    const mx = m.x + ((gx - m.x) / d) * 3, my = m.y + ((0 - m.y) / d) * 3;
    return [zx * 0.35 + mx * 0.65, zy * 0.35 + my * 0.65];
  }
  function seek(s, tx, ty, speed) {
    const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
    const v = Math.min(speed, d * 2.2);
    s.want = d > 0.4 ? [(dx / d) * v, (dy / d) * v] : [0, 0];
  }
  function lunge(s) {
    if (s.lungeCd > 0 || s.down > 0) return;
    s.lunge = 0.32;
    s.lungeCd = 1;
    s.vx += Math.cos(s.face) * 12;
    s.vy += Math.sin(s.face) * 12;
    const v = Math.hypot(s.vx, s.vy);
    if (v > 36) (s.vx *= 36 / v), (s.vy *= 36 / v);
    emit("lunge", { team: s.team });
  }
  function offPuck(s) {
    const o = puck.owner, mine = g.chase[s.team] === s;
    s.burst = false;
    s.faceTo = null;
    if (puck.pass?.to === s && !o) {
      // The pass coming your way: meet it.
      const [, t] = segDist(s.x, s.y, puck.x, puck.y, puck.x + puck.vx * 1.2, puck.y + puck.vy * 1.2);
      return seek(s, puck.x + puck.vx * 1.2 * t, puck.y + puck.vy * 1.2 * t, 30);
    }
    if (!o || o.role === "G") {
      if (mine && !o) {
        const lead = clamp(dist(s, puck) / 34, 0, 0.8);
        s.burst = dist(s, puck) > 22 && s.stam > 0.5;
        const p = inRink(puck.x + puck.vx * lead, puck.y + puck.vy * lead, 1);
        return seek(s, p[0], p[1], 34);
      }
      const [x, y] = g.nearer === s.team ? attackSpot(s) : guardSpot(s);
      return seek(s, x, y, 26);
    }
    if (o.team === s.team) {
      const [x, y] = attackSpot(s);
      return seek(s, x, y, 26);
    }
    if (mine) {
      // Pressure the carrier, from the goal side, with a check when it's there to be made.
      const gx = -att(s.team) * RINK.GOAL, d = dist(s, o);
      const k = Math.min(1, d / 30);
      seek(s, o.x + o.vx * 0.3 * k + (gx - o.x) * 0.03, o.y + o.vy * 0.3 * k - o.y * 0.03, 34);
      s.burst = d > 10 && s.stam > 0.4;
      if (d < 4.6 && s.lungeCd <= 0 && R() < team[s.team].check * 0.05) {
        s.face = Math.atan2(o.y - s.y, o.x - s.x);
        lunge(s);
      }
      return;
    }
    const [x, y] = guardSpot(s);
    seek(s, x, y, 27);
  }
  function carrier(s, dt) {
    const a = att(s.team), gx = a * RINK.GOAL;
    s.hold += dt;
    s.burst = false;
    if (s.wind > 0) {
      s.wind += dt;
      s.want = [s.vx * 0.6, s.vy * 0.6];
      s.faceTo = Math.atan2(-s.y, gx - s.x);
      if (s.wind >= s.windFor) shoot(s, clamp(s.wind / 0.8, 0.45, 1), null, "slap");
      return;
    }
    s.faceTo = null;
    s.think -= dt;
    const press = nearestOpp(s);
    if (s.think <= 0) {
      s.think = team[s.team].think * (0.6 + R() * 0.8);
      const q = shotQ(s), urge = Math.min(0.3, s.hold * 0.035);
      if (q > 0.6 - urge || (q > 0.3 && press.d < 6 && press.front)) {
        if (press.d > 12 && Math.hypot(gx - s.x, s.y) > 30 && R() < 0.55) {
          s.wind = 0.01;
          s.windFor = 0.35 + R() * 0.35;
        } else shoot(s, 0.3 + R() * 0.4, null, "wrist");
        return;
      }
      const best = bestPass(s);
      const keep = Math.min(press.d, 20) * 0.8 + q * 45 + 4 - s.hold * 1.5;
      if (best && (best.v > keep + 6 || (press.d < 5.5 && press.front && best.v > keep - 12))) return pass(s, best.t);
      if (s.x * a < -30 && press.d < 6 && press.front && !best) return clear(s);
      const u = s.x * a, v = s.y * a;
      s.plan = u > 84 ? [66, v * 0.5] : u < 52 ? [Math.min(u + 40, 72), clamp(v * 0.6 + (R() - 0.5) * 16, -16, 16)] : [74, (Math.sign(v) || 1) * (4 + R() * 6)];
    }
    if (!s.plan) s.plan = [72, 0];
    let dx = s.plan[0] * a - s.x, dy = s.plan[1] * a - s.y;
    const l = Math.hypot(dx, dy) || 1;
    [dx, dy] = [dx / l, dy / l];
    let open = true;
    for (const o of skaters) {
      if (o.team === s.team || o.down > 0) continue;
      const rx = s.x - o.x, ry = s.y - o.y, d = Math.hypot(rx, ry);
      if (d > 14 || d < 0.01 || -(rx * dx + ry * dy) < -3) continue;
      open = false;
      const w = ((14 - d) / 14) * 1.4;
      dx += (rx / d) * w;
      dy += (ry / d) * w;
    }
    const m = Math.hypot(dx, dy) || 1;
    s.want = [(dx / m) * 30, (dy / m) * 30];
    s.burst = open && s.stam > 0.4 && s.x * a < 60;
  }

  // ---------------------------------------------------------------- you
  function you(dt) {
    const s = g.user;
    if (!s) return;
    const inp = g.input;
    let { mx, my } = inp;
    const m = Math.hypot(mx, my);
    if (m > 1) (mx /= m), (my /= m);
    s.want = s.down > 0 ? [0, 0] : [mx * 34, my * 34];
    s.burst = inp.burst;
    s.faceTo = null;
    if (s.down > 0) return;
    if (puck.owner === s) {
      if (pressed("pass")) {
        s.wind = 0;
        const t = passPick(s, mx, my);
        if (t?.t) {
          pass(s, t.t);
          setUser(t.t);
        } else passTo(s, t.ang, 52);
        return;
      }
      if (inp.shoot) s.wind = Math.max(s.wind, 0.001) + dt;
      else if (s.wind > 0) {
        const w = s.wind;
        if (w < 0.16) shoot(s, 0.4, aimOf(my), "wrist");
        else shoot(s, clamp(w / 0.75, 0.3, 1), aimOf(my), "slap");
      }
      return;
    }
    s.wind = 0;
    if (pressed("pass")) {
      let b = null, bd = 1e9;
      for (const t of skaters) if (t.team === 0 && t !== s && dist(t, puck) < bd) [b, bd] = [t, dist(t, puck)];
      if (b) setUser(b);
    } else if (pressed("shoot")) {
      const [bx, by] = blade(s);
      if (puck.pass?.to === s) g.oneTimer = true;
      else if (!puck.owner && Math.hypot(puck.x - bx, puck.y - by) < 3 && puck.z < 1.5 && s.cool <= 0) {
        // A loose puck at your stick: one touch, straight at the net.
        take(s);
        if (puck.owner === s) shoot(s, 0.75, aimOf(my), "slap", true);
      } else lunge(s);
    }
  }
  // Whom a pass from you goes to: the teammate most nearly the way you're pushing (or facing);
  // with no one that way, the puck goes into the space there.
  function passPick(s, mx, my) {
    const ang = Math.hypot(mx, my) > 0.3 ? Math.atan2(my, mx) : s.face;
    const ux = Math.cos(ang), uy = Math.sin(ang);
    let best = null, bv = -1e9;
    for (const t of skaters) {
      if (t.team !== s.team || t === s || t.down > 0) continue;
      const dx = t.x - s.x, dy = t.y - s.y, d = Math.hypot(dx, dy) || 1, c = (dx * ux + dy * uy) / d;
      if (c < 0.45) continue;
      const v = c - d / 260;
      if (v > bv) [best, bv] = [t, v];
    }
    return { t: best, ang };
  }

  // ---------------------------------------------------------------- moving
  function skate(s, dt) {
    s.lungeCd -= dt;
    s.lunge = Math.max(0, s.lunge - dt);
    s.swing = Math.max(0, s.swing - dt);
    s.cool = Math.max(0, s.cool - dt);
    s.spray = Math.max(0, s.spray - dt);
    if (s.down > 0) {
      s.down -= dt;
      const k = Math.max(0, 1 - 2.4 * dt);
      s.vx *= k;
      s.vy *= k;
    } else if (s.lunge <= 0) {
      let vmax = VMAX * team[s.team].speed;
      if (puck.owner === s) vmax *= 0.93;
      if (s.wind > 0) vmax *= 0.5;
      if (s.burst && !s.tired) {
        vmax *= 1.28;
        s.stam -= 0.32 * dt;
        if (s.stam <= 0.05) s.tired = true;
      } else {
        s.stam = Math.min(1, s.stam + 0.12 * dt);
        if (s.stam > 0.3) s.tired = false;
      }
      let [wx, wy] = s.want;
      const wm = Math.hypot(wx, wy);
      if (wm < 0.05) {
        const k = Math.max(0, 1 - 0.7 * dt);
        s.vx *= k;
        s.vy *= k;
      } else {
        if (wm > vmax) (wx *= vmax / wm), (wy *= vmax / wm);
        const dvx = wx - s.vx, dvy = wy - s.vy, dv = Math.hypot(dvx, dvy), sp = Math.hypot(s.vx, s.vy);
        const braking = dvx * s.vx + dvy * s.vy < -0.5 * sp * dv;
        const acc = (braking ? 58 : 34) * dt;
        if (dv > acc) {
          s.vx += (dvx / dv) * acc;
          s.vy += (dvy / dv) * acc;
        } else [s.vx, s.vy] = [wx, wy];
        if (braking && sp > 15) s.spray = 0.2;
      }
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    const n = boards(s, s.r);
    if (n) bounce(s, n, 0.25, 0.9);
    nets(s, s.r);
    const sp = Math.hypot(s.vx, s.vy);
    const fa = s.faceTo ?? (sp > 2.5 ? Math.atan2(s.vy, s.vx) : Math.atan2(puck.y - s.y, puck.x - s.x));
    if (s.down <= 0) s.face += clamp(angTo(s.face, fa), -9 * dt, 9 * dt);
    s.stride += sp * dt * 0.3;
  }
  function knock(v, h, force) {
    v.down = 1 + Math.min(0.7, force / 40);
    v.lunge = v.wind = 0;
    if (puck.owner === v) loose(v, v.vx * 0.6 + h.vx * 0.3 + gauss() * 6, v.vy * 0.6 + h.vy * 0.3 + gauss() * 6);
    v.cool = v.down + 0.2;
    h.lunge = 0;
    h.vx *= 0.55;
    h.vy *= 0.55;
    emit("hit", { team: h.team, force: Math.min(1, force / 30), x: v.x, y: v.y });
  }
  function collide() {
    const all = [...skaters, ...goalies];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const A = all[i], B = all[j];
        if (A.down > 0 || B.down > 0) continue;
        const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), min = A.r + B.r;
        if (d >= min || d < 1e-6) continue;
        const nx = dx / d, ny = dy / d, ov = min - d;
        const ia = A.role === "G" ? 0.12 : 1, ib = B.role === "G" ? 0.12 : 1, im = ia + ib;
        A.x -= nx * ov * (ia / im);
        A.y -= ny * ov * (ia / im);
        B.x += nx * ov * (ib / im);
        B.y += ny * ov * (ib / im);
        const vn = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
        if (vn >= 0) continue;
        if (A.team !== B.team && -vn > 5) {
          if (A.lunge > 0 && B.role !== "G") knock(B, A, -vn);
          else if (B.lunge > 0 && A.role !== "G") knock(A, B, -vn);
        }
        const J = (-1.25 * vn) / im;
        A.vx -= J * nx * ia;
        A.vy -= J * ny * ia;
        B.vx += J * nx * ib;
        B.vy += J * ny * ib;
      }
    }
  }

  // ---------------------------------------------------------------- the goalies
  function goalie(gl, dt) {
    const a = att(gl.team), gx = -a * RINK.GOAL;
    gl.save = Math.max(0, gl.save - dt);
    gl.react = Math.max(0, gl.react - dt);
    if (puck.shot && puck.shot.team !== gl.team && puck.shot.id !== gl.shotId) {
      gl.shotId = puck.shot.id;
      gl.react = 0.1 + R() * 0.12;
    }
    let tx, ty, top = 11;
    const coming = !puck.owner && puck.vx * a < -20 ? (gl.x - puck.x) / puck.vx : -1;
    const yp = coming > 0 ? puck.y + puck.vy * coming : 0;
    if (coming > 0 && Math.abs(yp) < 6 && gl.react <= 0) {
      tx = gx + a * 2.2;
      ty = clamp(yp, -3.4, 3.4);
      top = 20;
    } else {
      const ang = clamp(Math.atan2(puck.y, (puck.x - gx) * a), -1.25, 1.25);
      const out = clamp(Math.hypot(puck.x - gx, puck.y) * 0.06, 1.4, 3.2);
      tx = gx + a * Math.cos(ang) * out;
      ty = clamp(Math.sin(ang) * out * 1.25, -3, 3);
    }
    const dx = tx - gl.x, dy = ty - gl.y, d = Math.hypot(dx, dy), v = Math.min(top, d * 6);
    const wx = d > 0.05 ? (dx / d) * v : 0, wy = d > 0.05 ? (dy / d) * v : 0;
    const acc = 90 * dt, dvx = wx - gl.vx, dvy = wy - gl.vy, dv = Math.hypot(dvx, dvy);
    if (dv > acc) (gl.vx += (dvx / dv) * acc), (gl.vy += (dvy / dv) * acc);
    else [gl.vx, gl.vy] = [wx, wy];
    gl.x += gl.vx * dt;
    gl.y += gl.vy * dt;
    gl.face += clamp(angTo(gl.face, Math.atan2(puck.y - gl.y, puck.x - gl.x)), -8 * dt, 8 * dt);
  }
  function countShot(t) {
    if (puck.shot ? !puck.shot.counted && puck.shot.team === t : true) g.shots[t]++;
    if (puck.shot) puck.shot.counted = true;
  }
  // The puck reaching a goalie: a slow one (or one going away) is his; a shot is saved or not.
  function judge(gl) {
    const a = att(gl.team), d = Math.hypot(puck.x - gl.x, puck.y - gl.y);
    if (d > 4) gl.judged = false;
    if (gl.judged || d > 2.1 || puck.z > 4.4) return;
    gl.judged = true;
    const sp = Math.hypot(puck.vx, puck.vy), toward = puck.vx * a < 0;
    if (sp < 28 || !toward) return goalieGets(gl);
    const sh = puck.shot;
    let p = team[gl.team].save;
    const off = Math.min(1, d / 2.1);
    p *= 1 - 0.15 * off * off;
    p *= clamp(1.1 - sp / 500, 0.84, 1.02);
    if (sh?.oneTimer) p *= 0.78;
    if (sh?.rebound) p *= 0.82;
    if (sh?.deflected) p *= 0.78;
    if (sh) p *= clamp(0.94 + sh.dist / 300, 0.94, 1.08);
    if (R() >= p) return;
    countShot(1 - gl.team);
    gl.save = 0.5;
    g.lastSave = g.t;
    if ((sp < 80 && R() < 0.42) || (puck.z > 2.6 && R() < 0.55)) {
      Object.assign(puck, { owner: gl, vx: 0, vy: 0, vz: 0, shot: null, pass: null });
      emit("save", { team: gl.team, held: true });
      return whistle(-a * RINK.DOTX, (puck.y >= 0 ? 1 : -1) * RINK.DOTY);
    }
    // A rebound, back out in front.
    Object.assign(puck, { x: gl.x + a * 1.9, vx: a * sp * (0.14 + R() * 0.16), vy: gauss() * 11 + puck.vy * 0.1, vz: R() * 5, z: Math.max(puck.z, 0.3), shot: null, pass: null });
    emit("save", { team: gl.team, held: false });
  }
  // A loose puck at the goalie's feet: he passes it out to a defenceman if no one's near, or covers it.
  function goalieGets(gl) {
    const a = att(gl.team);
    const near = skaters.some((s) => s.team !== gl.team && s.down <= 0 && dist(s, gl) < 10);
    const ds = skaters.filter((s) => s.team === gl.team && s.down <= 0 && s.role[1] === "D").sort((x, y) => dist(x, gl) - dist(y, gl));
    if (near || !ds.length || g.phase !== "live") {
      Object.assign(puck, { owner: gl, vx: 0, vy: 0, vz: 0, z: 0, shot: null, pass: null });
      emit("save", { team: gl.team, held: true, cover: true });
      return whistle(-a * RINK.DOTX, (puck.y >= 0 ? 1 : -1) * RINK.DOTY);
    }
    const t = ds[0];
    const dx = t.x - gl.x, dy = t.y - gl.y, l = Math.hypot(dx, dy) || 1;
    Object.assign(puck, { owner: null, x: gl.x + a * 1.8, y: gl.y, z: 0, vx: (dx / l) * 45, vy: (dy / l) * 45, vz: 0, shot: null, pass: { to: t, from: gl, t: g.t } });
    emit("pass", { team: gl.team });
  }

  // ---------------------------------------------------------------- the puck
  function carry() {
    const o = puck.owner;
    if (o.role === "G") return Object.assign(puck, { x: o.x, y: o.y, z: 1.5, vx: 0, vy: 0, vz: 0 });
    const [bx, by] = blade(o);
    const sway = o.wind > 0 ? 0 : Math.sin(g.t * 9 + o.i) * 0.35;
    Object.assign(puck, { x: bx - Math.sin(o.face) * sway, y: by + Math.cos(o.face) * sway, z: 0, vx: o.vx, vy: o.vy, vz: 0 });
    boards(puck, 0.2);
    nets(puck, 0.3);
  }
  function free(dt) {
    const sp = Math.hypot(puck.vx, puck.vy, puck.vz);
    const n = Math.max(1, Math.ceil((sp * dt) / 0.45));
    const h = dt / n;
    for (let i = 0; i < n && !puck.owner && (g.phase === "live" || g.phase === "goal"); i++) {
      const px = puck.x, py = puck.y;
      puck.x += puck.vx * h;
      puck.y += puck.vy * h;
      puck.z += puck.vz * h;
      puck.vz -= GRAV * h;
      if (puck.z <= 0) {
        puck.z = 0;
        puck.vz = puck.vz < -5 ? -puck.vz * 0.3 : 0;
      }
      if (puck.z === 0) {
        const v = Math.hypot(puck.vx, puck.vy), k = v > 0 ? (Math.max(0, v - (puck.net ? 30 : 5) * h) * (1 - 0.12 * h)) / v : 0;
        puck.vx *= k;
        puck.vy *= k;
      }
      if (puck.net) {
        inNet();
        continue;
      }
      const nb = boards(puck, 0.15);
      if (nb) {
        const hit = bounce(puck, nb, 0.6, 0.92);
        if (hit > 12) emit("board", { v: Math.min(1, hit / 90), x: puck.x, y: puck.y });
      }
      goalFrame(px, py);
      if (g.phase !== "live" || puck.net) continue;
      for (const gl of goalies) if (!puck.owner && g.phase === "live") judge(gl);
      if (!puck.owner && g.phase === "live") sticks();
    }
  }
  // The posts, the crossbar, the net's sides and back, and the goal itself.
  function goalFrame(px, py) {
    for (const s of [1, -1]) {
      const gx = s * RINK.GOAL;
      for (const py0 of [RINK.MOUTH, -RINK.MOUTH]) {
        const dx = puck.x - gx, dy = puck.y - py0, d = Math.hypot(dx, dy);
        if (d < 0.33 && d > 1e-6 && puck.z < RINK.BAR) {
          const hit = bounce(puck, [-dx / d, -dy / d], 0.7, 0.9);
          puck.x = gx + (dx / d) * 0.34;
          puck.y = py0 + (dy / d) * 0.34;
          if (hit > 8) emit("post", { v: Math.min(1, hit / 90) });
        }
      }
      const inside = (x, y) => x * s > RINK.GOAL && x * s < RINK.GOAL + RINK.DEEP && Math.abs(y) < RINK.MOUTH;
      if (!inside(puck.x, puck.y) || inside(px, py) || puck.z > RINK.BAR + 0.5) continue;
      const k = (gx - px) / (puck.x - px || 1e-9), yc = py + (puck.y - py) * k;
      if (px * s <= RINK.GOAL && Math.abs(yc) < RINK.MOUTH) {
        if (puck.z < RINK.BAR) return goal(s);
        puck.x = px;
        puck.vx = -puck.vx * 0.3;
        puck.vz = Math.abs(puck.vz) * 0.3 + 2;
        emit("post", { v: 0.6, bar: true });
      } else {
        puck.x = px;
        puck.y = py;
        if (px * s >= RINK.GOAL + RINK.DEEP) puck.vx = -puck.vx * 0.4;
        else puck.vy = -puck.vy * 0.4;
        emit("net");
      }
    }
  }
  function inNet() {
    const s = puck.net, x0 = RINK.GOAL + 0.3, x1 = RINK.GOAL + RINK.DEEP - 0.3, h = RINK.MOUTH - 0.3;
    if (puck.x * s < x0) (puck.x = x0 * s), (puck.vx = Math.abs(puck.vx) * 0.3 * s);
    if (puck.x * s > x1) (puck.x = x1 * s), (puck.vx = -Math.abs(puck.vx) * 0.3 * s);
    if (Math.abs(puck.y) > h) (puck.y = Math.sign(puck.y) * h), (puck.vy *= -0.3);
    if (puck.z > RINK.BAR - 0.3) (puck.z = RINK.BAR - 0.3), (puck.vz = 0);
  }
  function goal(s) {
    const sc = att(0) === s ? 0 : 1;
    g.score[sc]++;
    countShot(sc);
    const by = puck.last?.team === sc && puck.last.role !== "G" ? puck.last : null;
    const assist = by && puck.prev?.team === sc && puck.prev !== by && puck.prev.role !== "G" ? puck.prev : null;
    puck.net = s;
    puck.owner = null;
    g.phase = "goal";
    g.phaseT = 0;
    g.scorer = by;
    emit("goal", { team: sc, by: by?.num ?? null, assist: assist?.num ?? null, own: !by, score: [...g.score] });
  }
  // Sticks (and shin pads) along the puck's path: it's taken, or it glances off.
  function sticks() {
    if (puck.z > 1.3) return;
    let best = null, bd = 1.8;
    for (const s of skaters) {
      if (s.down > 0 || s.cool > 0) continue;
      const [bx, by] = blade(s);
      const d = Math.min(Math.hypot(puck.x - bx, puck.y - by), Math.hypot(puck.x - s.x, puck.y - s.y) * 1.25);
      if (d < bd) [best, bd] = [s, d];
    }
    if (!best) return;
    const s = best, rel = Math.hypot(puck.vx - s.vx, puck.vy - s.vy), ps = puck.pass;
    const mine = ps?.to === s, theirs = ps && ps.from.team !== s.team;
    const stealK = human && s === g.user ? 1.2 : team[s.team].steal;
    const p = rel < 38 ? (theirs ? 0.85 : 1) : rel < 95 ? (mine ? 0.93 : theirs ? 0.42 * stealK : 0.6) : 0.12;
    if (R() < p) return take(s);
    const ang = gauss() * 0.7, c = Math.cos(ang), n = Math.sin(ang);
    [puck.vx, puck.vy] = [(puck.vx * c - puck.vy * n) * 0.55, (puck.vx * n + puck.vy * c) * 0.55];
    puck.vz = R() * 4;
    s.cool = 0.3;
    if (puck.shot) {
      if (puck.shot.team === s.team) puck.shot.deflected = true;
      else puck.shot = null;
    }
    puck.pass = null;
    touch(s);
    emit("tip", { team: s.team });
  }
  // A stick on the carrier's puck knocks it loose, now and then: more often from in front.
  function steals(dt) {
    const o = puck.owner;
    if (!o || o.role === "G") return;
    for (const s of skaters) {
      if (s.team === o.team || s.down > 0 || s.cool > 0) continue;
      const [bx, by] = blade(s);
      if (Math.hypot(puck.x - bx, puck.y - by) > 2.3) continue;
      const front = (s.x - o.x) * Math.cos(o.face) + (s.y - o.y) * Math.sin(o.face) > 0 ? 1 : 0.55;
      const k = human && s === g.user ? 1.5 : team[s.team].steal;
      if (R() < 1.5 * k * front * dt * (o.wind > 0 ? 1.5 : 1)) {
        const a = R() * TAU;
        loose(o, o.vx * 0.4 + s.vx * 0.3 + Math.cos(a) * 9, o.vy * 0.4 + s.vy * 0.3 + Math.sin(a) * 9);
        s.cool = 0.05;
        touch(s);
        emit("steal", { team: s.team });
        return;
      }
    }
  }

  // ---------------------------------------------------------------- a step of the game
  function live(dt) {
    g.clock -= dt;
    if (g.clock <= 0) {
      g.clock = 0;
      return endPeriod();
    }
    roles();
    for (const s of skaters) {
      if (s.down > 0) continue;
      if (human && s === g.user) continue;
      if (puck.owner === s) carrier(s, dt);
      else offPuck(s);
    }
    if (human) you(dt);
    for (const s of skaters) skate(s, dt);
    collide();
    for (const gl of goalies) goalie(gl, dt);
    if (g.phase !== "live") return;
    if (puck.owner) {
      steals(dt);
      if (puck.owner) carry();
    } else free(dt);
    // A puck nobody can get to, or no one will: the referee blows it dead.
    puck.still = !puck.owner && Math.hypot(puck.vx, puck.vy) < 1.5 ? puck.still + dt : 0;
    if (g.phase === "live" && puck.still > 5) whistle(...nearestDot(puck.x, puck.y));
  }
  // Stopped play: everyone coasts to a stop, and after a goal the scorers gather round.
  function coast(dt) {
    for (const s of skaters) {
      s.want = [0, 0];
      s.burst = false;
      s.faceTo = null;
      if (g.phase === "goal" && g.scorer && s.team === g.scorer.team && s !== g.scorer && g.phaseT > 0.4) seek(s, g.scorer.x, g.scorer.y, 16);
      if (g.phase === "goal" && s === g.scorer) seek(s, s.x + s.vx, s.y + s.vy * 0.5, 14);
      skate(s, dt);
    }
    collide();
    for (const gl of goalies) {
      gl.vx *= 0.9;
      gl.vy *= 0.9;
    }
  }
  function step(dt) {
    g.t += dt;
    g.phaseT += dt;
    switch (g.phase) {
      case "faceoff":
        if (g.phaseT > 1.1) {
          g.phase = "drop";
          g.phaseT = 0;
          emit("drop");
        }
        break;
      case "drop":
        drop(dt);
        break;
      case "live":
        live(dt);
        break;
      case "goal":
        coast(dt);
        free(dt);
        if (g.phaseT > 3.4) g.period >= 4 ? end() : faceoff(0, 0);
        break;
      case "whistle":
        coast(dt);
        if (g.phaseT > 1.5) faceoff(...g.next);
        break;
      case "break":
        coast(dt);
        if (g.phaseT > 3.5) {
          g.period++;
          g.clock = g.periodLen;
          faceoff(0, 0);
          emit("period", { period: g.period });
        }
        break;
      case "final":
        coast(dt);
        break;
    }
    g.was = { ...g.input };
  }

  faceoff(0, 0);
  return g;
}
