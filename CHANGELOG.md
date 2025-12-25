# Changelog

## [Unreleased]

### Added
- **UI Build System:** New build scripts (`scripts/compose-ui.js`, `scripts/build-addon-ui.js`) to assemble the frontend from partials and addon assets.
- **Addon Host:** Generic `addon.html` page to load addon UI fragments.
- **Test Hardening:** strict timeouts, retry limits, and fail-fast configuration for Playwright and Node tests.
- **Testing Documentation:** `TESTING.md` guide.

### Changed
- **Frontend Architecture:** Refactored `public/index.html` into `ui-src/pages/index.html` and partials. `public/` is now a build artifact target.
- **Package Scripts:** `npm run build` now triggers UI build. Added `test:fast`, `test:e2e`, `test:ci`.

### Developer Notes
- Run `npm run build` to regenerate the UI in `public/`.
- Use `npm run test:fast` for quick logic checks.
- Use `npm run test:e2e` for full browser testing.
