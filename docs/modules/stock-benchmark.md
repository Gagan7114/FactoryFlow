# Stock Benchmark Dashboard

The Stock Benchmark dashboard monitors inventory against SAP benchmark levels. It is implemented in `src/modules/dashboards/stock-level/` and reads data from the backend stock dashboard API.

Planned historical snapshot support is documented in [Stock Benchmark Snapshot Plan](./stock-benchmark-snapshot-plan.md).

## Route

| Route | Page | Purpose |
|-------|------|---------|
| `/dashboards/stock-levels` | `StockLevelDashboardPage` | Redirects to the filter flow unless `show_results=1`; then renders stock benchmark rows, summary cards, and item detail expansion |
| `/dashboards/stock-levels/filters` | `StockLevelFilterPage` | Page-by-page guided filter flow with slide navigation and final review |

## Data Sources

The main stock data comes from `GET /dashboards/stock/`.
The click filter page options come from `GET /dashboards/stock/filter-options/`. The flow sends the current draft filters to that endpoint so each page can narrow the next page. The filter dependency order is documented in [Stock Benchmark Filter Flow](./stock-benchmark-filter-flow.md).

Material type options come from the stock filter-options endpoint. The dashboard sends the selected material type as `item_group`, matching SAP item group names such as `PACKAGING MATERIAL` and `RAW MATERIAL`.

The default material type is resolved from the returned item groups using `findDefaultMaterialGroup()`. If the endpoint is unavailable or the exact item group cannot be found, the fallback display name is `Packing Material`.

## Guided Flow Defaults

The guided flow applies only what the user chooses in the flow:

| Filter | Default |
|--------|---------|
| Material Type | Packing Material |
| Warehouse | User-selected in the flow |
| Status | No hidden default in the guided flow |
| Movement | No hidden default in the guided flow |

The guided flow currently asks for Material Type, Variety, PM Sub Group, Size, and Warehouse before loading the list. Status and Movement remain API-supported result filters, but they are not silently applied when the user finishes the flow.

## Top Stats

The top stats follow the selected guided-flow filters. They are fetched with `page_size=1`, because only the `meta` counts are needed.

The Total Items card displays backend `total_items`, so it follows the selected result filters and includes slow/no-status rows that match those filters.

## Table Filters

The table supports:

| Filter | Query parameter | Notes |
|--------|-----------------|-------|
| Search | `search` | Search text is trimmed and uppercased before sending. Backend matching is case-insensitive. |
| Material Type | `item_group` | SAP item group name from WMS item groups. |
| Warehouse | `warehouse` | Comma-separated warehouse codes. Selecting 2 or more warehouses switches the backend to grouped item rows. |
| Sub Group | `sub_group` | Comma-separated SAP item master values from `OITM.U_Sub_Group`. |
| Variety | `variety` | Comma-separated SAP item master oil/product variety values from `OITM.U_Variety`. |
| Size | `sku` | Comma-separated SAP item master size/SKU values from `OITM.U_SKU`. |
| Unit | `unit` | Comma-separated SAP item master values from `OITM.U_Unit`. |
| Stock UOM | `uom` | Comma-separated inventory UOM values from `OITM.InvntryUom`. |
| Status | `status` | Comma-separated values: `healthy`, `low`, `critical`, `unset`. The `unset` value is displayed as No Benchmark Set. |
| Movement | `movement_status` | Comma-separated values: `recent`, `slow`. Omitted when none are selected. |
| As of Date | `as_of_date` | When set, the frontend calls `/dashboards/stock/as-of/` to reconstruct on-hand and movement age from SAP movement history for that posting date. |
| Sort | `sort_by`, `sort_dir` | Defaults to `health_ratio` ascending. |
| Pagination | `page`, `page_size` | Page defaults are controlled by the backend serializer. |

The Material Type dropdown includes `All`. Selecting it sends a blank material type, so the frontend omits `item_group` from the API request.

The As of Date filter is for testing SAP historical reconstruction. It changes the data source but keeps the same table and summary UI. Historical reconstruction uses SAP `OINM` for on-hand and movement age, while benchmark and item master values still come from current SAP.

## Status Rules

Stock status is calculated by the backend so table rows, filters, and counts use the same rules.

| Status | Rule |
|--------|------|
| Healthy | Not slow-moving, benchmark is set, and `OnHand >= Benchmark` |
| Low | Not slow-moving, benchmark is set, `OnHand < Benchmark`, and `OnHand >= Benchmark * 0.6` |
| Critical | Not slow-moving, benchmark is set, and `OnHand < Benchmark * 0.6` |
| No Benchmark Set | Not slow-moving, and benchmark is zero |

The SAP field behind Benchmark is `MinStock`; the API field remains `min_stock` for compatibility.
Slow-moving rows have no stock status. If Movement is changed to All while the Healthy/Low/Critical status filter remains selected, only benchmarked slow-moving rows remain visible; slow rows with no benchmark are excluded unless filters are changed.

## Movement Rules

Movement status is also calculated by the backend:

| Movement | Rule |
|----------|------|
| Recently Used | Outbound consumption exists within the last 30 days. |
| Slow Moving | No outbound consumption exists or last consumption is older than 30 days. |

Stock and benchmark quantities still come from the selected warehouses, but movement age is item-level across SAP inventory movement. A recent consumption in another warehouse can therefore prevent the selected stock row from being marked Slow Moving.

## Grouped Rows

When multiple warehouses are selected, the backend groups rows by item. The grouped row aggregates `OnHand` and the benchmark (`MinStock`) across the selected warehouses and returns `warehouse_count`.

If any child warehouse is worse than the aggregate status, the row includes `has_warning=true`. A grouped row can therefore be Healthy overall while showing a warning triangle for a Low or Critical child warehouse. The item detail panel fetches `GET /dashboards/stock/:itemCode/warehouses/` to show per-warehouse detail with the same stock and movement rules.

## Frontend Files

| File | Responsibility |
|------|----------------|
| `src/modules/dashboards/stock-level/pages/StockLevelDashboardPage.tsx` | Page state, default filters, stats query, table query |
| `src/modules/dashboards/stock-level/pages/StockLevelFilterPage.tsx` | Page-by-page guided filter flow with side peeks, slide transitions, contextual options, and final review |
| `src/modules/dashboards/stock-level/components/StockLevelFilters.tsx` | Dashboard search bar and Filters navigation button |
| `src/modules/dashboards/stock-level/components/StockLevelMetaCards.tsx` | Top summary cards |
| `src/modules/dashboards/stock-level/components/StockLevelTable.tsx` | Table, status badges, movement badges, grouped-row warning |
| `src/modules/dashboards/stock-level/components/StockItemDetailPanel.tsx` | Expanded per-warehouse detail |
| `src/modules/dashboards/stock-level/api/stock-level.api.ts` | API parameter normalization |
| `src/modules/dashboards/stock-level/constants/stock-level.constants.ts` | Filter options and defaults |
| `src/modules/dashboards/stock-level/types/stock-level.types.ts` | TypeScript contracts |
