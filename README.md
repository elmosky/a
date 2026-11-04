# Scuttle

A portrait, touch-first game for iPhone: guide a bug across landscapes full of carnivorous plants without getting eaten.

It is a single self-contained HTML5 canvas page (`index.html`): no build step, no dependencies, no assets beyond the home-screen icons.

## Play it on an iPhone

1. Serve the folder over HTTPS. The quickest route is GitHub Pages (Settings → Pages → deploy from this branch).
   For local testing, run `python3 -m http.server 8000` and open `http://<your-computer-ip>:8000` on the phone (same Wi-Fi).
2. In Safari, tap Share → **Add to Home Screen**. It launches full-screen like an app, and progress is saved on the device.

On desktop it also runs in any browser, with arrow keys or WASD; `P` or `Esc` pauses.

## How it plays

- **Controls:** drag anywhere. A floating joystick appears under your thumb, so your finger never covers the bug.
- **Goal:** reach the flower meadow at the top. You have 3 lives and a checkpoint halfway.
- **Stars:** 1 for crossing, +1 for collecting at least 60% of the dew drops, +1 for losing no lives.
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
| Venus flytrap | Getting within the dashed ring makes it shake and glow red, and it snaps 0.5 s later. Then it stays shut for 2.2 s (green ring counts down). | Bait it, back off, cross while it is shut. |
| Sundew        | Its sticky zone cuts your speed to 38%. After 2.2 s inside, you're stuck and have to struggle free. | Cross quickly at the narrowest part, and don't stop. |
| Pitcher plant | Its scent rings pull you toward the pit. Touching the mouth is fatal. | Steer against the pull and keep your distance. |
| Bladderwort   | A cycle: idle, then charging (shrinking ring and bubbles), then a 0.45 s suction burst that drags in anything nearby. | Pass while it is idle. Get clear when the ring starts shrinking. |

### Landscapes

1. **Sunny Bog**: flytraps and sundews.
2. **Pitcher Canopy**: pitcher plants join.
3. **Blackwater Swamp**: bladderworts under the water.
4. **Midnight Garden**: all four plants, and you can only see near your bug. Traps glow as they activate.

Each layout is generated from a fixed seed, so a landscape is the same every time you play it.

## Code map (`index.html`)

- `BUGS`, `GRIP`, `EVO` / `EVO_COST`, `LEVELS`, `THEMES`, `FT` / `BW` (timings): every tuning knob lives in these tables at the top of the script.
- `buildLevel()`: seeded placement of plant rows (the checkpoint band is always kept clear), dew drops and decor.
- `update()` / `updatePlant()` / `catchBug()`: movement, plant behaviour and death/respawn.
- `struggleTap()` / `updateStruggle()` / `escapeFrom()`: the tap-to-escape minigame. `stats()` applies evolution upgrades.
- `draw*()`: all art is drawn procedurally on canvas.

## Going native later

The rules are isolated from the rendering, so the design ports cleanly to SpriteKit. Wrapping this page with Capacitor is the
fastest App Store path. Either route also gives you haptics (Taptic Engine), which iOS Safari doesn't expose to web pages.
