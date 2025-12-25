# Jules Selbsttest Checklist

## Audit & Inventory
- [x] Config-Schema vollständig erfasst
- [x] Backend Endpoints dokumentiert
- [x] Event-Pipeline analysiert (Fix: Gift DiamondCost mapping)
- [x] Mock vs Live Status geklärt

## Tests (Core & Logic)
- [x] Unit-Tests für Deep-Merge (Config)
- [x] Unit-Tests für Normalisierung
- [x] Unit-Tests für Punktevergabe (Chat, Share, Gift)
- [x] Unit-Tests für Overlay Scene Switch
- [x] Integration/Replay Test (Fixture based)
- [x] Replay Script (`npm run replay`) läuft
- [x] Sub-Bonus Gap identifiziert und dokumentiert

## UI & UX
- [x] German Sweep (Alle UI Strings auf Deutsch)
- [x] Live Metrics Card im Dashboard wiederhergestellt
- [x] Automatisierte Screenshots aller Views (`npm run e2e:screens`)
- [x] Scene Lock Link Feature verifiziert (Code vorhanden)

## Stability
- [x] Server Start/Stop clean (Tests cleanup properly)
- [x] Keine "Greenwash" Tests (echte Assertions)
