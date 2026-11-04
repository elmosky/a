# Changelog

All notable changes to Scuttle are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com).

## [Unreleased]

### Added

- Plant mode: pick a side on the menu, then defend Sunny Bog from 3 waves of AI bugs.
- Eight fixed planting plots, four plants, three upgrades per plant, and a shared Grip upgrade, all paid for with nutrients from eaten bugs.
- AI bugs that steer around threats by stat, struggle on their own, and show an escape meter when caught.
- Browser tests in `tests/`: a frame-by-frame check that bug mode is unchanged, plant-mode tests at five iPhone sizes, and balance bots.
- This changelog.

### Changed

- Shared plant code now reads optional per-plant values (flytrap timing, bladderwort speed). Bug mode doesn't set them, so it plays exactly as before.
- `escapeFrom()`, the terrain drawing and the floating text drawing were split into `popOut()`, `drawTerrain()` and `drawFloatText()` so both modes can use them.
