// Sessions 1 to 4: human-paced bug mode. The thumb reacts to what it saw a quarter second ago and makes mistakes.
import { browser, open, OUT } from './playtest-lib.mjs';

function play({ bug, lvl, seed, sight }) {
  const R = rng(seed);
  S.bugType = bug; save.unlocked = 4; startLevel(lvl);
  __step(20); document.getElementById('goBtn').click(); __step(2);
  const T = __touch, base = [195, 560];
  let held = false, f = 0, sx = 0, sy = -0.2, seen = null, away = 0, tapClock = 0;
  const log = { catches: 0, taps: 0, stuckAt: [], firstCatchF: 0, shots: [] };
  const threat = (p) => (p.type === 'flytrap' ? (p.state === 'open' || p.state === 'warn' ? p.trig + 10 : 0) : p.type === 'sundew' ? p.r + 10 : p.type === 'pitcher' ? p.pull * 0.7 : p.suck * 0.6);
  let lastY = S.bug.y, slowFrames = 0, maxSlow = 0;
  while (S.mode === 'play' && f < 60 * 300) {
    f++;
    if (S.struggle) {
      if (held) { T.up(base[0], base[1]); held = false; }
      if (S.struggle.t === 0 || !log.lastStruggle) { log.catches++; log.lastStruggle = true; log.firstCatchF ||= f; }
      tapClock -= 1 / 60;
      if (tapClock <= 0) { __tap(195, 500); log.taps++; tapClock = 0.14 + R() * 0.1; }
      away = 12 + R() * 12;
    } else {
      log.lastStruggle = false;
      if (away > 0) away--;
      else {
        if (!held) { T.down(base[0], base[1]); held = true; }
        if (f % 15 === 0) {   // a human updates the plan about four times a second, from a slightly stale view
          const b = S.bug; let x = 0, y = -0.2, hit = false;
          for (const p of S.lv.plants) {
            const ahead = b.y - p.y, Rr = threat(p);
            if (ahead < -30 || ahead > (sight ?? 200) || !Rr) continue;
            const dx = b.x - p.x;
            if (Math.abs(dx) < Rr + 8) { hit = true; x += (Math.abs(dx) < 4 ? (b.x < 200 ? 1 : -1) : Math.sign(dx)); }
          }
          if (hit) y = 0.4; else { const d = S.lv.drops.filter((q) => !q.got && q.y < b.y && b.y - q.y < 150)[0]; if (d) x = Math.max(-1, Math.min(1, (d.x - b.x) / 60)); }
          if (R() < 0.12) x += (R() - 0.5) * 1.4;    // the thumb slips
          const l = Math.max(1, Math.hypot(x, y)); sx = x / l; sy = y / l;
        }
        T.move(base[0] + sx * 55, base[1] + sy * 55);
      }
    }
    __step(1);
    if (S.mode === 'play') {
      const moved = lastY - S.bug.y; lastY = S.bug.y;
      if (!S.struggle && !S.caught && moved < 0.25) { slowFrames++; maxSlow = Math.max(maxSlow, slowFrames); } else slowFrames = 0;
    }
  }
  if (held) T.up(0, 0);
  return { bug, lvl: lvl + 1, title: document.getElementById('resTitle').textContent, text: document.getElementById('resText').textContent, stars: (document.getElementById('resStars').innerHTML.match(/★/g) || []).length - (document.getElementById('resStars').innerHTML.match(/off/g) || []).length,
    points: document.getElementById('resPoints').textContent, secs: Math.round(f / 60), catches: log.catches, taps: log.taps, longestStall: +(maxSlow / 60).toFixed(1), mode: S.mode, oddities: __oddities.slice() };
}

const sessions = [
  ['1 first-timer: ant, Sunny Bog', { bug: 'ant', lvl: 0, seed: 1 }],
  ['2 beetle, Pitcher Canopy', { bug: 'beetle', lvl: 1, seed: 2 }],
  ['3 fly, Blackwater Swamp', { bug: 'fly', lvl: 2, seed: 3 }],
  ['4 ant in the dark, Midnight Garden', { bug: 'ant', lvl: 3, seed: 4, sight: 110 }],
];
for (const [name, cfg] of sessions) {
  const rows = [];
  for (let k = 0; k < 6; k++) {
    const page = await open();
    if (k) await page.evaluate(() => { render = () => {}; updateHUD = () => {}; });
    const r = await page.evaluate(play, { ...cfg, seed: cfg.seed * 100 + k });
    if (k === 0) await page.screenshot({ path: `${OUT}s${name[0]}-end.png` });
    rows.push({ result: r.title, ...Object.fromEntries(['text', 'stars', 'secs', 'catches', 'taps', 'longestStall'].map((q) => [q, r[q]])), odd: r.oddities.join('; '), errs: page.errs.join('; ') });
    await page.context().close();
  }
  console.log('\nSESSION ' + name); console.table(rows);
}
await browser.close();
