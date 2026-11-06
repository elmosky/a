// Sessions 9 and 10, plus confirmations.
import { browser, open, OUT } from './playtest-lib.mjs';
const vis = (p, id) => p.evaluate((id) => { const e = document.getElementById(id); return !!e && e.getClientRects().length > 0; }, id);
const startPlant = async (p) => { await p.evaluate(() => { document.getElementById('side-plant').click(); document.querySelector('#pmLevelList .level-btn').click(); document.getElementById('goBtn').click(); __step(3); }); };
const results = [];
const note = (name, val) => { results.push({ check: name, result: typeof val === 'string' ? val : JSON.stringify(val) }); };

// ---- Session 10a: thumb held down through a struggle
{
  const p = await open();
  const r = await p.evaluate(() => {
    S.bugType = 'ant'; startLevel(0); __step(3); document.getElementById('goBtn').click(); __step(2);
    __touch.down(195, 560); __touch.move(250, 560); __step(10);
    const before = S.bug.vx;
    const pl = S.lv.plants[0]; catchBug(pl); S.struggle.prog = 0.99; __tap(100, 500, 7); __step(3);
    const freed = !S.struggle;
    S.bug.inv = 3; __step(90); __touch.move(140, 560); __step(40);   // same thumb, never lifted, now pushing left
    return { freed, vxBefore: Math.round(before), vxAfter: Math.round(S.bug.vx), joystickLive: input.active };
  });
  note('Held thumb steers again after escaping', r);
  await p.context().close();
}
// ---- Fresh ant tap rates
{
  const p = await open(); await p.evaluate(() => { render = () => {}; updateHUD = () => {}; });
  for (const [label, taps, fingers] of [['6 taps/s one thumb', 6, 1], ['10 taps/s two thumbs', 5, 2], ['16 taps/s four fingers', 4, 4]]) {
    const r = await p.evaluate(({ taps, fingers }) => {
      const out = {};
      for (const type of ['flytrap', 'pitcher']) {
        S.bugType = 'ant'; for (const k of Object.keys(save.evo.ant)) save.evo.ant[k] = 0;
        startLevel(0); __step(3); document.getElementById('goBtn').click(); __step(2);
        S.lv.plants = [makePlant(type, 200, S.bug.y - 200, rng(1))]; catchBug(S.lv.plants[0]);
        let f = 0; while (S.struggle && f < 600) { f++; if (f % Math.round(60 / taps) === 0) for (let k = 0; k < fingers; k++) __tap(100 + k * 40, 500, 5 + k); __step(1); }
        out[type] = S.caught ? 'EATEN' : (f / 60).toFixed(1) + 's, ' + Math.round(S.bug.stam) + ' stamina left'; S.mode = 'menu';
      }
      return out;
    }, { taps, fingers });
    note('Base ant escape, ' + label, r);
  }
  await p.context().close();
}
// ---- Session 10b: chaos in plant mode
{
  const p = await open(); await startPlant(p);
  note('Double-tap Start wave', await p.evaluate(() => { const b = document.getElementById('pmWave'); b.click(); b.click(); __step(2); return { queued: S.pm.queue.length + S.pm.bugs.length, wave: S.pm.wave }; }));
  note('Menu open, then pause, resume', await p.evaluate(() => { __tap(S.pm.view.ox + 200 * S.pm.view.s, S.pm.view.oy + 520 * S.pm.view.s); __step(2); const open1 = !!S.pm.sel; pauseGame(); __step(2); resumeGame(); __step(2); return { open1, stillOpen: !!S.pm.sel, sheet: !document.getElementById('pmSheet').classList.contains('hidden'), mode: S.mode }; }));
  note('Menu left open for a whole wave', await p.evaluate(() => { let f = 0; while (S.pm.active && f++ < 60 * 200) __step(1); return { gameSecs: +S.pm.t.toFixed(1), realSecs: +(f / 60).toFixed(1), selStill: !!S.pm.sel }; }));
  note('Tap plot while paused', await p.evaluate(() => { pauseGame(); __step(1); const s = S.pm.sel; __tap(100, 300); __step(2); const r = { mode: S.mode }; resumeGame(); return r; }));
  await p.context().close();
}
// ---- Rotate mid-wave on a phone, resize across the desktop line with a plant picked
{
  const p = await open(); await startPlant(p);
  await p.evaluate(() => { document.getElementById('pmWave').click(); __step(60); });
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(100); await p.evaluate(() => __step(30));
  note('Phone rotated to landscape mid-wave', await p.evaluate(() => { const v = S.pm.view; const top = document.getElementById('hud').getBoundingClientRect().bottom, bar = document.getElementById('pmBar').getBoundingClientRect().top; return { s: +v.s.toFixed(2), mapPx: Math.round(400 * v.s), plotPx: Math.round(2 * PM.tapR * v.s), room: Math.round(bar - top), over: document.documentElement.scrollWidth - document.documentElement.clientWidth }; }));
  await p.screenshot({ path: OUT + 'rotated.png' });
  await p.setViewportSize({ width: 390, height: 664 }); await p.waitForTimeout(100); await p.evaluate(() => __step(10));
  note('Rotated back', await p.evaluate(() => ({ s: +S.pm.view.s.toFixed(2), mode: S.mode })));
  await p.context().close();

  const d = await open({ viewport: { width: 1280, height: 800 } }); await startPlant(d);
  await d.evaluate(() => { pmArm('flytrap'); __step(2); });
  await d.setViewportSize({ width: 700, height: 800 }); await d.waitForTimeout(100); await d.evaluate(() => __step(5));
  note('Plant picked, window narrowed to phone layout', await d.evaluate(() => { const v = S.pm.view, pl = S.pm.plots[2]; __tap(v.ox + pl.x * v.s, v.oy + pl.y * v.s); __step(3); return { armed: S.pm.armed, shopVisible: document.getElementById('pmShop').getClientRects().length > 0, plantedWithNoMenu: !!pl.plant, sheet: !!S.pm.sel }; }));
  await d.context().close();
}
// ---- Session 9: desktop sizes
for (const [w, h] of [[1280, 800], [1366, 650], [1024, 700], [900, 600]]) {
  const d = await open({ viewport: { width: w, height: h } }); await startPlant(d);
  await d.evaluate(() => { const v = S.pm.view, pl = S.pm.plots[2]; __tap(v.ox + pl.x * v.s, v.oy + pl.y * v.s); __step(25); });
  const r = await d.evaluate(() => {
    const R = (id) => document.getElementById(id).getBoundingClientRect(), sh = R('pmSheet'), wv = R('pmWave2'), sp = R('pmPause'), run = R('pmRun'), shop = R('pmShop');
    const hit = (a) => !(sh.bottom <= a.top || sh.top >= a.bottom);
    const overflow = [...document.querySelectorAll('.pm-buy div')].some((e) => e.scrollWidth > e.clientWidth + 1);
    return { side: Math.round(run.width), shopBottom: Math.round(shop.bottom), runBottom: Math.round(run.bottom), h: innerHeight, sheetCoversStartWave: hit(wv), sheetCoversPause: hit(sp), textClipped: overflow };
  });
  note(`Desktop ${w}x${h}, menu open`, r);
  await d.screenshot({ path: `${OUT}desk-${w}.png` });
  await d.context().close();
}
console.table(results);
await browser.close();
