# Audit Backlog

| ID | Priority | Task | Description |
|----|----------|------|-------------|
| 1 | HIGH | Fix Unit Tests (Streamer.bot/OBS) | **(DONE)** Unit Tests crashten wegen fehlenden Mocks. Wurde während Audit als Blocker behoben. |
| 2 | LOW | Bereinigung Root-Dateien | `verify_ui.js`, `test_persistence.ts` scheinen veraltet und sollten nach `scripts/` verschoben oder gelöscht werden. |
| 3 | MED | UI: Localized Strings | Ein paar Stellen im Code könnten noch hardcoded English sein (z.B. Log Meldungen). Review empfohlen. |
| 4 | LOW | OBS Reconnect Noise | Logs spammen "ECONNREFUSED" wenn OBS aus ist. Backoff-Strategie könnte leiser sein (Exponential Backoff). |
| 5 | HIGH | E2E: Browser Installation | `npm run test:e2e` erfordert `npx playwright install`. Sollte in `npm install` Hook oder Doku aufgenommen werden. |
| 6 | MED | Missing Referenz-Asset | `dashboard_rich_ui.png` fehlt im Repo. Sollte als Design-Referenz committed werden. |

## Details zu erledigten Blockern

### Fix Unit Tests (DONE)
- **Problem**: `StreamerBotService` nutzte `ws` Library, die schwer zu mocken war. Tests liefen in Endlosschleife.
- **Fix**: Dependency Injection für `WebSocket` Klasse im Constructor hinzugefügt.
- **Problem**: `OBSService` Tests überschrieben `this.obs` nach Constructor-Call, Listener hingen am falschen Objekt.
- **Fix**: Manuelles Event-Binding im Test.
