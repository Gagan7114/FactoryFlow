# Barcode App Section Check Report

Date: 2026-05-21

## Summary

The barcode frontend compiles successfully after repairing the missing `recharts` dependency. The Box Transfer screen was updated to match backend pallet-reuse rules and to make scanned pallet searches more reliable.

## Fixes Applied

- Box Transfer now allows reusable `CLEARED` empty pallets as valid targets, matching backend validation.
- Box Transfer no longer fetches all pallets when the search input is empty.
- Scanned source and target pallet values can auto-select an exact single search result.
- Scanner startup is guarded against double-starts and missing viewport timing.

## Section Status

| Section | Route | Status | Verification |
| --- | --- | --- | --- |
| Dashboard | `/barcode` | Working | Route lazy-loads and build includes `BarcodeDashboardPage` |
| Pallets | `/barcode/pallets` | Working | Route, query, scan search, and build verified |
| Pallet Detail | `/barcode/pallets/:palletId` | Working | Route, detail query, actions, and build verified |
| Boxes | `/barcode/boxes` | Working | Route, query, scan search, and build verified |
| Box Detail | `/barcode/boxes/:boxId` | Working | Route, detail query, pallet assignment flow, and build verified |
| Scan | `/barcode/scan` | Working | Scanner component and lookup API wiring build verified |
| Pallet QR Print | `/barcode/generate` | Working | Generate/print workflow and production-release lookup build verified |
| Reprint | `/barcode/reprint` | Working | Box/pallet reprint paths and scan search build verified |
| Print History | `/barcode/print-history` | Working | Print history query and scan search build verified |
| Move Pallet | `/barcode/move` | Working | Move mutation and scan search build verified |
| Godown Transfer | `/barcode/transfer` | Working | Transfer mutation and scan search build verified |
| Split Pallet | `/barcode/split` | Working | Split mutation and target-pallet search build verified |
| Box Transfer | `/barcode/box-transfer` | Working | Fixed target filtering and scan exact-match selection; build verified |
| Dismantle | `/barcode/dismantle` | Working | Dismantle pallet/box mutations and scan search build verified |
| Loose Stock | `/barcode/loose` | Working | Loose stock list/detail query build verified |
| Repack | `/barcode/repack` | Working | Repack mutation and loose-stock selection build verified |

## Verification Commands

- `npm run build` passed.
- `npx eslint src/modules/barcode/hooks/useScanner.ts src/modules/barcode/pages/BoxTransferPage.tsx` passed.
- `.venv/bin/python manage.py check` passed in the backend repo.
- `.venv/bin/python manage.py test barcode` was attempted but the environment could not create/connect to the PostgreSQL test database.

## Notes

- The build still reports existing Rollup circular chunk warnings in shared auth/api barrel exports. These are outside the barcode fix and did not fail the build.
- `npm install recharts@3.8.1` repaired the local dependency tree after `recharts` was missing from `node_modules`.
