// Is any stretch of a landscape sealed? At every height, find the widest gap a bug can walk through, for the worst case
// where every trap is open and dangerous. Then ask a player who only needs to find that gap.
import { browser, open } from './playtest-lib.mjs';
const p = await open(); await p.evaluate(() => { render = () => {}; updateHUD = () => {}; });
console.table(await p.evaluate(() => LEVELS.map((L, i) => {
  const lv = buildLevel(i);
  const reach = (q) => (q.type === 'flytrap' ? q.kill + 5 : q.type === 'sundew' ? q.r + 3 : q.type === 'pitcher' ? q.mouth + 10 : q.kill + 25);
  let worst = 400, at = 0;
  for (let y = lv.goalY; y < lv.startY; y += 4) {
    const blocked = lv.plants.map((q) => { const dy = Math.abs(q.y - y), r = reach(q); if (dy >= r) return null; const h = Math.sqrt(r * r - dy * dy); return [q.x - h, q.x + h]; }).filter(Boolean).sort((a, b) => a[0] - b[0]);
    let cur = 0, best = 0; for (const [a, b] of blocked) { best = Math.max(best, a - cur); cur = Math.max(cur, b); } best = Math.max(best, 400 - cur);
    if (best < worst) { worst = best; at = y; }
  }
  return { landscape: L.name, plants: lv.plants.length, onWalls: lv.plants.filter((q) => q.x < 40 || q.x > 360).length, narrowestGap: Math.round(worst), atY: at, widestBug: 22 };
})));
// The dodging bot lost ant 4 three times at one wall pitcher. Theory: it crawls when it senses danger, and a crawl can't beat a pull.
// Same bot, one rule changed: push up instead of crawling when the danger is a pitcher.
function dodge(pushUp) {
  const out = {};
  for (const bug of ['ant', 'beetle', 'fly']) for (let lvl = 0; lvl < 4; lvl++) {
    save.unlocked = 4; S.bugType = bug; startLevel(lvl); __step(3); document.getElementById('goBtn').click(); __step(2);
    const threat = (q) => (q.type === 'flytrap' ? (q.state === 'open' || q.state === 'warn' ? q.trig + 12 : 0) : q.type === 'sundew' ? q.r + 12 : q.type === 'pitcher' ? q.pull * 0.75 : q.suck * 0.7);
    let f = 0;
    while (S.mode === 'play' && f++ < 14400) {
      const b = S.bug; let x = 0, y = -1, hit = false, pull = false;
      for (const q of S.lv.plants) { const ahead = b.y - q.y, R = threat(q); if (ahead < -30 || ahead > 190 || !R) continue; const dx = b.x - q.x; if (Math.abs(dx) < R + 14) { hit = true; pull ||= q.type === 'pitcher'; const side = Math.abs(dx) < 4 ? (b.x < 200 ? 1 : -1) : Math.sign(dx); x += side * (b.x < 40 && side < 0 || b.x > 360 && side > 0 ? -1 : 1); } }
      if (hit) y = pushUp && pull ? -1 : 0.5;
      const l = Math.max(1, Math.hypot(x, y)); input.active = true; input.x = x / l; input.y = y / l;
      if (S.struggle && f % 10 === 0) struggleTap();
      update(1 / 60);
    }
    input.active = false; input.x = input.y = 0;
    out[bug + ' ' + (lvl + 1)] = (document.getElementById('resTitle').textContent === 'Made it across!' && S.mode === 'result' ? 'WIN ' : S.mode === 'play' ? 'STUCK ' : 'lost ') + S.deaths;
    S.mode = 'menu';
  }
  return out;
}
const a = await p.evaluate(dodge, false), b = await p.evaluate(dodge, true);
const wins = (r) => Object.values(r).filter((v) => v.startsWith('WIN')).length;
console.log('crawls near pitchers', wins(a) + '/12', JSON.stringify(Object.fromEntries(Object.entries(a).filter(([, v]) => !v.startsWith('WIN 0')))));
console.log('pushes up near pitchers', wins(b) + '/12', JSON.stringify(Object.fromEntries(Object.entries(b).filter(([, v]) => !v.startsWith('WIN 0')))));
await browser.close();
