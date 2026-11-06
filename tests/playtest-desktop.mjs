// Session 9: a whole desktop run with keyboard hotkeys, mouse clicks and 2x speed.
import { browser, open, OUT } from './playtest-lib.mjs';
const p = await open({ viewport: { width: 1280, height: 800 } });
const r = await p.evaluate(() => {
  document.getElementById('side-plant').click(); document.querySelector('#pmLevelList .level-btn').click(); document.getElementById('goBtn').click(); __step(3);
  const m = S.pm, key = (k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), up = (k) => window.dispatchEvent(new KeyboardEvent('keyup', { key: k }));
  const click = (i) => { const v = m.view, q = m.plots[i]; __tap(v.ox + q.x * v.s, v.oy + q.y * v.s); __step(1); };
  const order = [6, 7, 5, 3, 4, 2, 0, 1], log = [];
  document.getElementById('pmSpeed').click();
  let f = 0, t = 0;
  while (S.mode === 'plant' && f++ < 60 * 200) {
    if (t-- <= 0) {
      t = 30;
      const next = order.find((i) => !m.plots[i].plant);
      if (next !== undefined) {
        const n = m.lv.plants.length % 2 ? '4' : '2', type = n === '4' ? 'bladder' : 'sundew';
        if (m.nutrients >= PM_PLANTS[type].cost) { if (m.armed !== type) { key(n); up(n); } click(next); if (m.plots[next].plant) log.push(`${n}@${next}`); }
      } else { if (m.armed) { key(m.armed === 'sundew' ? '2' : '4'); } }
    }
    if (!m.active) { const b = document.getElementById('pmWave2'); __step(1); if (!b.disabled) b.click(); }
    __step(1);
  }
  return { title: document.getElementById('resTitle').textContent, text: document.getElementById('resText').textContent, hp: document.getElementById('resPoints').textContent, realFrames: f, planted: log.length, speed: m.speed, odd: __oddities };
});
console.log(JSON.stringify(r), 'errors', p.errs);
await p.screenshot({ path: OUT + 'desktop-end.png' });
await browser.close();
