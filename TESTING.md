# Testing Strategy

This repository uses a two-tier testing strategy:

## 1. Unit Tests (`npm run test:fast`)
- Uses Node.js native test runner (`node --test`).
- **Timeout:** 5s per test file.
- **Scope:** Core logic, state management, utilities.
- **No external dependencies:** Mocks used for IO/Net.

## 2. E2E Tests (`npm run test:e2e`)
- Uses **Playwright**.
- **Timeout:** 30s per test, 10m global.
- **Retries:** 0 (Fail fast).
- **Scope:** Full application flow, UI rendering, WebSocket interaction.
- **Workers:** Limited to 2 to prevent resource exhaustion.

## CI (`npm run test:ci`)
- Runs Unit tests first.
- Runs E2E tests with strict fail-fast (`--max-failures=1`).

## Troubleshooting
- If E2E tests hang: Check `playwright.config.ts` timeouts. Ensure the server starts correctly (`npm run start:test`).
- If Unit tests hang: Check for unclosed handles (timers, sockets).
