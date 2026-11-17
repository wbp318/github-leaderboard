// Storm Cellar's music: two original, upbeat tracks, written and played here in code with the Web
// Audio API, so there's nothing to download. "Storm Warning" for the cellar and "Flood Stage" for
// the drain, both on the bright IV-V-iii-vi chord loop, at 150 and 156 beats a minute: a four-on-
// the-floor kick that makes everything else pump, offbeat hats, claps on two and four, a rolling
// bass, a sparkling arpeggio, and a lead with an echo. The Heisenbug's fight kicks it up a gear.
// Plain JavaScript with nothing from Node, because the page carries a copy (the build puts it in),
// and the browser test renders it offline to check it's loud enough and never clips.

const hz = (m) => 440 * 2 ** ((m - 69) / 12);
// A melody, bar by bar: each bar a list of [16th-note step, MIDI note, length in 16ths].
export const SONGS = [
  {
    name: "Storm Warning",
    bpm: 150,
    // F, G, Em, Am (in C): the bass note and the chord in the middle of the keyboard.
    chords: [[41, [65, 69, 72]], [43, [67, 71, 74]], [40, [64, 67, 71]], [45, [69, 72, 76]]],
    arp: [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 5, 4, 3, 2],
    lead: [
      [[0, 81, 2], [2, 79, 2], [4, 77, 2], [6, 76, 2], [8, 72, 4], [12, 69, 2], [14, 72, 2]],
      [[0, 74, 2], [2, 76, 2], [4, 79, 4], [8, 71, 2], [10, 74, 2], [12, 79, 4]],
      [[0, 76, 3], [3, 79, 3], [6, 83, 2], [8, 81, 2], [10, 79, 2], [12, 76, 4]],
      [[0, 81, 2], [2, 84, 2], [4, 83, 2], [6, 81, 2], [8, 76, 6]],
      [[0, 81, 2], [2, 79, 2], [4, 77, 2], [6, 81, 2], [8, 84, 4], [12, 81, 2], [14, 77, 2]],
      [[0, 79, 2], [2, 81, 2], [4, 83, 2], [6, 86, 2], [8, 83, 2], [10, 79, 2], [12, 74, 4]],
      [[0, 76, 2], [2, 79, 2], [4, 83, 4], [8, 84, 2], [10, 83, 2], [12, 79, 2], [14, 76, 2]],
      [[0, 81, 4], [4, 76, 2], [6, 81, 2], [8, 84, 8]],
    ],
  },
  {
    name: "Flood Stage",
    bpm: 156,
    // Bb, C, Am, Dm (in F).
    chords: [[46, [70, 74, 77]], [48, [72, 76, 79]], [45, [69, 72, 76]], [50, [74, 77, 81]]],
    arp: [0, 2, 1, 3, 2, 4, 3, 5, 0, 2, 1, 3, 2, 4, 5, 3],
    lead: [
      [[0, 74, 2], [2, 77, 2], [4, 82, 2], [6, 81, 2], [8, 77, 4], [12, 74, 4]],
      [[0, 76, 2], [2, 79, 2], [4, 84, 2], [6, 82, 2], [8, 81, 2], [10, 79, 2], [12, 76, 4]],
      [[0, 84, 3], [3, 81, 3], [6, 76, 2], [8, 81, 2], [10, 84, 2], [12, 88, 4]],
      [[0, 86, 2], [2, 84, 2], [4, 81, 2], [6, 77, 2], [8, 74, 8]],
      [[0, 77, 2], [2, 82, 2], [4, 86, 2], [6, 84, 2], [8, 82, 2], [10, 81, 2], [12, 77, 4]],
      [[0, 79, 2], [2, 84, 2], [4, 88, 4], [8, 86, 2], [10, 84, 2], [12, 79, 4]],
      [[0, 81, 2], [2, 84, 2], [4, 88, 2], [6, 86, 2], [8, 84, 2], [10, 81, 2], [12, 76, 4]],
      [[0, 77, 2], [2, 81, 2], [4, 86, 4], [8, 74, 8]],
    ],
  },
];

// A 32-bar arrangement, then from bar 4 round again: an intro (drums, bass, pad), a verse (the
// arpeggio and the tune come in), a breakdown (no kick, a riser), and two choruses (everything, the
// second with the tune doubled an octave down).
export function sectionOf(bar) {
  const b = bar < 32 ? bar : 4 + ((bar - 32) % 28);
  return { b, part: b < 4 ? "intro" : b < 12 ? "verse" : b < 16 ? "break" : "chorus" };
}

/**
 * The music for one AudioContext, into one node. start(level, at, fresh) sets the song (by level)
 * and when its next step plays (from the top if fresh); tick(now, hype) schedules what's due in the
 * next moment, louder and busier while hype (the Heisenbug's fight) is on.
 */
export function makeMusic(ac, out) {
  const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  // Everything through a compressor, so the mix holds together and never clips; the bass, pad, and
  // arpeggio through a gain that ducks on every kick (the pump), and the lead and arpeggio into a
  // dotted-eighth echo.
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.12;
  comp.connect(out);
  const mix = ac.createGain();
  mix.connect(comp);
  const duck = ac.createGain();
  duck.connect(mix);
  const echo = ac.createDelay(1);
  const fb = ac.createGain();
  const wet = ac.createGain();
  fb.gain.value = 0.3;
  wet.gain.value = 0.2;
  echo.connect(fb).connect(echo);
  echo.connect(wet).connect(mix);

  const amp = (t, peak, attack, hold, release) => {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    return g;
  };
  const osc = (type, f, t, end, detune = 0) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.detune.value = detune;
    o.start(t);
    o.stop(end);
    return o;
  };
  const hiss = (t, end) => {
    const s = ac.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    s.start(t, Math.random() * 0.9);
    s.stop(end);
    return s;
  };
  const filter = (type, f, q = 0.7) => {
    const b = ac.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  };

  const kick = (t, v) => {
    const o = osc("sine", 165, t, t + 0.36);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
    o.connect(amp(t, v, 0.002, 0.04, 0.28)).connect(mix);
    // Make room for it: everything soft dips, then swells back.
    duck.gain.cancelScheduledValues(t);
    duck.gain.setValueAtTime(0.35, t);
    duck.gain.setTargetAtTime(1, t + 0.02, 0.07);
  };
  const hat = (t, v, open) => hiss(t, t + 0.3).connect(filter("highpass", 7600)).connect(amp(t, v, 0.001, 0, open ? 0.2 : 0.035)).connect(mix);
  const clap = (t, v) => {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (let k = 0; k < 3; k++) {
      g.gain.setValueAtTime(v, t + k * 0.011);
      g.gain.linearRampToValueAtTime(v * 0.25, t + k * 0.011 + 0.009);
    }
    g.gain.setValueAtTime(v * 0.8, t + 0.034);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    hiss(t, t + 0.25).connect(filter("bandpass", 1500, 0.9)).connect(g).connect(mix);
  };
  const crash = (t, v) => hiss(t, t + 1.6).connect(filter("highpass", 3200)).connect(amp(t, v, 0.002, 0, 1.4)).connect(mix);
  const riser = (t, dur, v) => {
    const f = filter("bandpass", 400, 1.4);
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(7000, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + dur);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.02);
    hiss(t, t + dur + 0.05).connect(f).connect(g).connect(mix);
  };
  const bass = (t, m, dur, v) => {
    const f = filter("lowpass", 1500, 6);
    f.frequency.setValueAtTime(1500, t);
    f.frequency.exponentialRampToValueAtTime(240, t + dur * 0.9);
    osc("sawtooth", hz(m), t, t + dur + 0.05).connect(f).connect(amp(t, v, 0.004, dur * 0.5, dur * 0.5)).connect(duck);
  };
  const arp = (t, m, v) => {
    const g = amp(t, v, 0.002, 0.01, 0.08);
    osc("square", hz(m), t, t + 0.12).connect(filter("lowpass", 2600)).connect(g);
    g.connect(duck);
    g.connect(echo);
  };
  const lead = (t, m, dur, v) => {
    const f = filter("lowpass", 3400, 1);
    const g = amp(t, v, 0.008, Math.max(0.01, dur - 0.05), 0.07);
    for (const d of [-7, 7]) osc("sawtooth", hz(m), t, t + dur + 0.1, d).connect(f);
    osc("triangle", hz(m + 12), t, t + dur + 0.1).connect(amp(t, 0.5, 0.008, Math.max(0.01, dur - 0.05), 0.07)).connect(f);
    f.connect(g);
    g.connect(mix);
    g.connect(echo);
  };
  const pad = (t, notes, dur, v) => {
    const f = filter("lowpass", 1300);
    f.connect(amp(t, v, 0.25, Math.max(0.05, dur - 0.5), 0.3)).connect(duck);
    for (const m of notes) for (const d of [-9, 9]) osc("sawtooth", hz(m), t, t + dur + 0.1, d).connect(f);
  };

  let song = SONGS[0], step = 0, next = 0;
  const melody = (s) => {
    const by = new Map();
    s.lead.forEach((bar, i) => bar.forEach(([st, m, len]) => by.set(i * 16 + st, [m, len])));
    return by;
  };
  let tune = melody(song);
  function play(i, t, hype) {
    const sp = 60 / song.bpm / 4;
    const bar = Math.floor(i / 16), s = i % 16, { b, part } = sectionOf(bar);
    const [root, triad] = song.chords[b % 4];
    const loud = part === "chorus" || hype;
    // Drums.
    if (part !== "break" && s % 4 === 0) kick(t, 0.95);
    if (hype && part !== "break" && s === 14) kick(t, 0.7);
    if (s % 4 === 2) hat(t, loud ? 0.2 : 0.14, part === "chorus");
    else if ((loud || part === "verse") && s % 2 === 1) hat(t, loud ? 0.09 : 0.05, false);
    if ((part === "verse" || part === "chorus" || hype) && (s === 4 || s === 12)) clap(t, loud ? 0.42 : 0.32);
    if (s === 0 && (b === 4 || b === 16 || b === 24)) crash(t, 0.22);
    if (part === "break" && b === 15 && s === 0) riser(t, sp * 16, 0.18);
    // The rolling bass, between the kicks; every 16th in the fight.
    if (part !== "break" && (s % 4 !== 0 || hype)) bass(t, root + (s % 4 === 3 ? 12 : 0), sp * 0.9, hype ? 0.3 : 0.26);
    // The arpeggio, up and down the chord.
    if (part !== "intro") {
      const tones = [...triad, ...triad.map((m) => m + 12)];
      arp(t, tones[song.arp[s]] + (hype ? 12 : 0), part === "break" ? 0.06 : 0.045);
    }
    // The pad, a bar at a time.
    if (s === 0) pad(t, triad, sp * 16, part === "break" ? 0.05 : 0.03);
    // The tune: in the verse, and both choruses (the second doubled an octave down).
    if (part === "verse" || part === "chorus") {
      const n = tune.get(((b - (part === "verse" ? 4 : b < 24 ? 16 : 24)) % 8) * 16 + s);
      if (n) {
        lead(t, n[0], n[1] * sp, part === "chorus" ? 0.13 : 0.1);
        if (b >= 24) lead(t, n[0] - 12, n[1] * sp, 0.07);
      }
    }
  }
  return {
    get name() {
      return song.name;
    },
    start(level, at, fresh) {
      const s = SONGS[level % SONGS.length];
      if (s !== song || fresh) {
        song = s;
        tune = melody(s);
        step = 0;
      }
      next = at;
      echo.delayTime.setValueAtTime((60 / song.bpm) * 0.75, at);
    },
    tick(now, hype) {
      const sp = 60 / song.bpm / 4;
      if (next < now - 0.2) next = now + 0.02;
      while (next < now + 0.15) {
        play(step, next, hype);
        step++;
        next += sp;
      }
    },
  };
}
