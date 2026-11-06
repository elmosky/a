// Shared harness for playtests: runs the game's real main loop one frame at a time, with real pointer events.
import { resolve } from 'node:path';
import { webkit, devices } from 'playwright';
export const OUT = resolve('out/playtest') + '/';
export const browser = await webkit.launch();
export async function open(opts = devices['iPhone 14']) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', (e) => page.errs.push(e.message));
  await page.addInitScript(() => {
    let cb = null, now = 1000;
    window.requestAnimationFrame = (f) => { cb = f; return 1; };
    performance.now = () => now;
    window.__step = (n = 1) => { for (let i = 0; i < n; i++) { now += 1000 / 60; const f = cb; cb = null; if (f) f(now); __watch(); } };
    window.__oddities = [];
    const odd = (m) => { if (__oddities.length < 40 && !__oddities.includes(m)) __oddities.push(m); };
    window.__watch = () => {
      const fin = (v) => typeof v === 'number' && Number.isFinite(v);
      if (S.pm) {
        const m = S.pm;
        if (!(m.nutrients >= 0) || !Number.isInteger(m.nutrients)) odd('nutrients bad ' + m.nutrients);
        if (m.hp < 0) odd('hp below 0');
        for (const b of m.bugs) {
          if (!fin(b.x) || !fin(b.y)) odd('plant bug position not a number');
          if (b.y > PM.spawnY + 80) odd('bug far below spawn ' + b.type);
          if (b.st && !b.st.p.held.includes(b)) odd('caught bug not in plant held list');
          if (b.stam < 0) odd('stamina below 0');
        }
        for (const p of m.lv.plants) { if (p.held.length > p.cap) odd('plant over capacity'); for (const b of p.held) if (!b.st) odd('held bug has no struggle'); }
      } else if (S.mode === 'play' && S.bug) {
        const b = S.bug;
        if (!fin(b.x) || !fin(b.y) || !fin(b.vx)) odd('bug position not a number');
        if (b.stam < -0.01) odd('stamina below 0');
        if (b.y > S.lv.len + 1) odd('bug below map');
      }
    };
    // Real input, as the browser would deliver it
    const ev = (t, x, y, id) => document.getElementById('game').dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: id === 1 }));
    window.__touch = { down: (x, y, id = 1) => ev('pointerdown', x, y, id), move: (x, y, id = 1) => ev('pointermove', x, y, id), up: (x, y, id = 1) => ev('pointerup', x, y, id) };
    window.__tap = (x, y, id = 5) => { ev('pointerdown', x, y, id); ev('pointerup', x, y, id); };
  });
  await page.goto('file://' + resolve('../index.html'));
  await page.evaluate(() => __step(3));
  return page;
}
