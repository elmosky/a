# Changelog

All notable changes to Scuttle are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com).

## [Unreleased]

### Added

- Plant mode: pick a side on the menu, then defend Sunny Bog from 3 waves of AI bugs.
- Eight fixed planting plots, four plants, three upgrades per plant, and a shared Grip upgrade, all paid for with nutrients from eaten bugs.
- AI bugs that steer around threats by stat, struggle on their own, and show an escape meter when caught.
- Browser tests in `tests/`: a frame-by-frame check that bug-mode gameplay is unchanged, plant-mode tests at five iPhone sizes, and balance bots.
- Hosted on GitHub Pages at https://elmosky.github.io/a/.
- Style mockups in `docs/mockups/`, which the storybook art was built against.
- Playtest scripts in `tests/` that step the real game loop to hunt for bugs and exploits.
- This changelog.

- Plant mode on wide screens: always-on plant shop, hotkeys 1 to 4, a range preview when you hover a plot, run status panel and a 2x speed button.
- Motion: menus slide in, buttons press, traps shake the screen a little, plants bounce when planted, upgraded or fed, and green specks fly to the nutrient counter. All of it turns off with the device's reduced motion setting.

### Changed

- Bug mode: plants now grow against both walls, because hugging an edge won every landscape with no risk.
- Bug mode: the bug now walks forward on its own. Drag to steer, push up to speed up, pull down to slow down. It can't stop or reverse.
- Bug mode: the dew star now needs 45% of the drops instead of 60%, because you can't go back for ones you miss.
- Storybook art in both modes: sunlight, soft shadows, shaded plants and bugs, and a leafy backdrop on wide screens. Bug mode looks different now but plays the same.
- Shared plant code now reads optional per-plant values (flytrap timing, bladderwort speed). Bug mode doesn't set them, so it plays exactly as before.
- `escapeFrom()`, the terrain drawing and the floating text drawing were split into `popOut()`, `drawTerrain()` and `drawFloatText()` so both modes can use them.

### Fixed

- Plant mode: a wave could get stuck forever when a pitcher's pull exactly balanced a sundew's slowdown. Bugs now shake loose after 4 seconds with no progress.
- Bug mode: a thumb held down through a struggle now steers again as soon as you're free.
- The dark smear below the meadow, caused by fading to transparent black.
