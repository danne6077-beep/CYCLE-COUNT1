# Real-device release checklist

Use the deployed HTTPS preview on Android Chrome and iPhone Safari. Record device, OS, browser, date, catalog version and outcome. A desktop test is not a substitute for these checks.

- Install / Add to Home Screen, launch standalone, check safe areas and 360 px layouts.
- Explain camera use; allow permission, deny it, re-enable it and retry. Camera frames must never upload.
- Verify rear-camera preference, continuous focus, tap to refocus and torch if the browser exposes it. Unsupported controls should remain unavailable without breaking manual entry.
- Decode UPC-A, EAN-13, EAN-8, UPC-E, Code 128 and QR labels used by the store. Check leading-zero variants, damaged labels, glare and low light.
- Hold one barcode in frame; verify debounce. Scan a barcode shared by multiple SKUs and choose the correct product. Check unknown barcode, manual item entry and local missing-item report.
- Add five items, enter shelf prices, change quantity, swipe to remove and Undo. Verify exact centavo totals, 80% and over-budget alerts, zero-price entries and incomplete-price warning.
- With verified test enrichment in a preview only, verify equivalent, bulk, promo and house-brand swaps; check incompatible units and out-of-stock exclusions. Never seed fixture prices in production.
- Save/check off a shopping list, scan its item, finish complete and incomplete trips, review history, export CSV and a summary image.
- After initial use, go offline and reopen. Cached grocery search and visited scans should work. Download the full reference catalog and repeat with a previously unvisited department/barcode.
- Reconnect after a catalog/price publication. Verify version/checksum refresh and that saved trip prices do not change. Roll back through a new published version.
- Check keyboard focus, VoiceOver/TalkBack, 200% text, reduced motion, light/dark themes and Filipino navigation/search aliases.
- If optional cloud features are enabled, verify cross-account isolation, explicit sync/restore consent, revoked sessions, AI consent off/on, quota exhaustion and local/cloud deletion separately.
- Run Lighthouse on the generated production build under mobile throttling. Targets: Performance ≥90, Accessibility ≥95. Record actual report files rather than estimating scores.
