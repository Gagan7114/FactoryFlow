# Stock Benchmark Snapshot Plan

This plan adds historical Stock Benchmark snapshots without a cron job. A snapshot is created when a user opens the Stock Benchmark dashboard, but the backend reuses a recent snapshot if one already exists within the configured time window.

## Goals

- Let users view Stock Benchmark data as it existed at an available saved date and time.
- Capture multiple snapshots per day without running a scheduled job.
- Keep the snapshot scope stable, regardless of the filters a user had selected when opening the page.
- Keep database growth bounded with a rolling 6-month retention policy.
- Allow historical filtering for the most useful dimensions: warehouse, movement status, status, search, sorting, and pagination.

## Core Decisions

| Decision | V1 choice |
| --- | --- |
| Snapshot trigger | Explicit frontend call when the Stock Benchmark page mounts |
| Snapshot frequency limit | Reuse latest company snapshot if it is less than 30 minutes old |
| Maximum snapshots | 48 per company per day |
| Retention | Delete snapshots older than 6 months while saving a new snapshot |
| Rows per snapshot | About 400 rows |
| Snapshot scope | Packing Material, all warehouses, all stock statuses, all movement states |
| Historical filters | Applied to saved snapshot rows, not to live SAP |
| Cron job | Not required |

## Snapshot Scope

The snapshot should always use the canonical Stock Benchmark scope, independent of the user's current table filters:

- Material type: Packing Material only.
- Warehouses: all warehouses returned by SAP for the company.
- Movement: include Recently Used and Slow Moving rows.
- Status: include Healthy, Low, Critical, No Benchmark Set, and no-status slow-moving rows.
- Shape: store ungrouped item-warehouse rows so historical views can later filter or group by warehouse.

In snapshot mode, Material Type = All should mean "all rows inside the saved Packing Material snapshot scope", not every SAP material type.

## Size Estimate

Assumptions:

```text
400 rows per snapshot
48 maximum snapshots per day
6 months retention, approximately 183 days
```

Row count:

```text
400 * 48 * 183 = 3,513,600 snapshot rows
```

Storage estimate:

| Estimate | 6-month DB size |
| --- | ---: |
| Lean row storage | 1.8-3 GB |
| Realistic with indexes and overhead | 3-6 GB |
| Conservative upper budget | 7-8 GB |

Snapshot header rows are small:

```text
48 * 183 = 8,784 snapshot records
```

The main database cost is the snapshot row table. If the 30-minute reuse window is increased later, storage drops roughly in proportion to the number of snapshots per day.

| Snapshot reuse window | Max snapshots/day | 6-month rows at 400 rows/snapshot | Rough 6-month size |
| ---: | ---: | ---: | ---: |
| 15 minutes | 96 | 7.0M | 6-12 GB |
| 30 minutes | 48 | 3.5M | 3-6 GB |
| 1 hour | 24 | 1.8M | 1.5-3 GB |
| 2 hours | 12 | 0.9M | 0.8-1.5 GB |

## Backend Data Model

Add snapshot models in the backend `stock_dashboard` app.

```text
StockDashboardSnapshot
- id
- company_code
- captured_at
- captured_by nullable
- scope_key
- row_count
- healthy_count
- low_stock_count
- critical_stock_count
- unset_count
- slow_moving_count
- recent_moving_count
- data_hash nullable
- created_at

StockDashboardSnapshotRow
- id
- snapshot_id
- item_code
- item_name
- warehouse
- on_hand
- min_stock
- planned_qty nullable
- uom
- stock_status
- movement_status
- health_ratio
- last_consumption_date nullable
- days_since_last_consumption nullable
- has_warning default false
```

Recommended indexes:

- `StockDashboardSnapshot(company_code, captured_at)`
- `StockDashboardSnapshotRow(snapshot_id)`
- `StockDashboardSnapshotRow(snapshot_id, warehouse)`
- `StockDashboardSnapshotRow(snapshot_id, movement_status)`
- `StockDashboardSnapshotRow(snapshot_id, stock_status)`
- `StockDashboardSnapshotRow(snapshot_id, item_code)`

Avoid indexing every text field in V1. Search can start with `icontains` on 400-row snapshots and be optimized later if needed.

## Backend API

### Create Or Reuse Snapshot

```http
POST /dashboards/stock/snapshots/
```

Behavior:

1. Check the latest snapshot for the current company.
2. If `latest.captured_at >= now - 30 minutes`, return that snapshot without creating a new one.
3. If no recent snapshot exists, fetch the canonical Stock Benchmark scope from SAP.
4. Save a new `StockDashboardSnapshot` and all `StockDashboardSnapshotRow` records.
5. Delete snapshots where `captured_at < now - 6 months`; row cleanup should cascade.
6. Return the created or reused snapshot metadata.

Response:

```json
{
  "snapshot": {
    "id": 123,
    "captured_at": "2026-05-21T05:45:00Z",
    "row_count": 400,
    "healthy_count": 121,
    "low_stock_count": 6,
    "critical_stock_count": 23,
    "was_created": true
  }
}
```

If two users open the dashboard at the exact same time, the service should re-check for a recent snapshot inside the creation transaction. Occasional duplicate snapshots are not dangerous, but the re-check keeps the table tidy.

### List Available Snapshots

```http
GET /dashboards/stock/snapshots/?date_from=2026-05-01&date_to=2026-05-21
```

Returns snapshot metadata grouped or sorted by `captured_at DESC`. The frontend uses this to show the dates and times available in the database.

### Read Snapshot Rows

```http
GET /dashboards/stock/snapshots/{snapshot_id}/
```

Supported query params:

- `search`
- `warehouse`
- `status`
- `movement_status`
- `sort_by`
- `sort_dir`
- `page`
- `page_size`

This endpoint should return the same response shape as `GET /dashboards/stock/` as much as possible:

```json
{
  "data": [],
  "meta": {
    "total_items": 400,
    "healthy_count": 121,
    "low_stock_count": 6,
    "critical_stock_count": 23,
    "warehouses": ["BH-BS", "BH-PM"],
    "fetched_at": "2026-05-21T05:45:00Z",
    "snapshot_id": 123,
    "snapshot_captured_at": "2026-05-21T05:45:00Z",
    "page": 1,
    "page_size": 50,
    "total_pages": 8
  }
}
```

## Frontend Plan

Add one guarded snapshot creation call to `StockLevelDashboardPage`.

Rules:

- One page mount creates at most one snapshot request.
- Do not create snapshots on sorting.
- Do not create snapshots on pagination.
- Do not create snapshots on filter changes.
- Do not create snapshots from the stats query.

Implementation sketch:

```text
StockLevelDashboardPage mounts
  -> useRef guard confirms this mount has not requested a snapshot
  -> POST /dashboards/stock/snapshots/
  -> cache returned snapshot metadata
```

Historical UI:

- Add a compact Snapshot selector near the dashboard header or filters.
- Default mode remains Live.
- Snapshot mode shows available snapshot date-times from `GET /dashboards/stock/snapshots/`.
- When selected, show a visible chip: `Viewing snapshot: 21 May 2026, 11:15 AM`.
- Table filters continue to work, but they query snapshot rows instead of live SAP.
- The user can switch back to Live.

## Retention Policy

Retention is enforced only during snapshot creation:

```text
when POST /dashboards/stock/snapshots/ creates or reuses a snapshot:
  delete snapshots where captured_at < now - 6 months
```

If nobody opens the dashboard for a long time, old snapshots may remain until the next open. That is acceptable for V1 and avoids a cron dependency.

Deletion should happen after the new snapshot is safely created or reused. If deletion fails, return the snapshot response and log the cleanup failure for follow-up rather than blocking the dashboard.

## Implementation Phases

1. Backend models and migration
   - Add snapshot header and row models.
   - Add indexes and cascade delete.

2. Backend snapshot service
   - Add canonical Stock Benchmark snapshot capture.
   - Add 30-minute reuse logic.
   - Add 6-month cleanup on save.

3. Backend APIs
   - Add create/reuse endpoint.
   - Add snapshot list endpoint.
   - Add snapshot detail endpoint with filtering, sorting, and pagination.

4. Frontend API and query hooks
   - Add snapshot API functions.
   - Add React Query keys for snapshot create/list/detail.
   - Add one-mount snapshot creation guard.

5. Frontend snapshot UI
   - Add Live/Snapshot selector.
   - Show available dates and times.
   - Route table queries to live or snapshot endpoint based on mode.

6. Tests and verification
   - Backend tests for reuse, cleanup, snapshot row filtering, and pagination.
   - Frontend tests for "one mount, one snapshot request".
   - Manual verification with live mode, snapshot mode, filters, and pagination.

## Acceptance Criteria

- Opening the Stock Benchmark dashboard creates or reuses exactly one snapshot.
- A snapshot is not created when the user sorts, paginates, searches, or changes filters.
- If a snapshot exists within the last 30 minutes, no new snapshot rows are inserted.
- Snapshot list shows available captured date-times.
- Selecting a snapshot shows Stock Benchmark rows from that snapshot.
- Warehouse and movement filters work in snapshot mode.
- Snapshots older than 6 months are deleted during snapshot creation.
- Six months of maximum V1 usage should stay within an expected 3-8 GB database budget.

## Future Options

- Add a configurable snapshot reuse window per company.
- Add a manual "Capture now" button for admins.
- Store a `data_hash` and skip creating a new snapshot if the canonical rows are unchanged.
- Archive old snapshots to cheaper storage instead of deleting them.
- Add comparisons between two snapshot times.
