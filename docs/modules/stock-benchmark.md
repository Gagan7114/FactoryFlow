# Stock Benchmark Dashboard

The Stock Benchmark dashboard monitors inventory against SAP benchmark levels. It is implemented in `src/modules/dashboards/stock-level/` and reads data from the backend stock dashboard API.

Planned historical snapshot support is documented in [Stock Benchmark Snapshot Plan](./stock-benchmark-snapshot-plan.md).

## Route

| Route | Page | Purpose |
|-------|------|---------|
| `/dashboards/stock-levels` | `StockLevelDashboardPage` | Stock benchmark table, filters, summary cards, and item detail expansion |

## Data Sources

The main stock data comes from `GET /dashboards/stock/`.

Material type options come from the WMS item-group endpoint via `useWMSItemGroups()`. The dashboard sends the selected material type as `item_group`, matching SAP item group names such as `PACKAGING MATERIAL` and `RAW MATERIAL`.

The default material type is resolved from the returned item groups using `findDefaultMaterialGroup()`. If the endpoint is unavailable or the exact item group cannot be found, the fallback display name is `Packing Material`.

## Default Filters

These defaults are applied on initial load and when filters are reset:

| Filter | Default |
|--------|---------|
| Material Type | Packing Material |
| Warehouse | `BH-BS`, `BH-PM` |
| Status | `Healthy`, `Low`, `Critical` |
| Movement | `Planned`, `Recently Used` |

By default, the dashboard sends `movement_status=planned,recent`, so slow-moving items are excluded until the Movement filter is changed. If Movement is changed to All, benchmarked slow-moving items can be visible with no stock status badge and are not counted under Healthy, Low, or Critical.

## Top Stats

The top stats are pinned to the stock benchmark baseline and do not follow every table filter. They are fetched with:

- Material Type: default Packing Material item group
- Warehouse: `BH-BS`, `BH-PM`
- Status: `Healthy`, `Low`, `Critical`
- Movement: `Planned`, `Recently Used`
- `page_size=1`, because only the `meta` counts are needed

The Total Items card is displayed as `Healthy + Low + Critical`. It does not include no-status slow-moving rows, even when those rows are visible in the table.

This keeps the summary cards stable while users search, sort, paginate, or inspect other table slices.

## Table Filters

The table supports:

| Filter | Query parameter | Notes |
|--------|-----------------|-------|
| Search | `search` | Search text is trimmed and uppercased before sending. Backend matching is case-insensitive. |
| Material Type | `item_group` | SAP item group name from WMS item groups. |
| Warehouse | `warehouse` | Comma-separated warehouse codes. Selecting 2 or more warehouses switches the backend to grouped item rows. |
| Status | `status` | Comma-separated values: `healthy`, `low`, `critical`, `unset`. The `unset` value is displayed as No Benchmark Set. |
| Movement | `movement_status` | Comma-separated values: `planned`, `recent`, `slow`. Omitted when none are selected. |
| Sort | `sort_by`, `sort_dir` | Defaults to `health_ratio` ascending. Planned Qty is sortable via `planned_qty`. |
| Pagination | `page`, `page_size` | Page defaults are controlled by the backend serializer. |

The Material Type dropdown includes `All`. Selecting it sends a blank material type, so the frontend omits `item_group` from the API request.

## Status Rules

Stock status is calculated by the backend so table rows, filters, and counts use the same rules.

| Status | Rule |
|--------|------|
| Healthy | Not slow-moving, required quantity is set, and `OnHand >= Benchmark + Planned Qty` |
| Low | Not slow-moving, required quantity is set, `OnHand < Benchmark + Planned Qty`, and `OnHand >= (Benchmark + Planned Qty) * 0.6` |
| Critical | Not slow-moving, required quantity is set, and `OnHand < (Benchmark + Planned Qty) * 0.6` |
| No Benchmark Set | Not slow-moving, and benchmark plus planned quantity is zero |

The SAP field behind Benchmark is `MinStock`; the API field remains `min_stock` for compatibility.
Slow-moving rows have no stock status. If Movement is changed to All while the Healthy/Low/Critical status filter remains selected, only benchmarked slow-moving rows remain visible; slow rows with no benchmark are excluded unless filters are changed.

The table shows open production demand as `Planned Qty`. Difference includes that demand as `On Hand - Benchmark - Planned Qty`, and the status/health ratio use the same required quantity.

## Movement Rules

Movement status is also calculated by the backend:

| Movement | Rule |
|----------|------|
| Planned | The item exists in an open SAP production plan with remaining planned quantity. |
| Recently Used | No open plan, but outbound consumption exists within the last 30 days. |
| Slow Moving | No open plan, and either no outbound consumption exists or last consumption is older than 30 days. |

Planning takes priority over movement age. If an item is planned, it is shown as Planned even if it has no recent consumption.
Stock and benchmark quantities still come from the selected warehouses, but movement age is item-level across SAP inventory movement. A recent consumption in another warehouse can therefore prevent the selected stock row from being marked Slow Moving.

## Grouped Rows

When multiple warehouses are selected, the backend groups rows by item. The grouped row aggregates `OnHand`, planned quantity, and the benchmark (`MinStock`) across the selected warehouses and returns `warehouse_count`.

If any child warehouse is worse than the aggregate status, the row includes `has_warning=true`. A grouped row can therefore be Healthy overall while showing a warning triangle for a Low or Critical child warehouse. The item detail panel fetches `GET /dashboards/stock/:itemCode/warehouses/` to show per-warehouse detail with the same stock and movement rules.

## Frontend Files

| File | Responsibility |
|------|----------------|
| `src/modules/dashboards/stock-level/pages/StockLevelDashboardPage.tsx` | Page state, default filters, stats query, table query |
| `src/modules/dashboards/stock-level/components/StockLevelFilters.tsx` | Search, material type, warehouse, status, movement filters |
| `src/modules/dashboards/stock-level/components/StockLevelMetaCards.tsx` | Top summary cards |
| `src/modules/dashboards/stock-level/components/StockLevelTable.tsx` | Table, status badges, movement badges, grouped-row warning |
| `src/modules/dashboards/stock-level/components/StockItemDetailPanel.tsx` | Expanded per-warehouse detail |
| `src/modules/dashboards/stock-level/api/stock-level.api.ts` | API parameter normalization |
| `src/modules/dashboards/stock-level/constants/stock-level.constants.ts` | Filter options and defaults |
| `src/modules/dashboards/stock-level/types/stock-level.types.ts` | TypeScript contracts |
