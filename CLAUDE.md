MaritimeGuard v2.0 — Demo-Ready

Standalone offline-first maritime safety app for Indian fishermen. NO backend. All features work fully on-device.

## Stack
- React Native CLI + TypeScript
- MapLibre GL React Native v11 (offline maps, `setAccessToken(null)`)
- WatermelonDB 0.28 (SQLiteAdapter, decorator models)
- turf.js (distance, bearing, circle — units: nauticalmiles/meters)
- suncalc (moon phase, moonrise/moonset)
- react-i18next + react-native-localize (6 languages)
- react-navigation 6 (native stack + bottom tabs)

## Features
1. **Map** — MapLibre offline map, real-time GPS, EEZ border alerts, MOB/trip overlay
2. **SOS** — 3-second hold-to-send, emergency contacts (WatermelonDB), Coast Guard seeded
3. **Anchor Watch** — drop anchor, radius [30/50/100/200m], drag detection, DB history
4. **MOB** — Man Overboard modal (fullScreenModal), compass arrow, hold-to-rescue
5. **Trip Log** — start/stop trips, GPS breadcrumbs every 30s, distance/duration/speed stats
6. **Fishing Hotspots** — long-press map to pin, catch type filter, star ratings
7. **Tides & Moon** — harmonic prediction (M2/S2/K1/O1, 6 Indian ports), moon phase, 7-day forecast
8. **Settings** — vessel name, home port, language switcher, safety config segmented controls
9. **Onboarding** — 5-page horizontal swiper, vessel setup, port picker chips, emergency contact
10. **Splash Screen** — animated AppLogo entrance, wave animation, 2s minimum + fade-out

## Languages
English, Tamil (தமிழ்), Hindi (हिन्दी), Telugu (తెలుగు), Malayalam (മലയാളം), Kannada (ಕನ್ನಡ)

## Theme
background=#0B1426 | primary=#00D4AA | danger=#FF4757 | warning=#FFA502

## Demo position
lat=12.5, lng=69.43 (Arabian Sea, ~47 km from EEZ boundary)

## Run
```
cd MaritimeGuard
npm install
npx react-native run-android   # or run-ios
```
