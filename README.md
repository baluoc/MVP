# TikTok Spoke-Core (MVP)

Lokales Single-User Tool: TikTok LIVE -> EventBus -> (Overlay/OBS URL + Stats-Tabelle + Add-ons).

## Ziele
- Stabiler Core (Hub-and-Spoke): Connector, Normalisierung, EventBus, UserStatsStore, Overlay Runtime, Add-on Host.
- Spaeter Features nur noch als Add-ons.

## Quickstart
### 1) Install
```bash
npm install
```

### 2) Mock Mode (immer verlaesslich)
```bash
npm run dev -- --mock
```

### 3) Real Mode (TikTok LIVE)
```bash
npm run dev -- --user <tiktokName>
```

### OBS Overlay
- Browser Source URL wird beim Start geloggt (Default: http://127.0.0.1:5175/overlay/main)
- Groesse z. B. 1920x1080

### Stats / Tabelle
- JSON: http://127.0.0.1:5175/api/stats
- CSV: http://127.0.0.1:5175/api/stats.csv (MVP kann erstmal simple sein)

### Add-ons (Plan)
- Add-ons liegen unter addons/<id>/
- Ein Add-on hat manifest.json + Entry (spaeter)
- Core stellt Context: events, stats, overlay, config, optional chat.send

## Troubleshooting
- Wenn Real-Mode nicht verbindet: Mock nutzen (Pipeline bleibt testbar).
- Port aendern: --port 6000

## Roadmap
- Slice 1: Pipeline + Overlay + Mock + StatsStore + API
- Slice 2: Add-on Host + Beispiel-Add-on
- Slice 3: GUI Shell (modular) + Add-on Config Panels
- Slice 4: Overlay Composer (v1 Slots, v2 Drag-and-Drop)
