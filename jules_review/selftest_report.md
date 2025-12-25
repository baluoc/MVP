# Jules – Selbsttest & Selbstanalyse A–Z (Core Audit + echte Tests)

## 1. Inventar / Was gibt es überhaupt?

### A) Settings / Config-Schema (komplett)

Die Konfiguration wird über `src/core/configStore.ts` geladen und persistiert in `data/config.json`. Deep-Merge-Logik ist implementiert und getestet.

| Config-Bereich | Default-Werte (Auszug) | UI vorhanden? | Backend nutzt es? | Status |
| :--- | :--- | :---: | :---: | :--- |
| **tts** | `enabled: false`, `trigger: "any"`, `language: "de-DE"`, `voice: "default"`, `allowed: {all: true}` | ✅ (TTS Tab) | ✅ (index.ts) | Stabil (Basic) |
| **points** | `coin: 10`, `share: 50`, `chat: 5`, `subBonus: 10`, `goalTarget: 1000` | ✅ (Punkte Tab) | ✅ (UserStatsStore) | Stabil (SubBonus im Store implementiert) |
| **levels** | `points: 100`, `multiplier: 1.5` | ✅ (Punkte Tab) | ❌ (Logic Stub) | **Stub** (Nur Config) |
| **obs** | `ip: "127.0.0.1"`, `port: 4455` | ✅ (Broadcast Tab) | ❌ (Addon Host Stub) | **Stub** |
| **streamerbot** | `address: "127.0.0.1"`, `port: 8080` | ✅ (Broadcast Tab) | ❌ (Addon Host Stub) | **Stub** |
| **chat** | `enableSend: false`, `sessionCookie: ""` | ✅ (Chat Tab) | ✅ (API Live via TikTokService) | Live (mit Gate) |
| **commands** | `!help`, `!score`, `!send`, `!spin` | ✅ (Befehle Tab) | ✅ (Command Core Implemented) | Core v1 (!score, !commands, !help) |
| **gifts** | `blackWhiteDefault: false` | ✅ (Geschenke Tab) | ❌ (Logic missing) | **Stub** |
| **overlay** | `activeSceneId: "default"`, `scenes: [...]` | ✅ (Composer/Overlay) | ✅ (Overlay Server) | Stabil |

### B) Backend Endpoints (`src/api/routes.ts`)

| Route | Methode | Request/Response | Echt/Stub | Nutzung |
| :--- | :---: | :--- | :---: | :--- |
| `/api/connect` | POST | `{uniqueId}` → `{ok}` | ✅ Echt | Dashboard |
| `/api/settings` | GET/POST | Config JSON | ✅ Echt | Global |
| `/api/users` | GET | `?page,limit` → `{users:[]}` | ✅ Echt | User DB |
| `/api/users/:id/adjust`| POST | `{delta}` → `{user}` | ✅ Echt | User DB |
| `/api/reset-stats` | POST | - → `{ok}` | ✅ Echt | System |
| `/api/chat/send` | POST | `{text}` → `{ok, mode, reason}` | ✅ Echt (Live) | Chat (mit Enable-Gate) |
| `/api/gifts` | GET | - → `GiftItem[]` | ✅ Echt (Cache)| Geschenke |
| `/api/overlay/widgets` | GET | - → `WidgetDefinition[]` | ✅ Echt | Composer |
| `/api/overlay/active-scene`| POST | `{sceneId}` → `{ok}` | ✅ Echt | Overlay |
| `/api/status` | GET | - → `{uptime, connected...}` | ✅ Echt | Dashboard |
| `/api/addons` | GET | - → `Addon[]` | ✅ Echt | System |

### C) Event-Pipeline (Normalisierungsschicht)

Datenfluss: `TikTokService` (Connector) → `normalize` → `EventBus` → `UserStatsStore` & `index.ts` (TTS/Overlay).

**Normalisierte Struktur (`AppEvent`):**
*   `type`: chat, gift, share, like, follow, subscribe
*   `user`: `{ userId, uniqueId, nickname, profilePictureUrl }`
*   `payload`:
    *   **chat**: `{ text }`
    *   **gift**: `{ giftName, count, diamondCost, giftIconUrl }` (Fix implemented during audit)
    *   **like**: `{ likeDelta, totalLikeCount }`

### D) Mock vs Live

| Feature | Quelle | Status |
| :--- | :--- | :--- |
| **Events (Chat/Gift/etc)** | `tiktok-live-connector` (Live) oder `mock.ts` (Mock) | ✅ Live Ready |
| **User Avatars** | Echte URLs vom Connector | ✅ Live Ready |
| **Geschenke Icons** | Echte URLs vom Connector (Cached) | ✅ Live Ready |
| **Chat Senden** | `/api/chat/send` (Live) | ✅ Live Ready + Rate Limit (2s) |
| **Views / Zuschauer** | `roomUser` Event | ✅ Live Ready |

---

## 2. Test-Ergebnisse

### 2.1 Unit Tests (Logik-Audit)

`npm run test:unit`

```
> mvp@1.0.0 test:unit
> npm run build && node --test tests/unit/config.test.js tests/unit/core_logic.test.js

TAP version 13
# Subtest: ConfigStore Logic
    ...
    ok 1 - should perform a deep merge without deleting nested keys
    ok 2 - should perform a deep merge on tts settings without losing nested keys
    ok 3 - should handle array replacement correctly (arrays are replaced, not merged)
ok 1 - ConfigStore Logic
# Subtest: Core Logic Audit
    # Subtest: 1. Normalization Layer
        ok 1 - should normalize chat events correctly
        ok 2 - should normalize gift events including cost
    # Subtest: 2. Points System Logic
        ok 1 - should award points for chat
        ok 2 - should award points for share
        ok 3 - should award points for gifts (coins * multiplier)
        ok 4 - should apply sub bonus
    # Subtest: 3. Overlay Scene Logic
        ok 1 - should update active scene in config without side effects
ok 2 - Core Logic Audit
1..2
# tests 10
# pass 10
# fail 0
```

### 2.2 Integration / Replay Check

`npm run replay`

```
=== STARTING REPLAY ===
[Replay] Loading fixture: /app/fixtures/events.sample.json
[Replay] Processing 4 events...

=== REPLAY REPORT ===
Events Processed: 4 overlay triggers

--- User Stats ---
[Alice] Points: 55 | Diamonds: 5 | Chat: 1
[Bob] Points: 50 | Diamonds: 0 | Chat: 0
[Charlie] Points: 5 | Diamonds: 0 | Chat: 1

--- Overlay Log (Last 5) ---
{"kind":"toast","title":"Chat Alice","text":"Hello World","ms":5000}
{"kind":"toast","title":"Geteilt","text":"Bob hat den Stream geteilt!","ms":3000}
{"kind":"gift","from":"Alice","giftName":"Rose","count":5,"ms":4000}
{"kind":"toast","title":"Chat Charlie","text":"!score","ms":5000}

=== DONE ===
```

### 2.3 Screenshots

Automatisierte Screenshots aller Views liegen in `jules_review/verification/`:

*   [Dashboard](verification/01_dashboard.png)
*   [System](verification/02_system.png)
*   [Punkte](verification/03_points.png)
*   [Broadcast](verification/04_broadcast.png)
*   [Chat](verification/05_chat.png)
*   [Befehle](verification/06_commands.png)
*   [TTS](verification/07_tts.png)
*   [Geschenke](verification/08_gifts_main.png)
*   [Overlays](verification/09_overlays.png)
*   [Composer](verification/10_overlay_composer.png)
*   [User DB](verification/11_users.png)

---

## 3. Abschluss & Entscheidung

### Was ist stabil?
*   **Core Event Pipeline:** Stabil und getestet (inkl. Fix für Gift Costs).
*   **User Stats / Persistence:** Funktioniert, Punkteberechnung korrekt.
*   **Config Management:** Robust (Deep Merge verified).
*   **Overlay System:** Szenen-Switching, Widget-Registry und Composer-Grundlagen funktionieren. Runtime rendert jetzt auch Leaderboard & Goal.
*   **Frontend UI:** Deutsche Lokalisierung vollständig (Mapping), Navigation stabil, Layouts gefixt, Bootstrap-Race behoben.
*   **Overlay Scenes:** Live-Updates ohne Neustart möglich, Runtime lauscht auf `scene` Events.

### Was ist Stub/Mock?
*   **Integrationen (OBS/Streamer.bot):** Konfiguration UI existiert, aber Backend-Logik fehlt.
*   **Erweiterte Commands:** `!send`, `!spin` sind als Stubs in Config, aber noch nicht im Core implementiert.

### Lücken (Blocker für Add-ons)
*   Keine kritischen Blocker mehr für Add-ons.

### Session/Cookie: Stand, Risiken, Next steps
*   **Stand:** `sessionId` wird in Config verschlüsselt (Base64 oder Plain currently Plain text in local file) gespeichert. API gibt sie nie heraus. Connector nutzt sie für `sendMessage`.
*   **Risiken:** `sessionId` verfällt schnell. TikTok kann Accounts flaggen bei Spam.
*   **Next Steps:** Webview-Login implementieren, um Session automatisch zu erneuern.

### Next 5 Tasks
1.  **Commands erweitern:** `!send` (Transfer) und `!spin` implementieren.
2.  **OBS/Streamer.bot Client:** WebSocket Clients im Backend implementieren.
3.  **Webview Login:** Echten Login Flow bauen (statt Copy-Paste).
4.  **Add-on System API:** Verfeinern und dokumentieren.
5.  **Level System:** Backend-Logik für Levels implementieren (aktuell nur Config).
