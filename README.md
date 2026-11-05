# Scuttle

A portrait, touch-first game for iPhone with two sides. As the **Bug**, guide one bug across landscapes full of carnivorous
plants without getting eaten. As the **Plant**, defend the bog: plant carnivorous plants and eat waves of AI bugs before they cross.

It is a single self-contained HTML5 canvas page (`index.html`): no build step, no dependencies, no assets beyond the home-screen icons.

## Play it on an iPhone

1. Open **https://elmosky.github.io/a/** in Safari. It's on GitHub Pages and updates on every push to this branch.
   For local testing, run `python3 -m http.server 8000` and open `http://<your-computer-ip>:8000` on the phone (same Wi-Fi).
2. In Safari, tap Share → **Add to Home Screen**. It launches full-screen like an app, and progress is saved on the device.

On desktop it also runs in any browser, with arrow keys or WASD; `P` or `Esc` pauses.

## How it plays (bug side)

- **Controls:** your bug walks forward on its own at 70% of its speed. Drag anywhere to steer: a floating joystick appears under your thumb, so your finger never covers the bug. Push up for full speed, pull down to slow to 20%. You can't stop or walk backwards.
- **Goal:** reach the flower meadow at the top. You have 3 lives and a checkpoint halfway.
- **Stars:** 1 for crossing, +1 for collecting at least 45% of the dew drops, +1 for losing no lives.
- **Caught? Struggle.** Being caught doesn't kill you outright. Tap the screen as fast as you can to fill the escape meter
  (inner ring) before the plant digests you (outer ring). Each tap costs 4 stamina. Stamina refills slowly while you're free,
  and each dew drop restores 8, so getting caught twice in quick succession is what kills you.
- **Evolve.** Dew drops are evo points: you keep them win or lose, and get +10 for finishing plus +5 per new star.
  Spend them in the menu's Evolve screen. Each bug has its own upgrades.

### Struggle tuning

| Plant         | Escape per tap | Meter lost per second | Time before you're eaten |
|---------------|----------------|-----------------------|--------------------------|
| Venus flytrap | 10%            | 15%                   | 3.5 s                    |
| Sundew        | 12%            | 10%                   | 4.0 s                    |
| Pitcher plant | 9%             | 16%                   | 4.5 s                    |
| Bladderwort   | 10%            | 18%                   | 3.5 s                    |

At these values a base ant needs about 4.5 taps per second, roughly 14 taps (56 of its 100 stamina), to escape a flytrap.

### Evolution (5 levels each, costing 8 / 15 / 25 / 40 / 60 points)

| Upgrade          | Per level                            |
|------------------|--------------------------------------|
| Longer legs      | +6% speed                            |
| Strong mandibles | +12% escape per tap                  |
| Fat reserves     | +20 max stamina                      |
| Fast metabolism  | +25% stamina regen                   |
| Waxy coat        | 10% less sundew sticking and pitcher/bladderwort pull |

The bug's halo shifts colour and it grows slightly as it evolves.

### Bugs

| Bug    | Speed     | Handling               | Stamina / regen | Struggle strength | Special |
|--------|-----------|------------------------|-----------------|-------------------|---------|
| Ant    | medium    | tight, stops instantly | 100 / 7 per s   | 1.0×              | none |
| Beetle | slow      | solid                  | 120 / 6 per s   | 1.15×             | its shell shrugs off the first bite each life |
| Fly    | very fast | drifts, hard to stop   | 80 / 9 per s    | 0.9×              | none (hard mode) |

### Carnivorous plants

| Plant         | Behaviour | How to beat it |
|---------------|-----------|----------------|
| Venus flytrap | Getting within the dashed ring makes it shake and glow red, and it snaps 0.5 s later. Then it stays shut for 2.2 s (green ring counts down). | Slow down to bait it, then cross while it is shut. |
| Sundew        | Its sticky zone cuts your speed to 38%. After 2.2 s inside, you're stuck and have to struggle free. | Cross quickly at the narrowest part, and don't stop. |
| Pitcher plant | Its scent rings pull you toward the pit. Touching the mouth is fatal. | Steer against the pull and keep your distance. |
| Bladderwort   | A cycle: idle, then charging (shrinking ring and bubbles), then a 0.45 s suction burst that drags in anything nearby. | Pass while it is idle. Get clear when the ring starts shrinking. |

### Landscapes

1. **Sunny Bog**: flytraps and sundews.
2. **Pitcher Canopy**: pitcher plants join.
3. **Blackwater Swamp**: bladderworts under the water.
4. **Midnight Garden**: all four plants, and you can only see near your bug. Traps glow as they activate.

Each layout is generated from a fixed seed, so a landscape is the same every time you play it.

## Plant mode

Pick **Plant** on the menu. The whole bog fits on one screen, so nothing scrolls.

- **Goal:** survive all 3 waves on Sunny Bog. Each bug that reaches the flowers drains the bog's 20 health (ants and flies 1, beetles 3). At 0 you lose.
- **Controls:** tap a soil patch to pick a plant. Tap a plant to upgrade it. Tap **Start wave** when you're ready. Time runs at 30% while a plant menu is open.
- **On a wide screen** (at least 900px, in landscape) the plant shop and run status stay on screen. Press 1 to 4 or click the shop to pick a plant, then click plots to plant it. Press the same key to put it down. A 2x speed button sits under the status.
- **Money:** you start with 170 nutrients. An eaten ant pays 12, a fly 14, a beetle 30, and clearing a wave pays 60.
- **Struggles:** a caught bug fights on its own. The yellow ring is its escape meter and the thin red ring is the time before it's digested.
  Bugs tire: every struggle tap costs the same stamina as in bug mode, so a bug that has already escaped once has less left.
- **Beetles** shrug off their first bite, as they do on the bug side.
- **Upgrades reset each run.** All four plants are available on Sunny Bog.

### Plants and upgrades (bought in order)

| Plant (cost) | Holds | Upgrade 1 | Upgrade 2 | Upgrade 3 |
|---|---|---|---|---|
| Venus flytrap (50) | 1 | Bigger trigger zone (40) | Faster snap (60) | Shorter digest (90) |
| Sundew (40) | 2 | Wider rosette (35) | Stickier (55) | Slower bugs inside (80) |
| Pitcher plant (65) | 2 | Wider scent pull (40) | Stronger pull (60) | Wider mouth (85) |
| Bladderwort (55) | 2 | Faster cycle (45) | Bigger suction (65) | Stronger burst (90) |

**Grip** (45 / 75 / 120) is bought from any plant's menu and applies to all of them. Chance a bug at full stamina breaks free of a flytrap, measured over 3,000 struggles per cell (other plants are within a few points):

| Grip level | Ant | Beetle | Fly |
|---|---|---|---|
| 0 | 30% | 42% | 18% |
| 1 | 17% | 32% | 9% |
| 2 | 8% | 17% | 4% |
| 3 | 3% | 9% | 0% |

### Waves on Sunny Bog

| Wave | Bugs |
|---|---|
| 1 | 8 ants |
| 2 | 10 ants, 6 flies |
| 3 | 12 ants, 8 flies, 4 beetles |

### How the bugs move

AI bugs walk at 55% of their `BUGS` speed, because at full speed they outrun every trap. They head for the top and sidestep threats ahead of them
according to their `AI.aware` stat: ants dodge the most, flies barely, and beetles not at all. They never stop, so a wave can't stall.

## Tests

The game has no dependencies. The tests do, and they live in `tests/`:

```bash
cd tests && npm install && npx playwright install webkit
```

- `npm test` runs `bug-mode-unchanged.mjs` (switches auto-walk off, replays scripted play through the pre-plant-mode build and this one, and compares the game state on every frame) and `plant-mode.mjs` (real taps in WebKit at five iPhone sizes, plus mouse and keyboard at desktop size).
- `npm run balance` plays both modes with scripted players and measures struggle odds.

## Code map (`index.html`)

- `BUGS`, `GRIP`, `EVO` / `EVO_COST`, `LEVELS`, `THEMES`, `FT` / `BW` (timings): every tuning knob lives in these tables at the top of the script.
- `PM`, `AI`, `PM_PLANTS`, `PM_LEVELS`: the same for plant mode, including waves, prices and upgrades.
- `buildLevel()`: seeded placement of plant rows (the checkpoint band is always kept clear), dew drops and decor.
- `update()` / `updatePlant()` / `catchBug()`: movement, plant behaviour and death/respawn.
- `struggleTap()` / `updateStruggle()` / `escapeFrom()`: the tap-to-escape minigame. `stats()` applies evolution upgrades.
- `draw*()`: all art is drawn procedurally on canvas, in the storybook style shown in `docs/mockups/style-a-phone.png` and `style-a-web.png`.
  Sunlight (`SUN`) goes on the ground only, under the plants, so their dark pits stay dark. `softShadow()` and `drawLight()` use cached images to keep frames cheap.
- `pm*()`: plant mode. `pmUpdate()` runs a frame, `pmSteer()` / `pmMoveBug()` move AI bugs, `pmCatch()` / `pmStruggle()` handle caught bugs,
  `pmOpenSheet()` is the plant menu and `pmRender()` draws the bog. `updatePlant()`, `bladderPhase()`, `trapOpen()` and the `draw*()` functions are shared with bug mode.

## Going native later

The rules are isolated from the rendering, so the design ports cleanly to SpriteKit. Wrapping this page with Capacitor is the
fastest App Store path. Either route also gives you haptics (Taptic Engine), which iOS Safari doesn't expose to web pages.
