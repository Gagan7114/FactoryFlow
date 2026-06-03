# Maintenance Module

The Maintenance Module should become the central system for plant assets, spare parts, preventive maintenance, breakdowns, vendor visits, and maintenance reporting. In the current FactoryFlow app, maintenance already exists as a Gate entry type for repair material inward. This document refines that into a full maintenance module and shows how it connects with Gate-In, Production, WMS/Store, GRPO, QC, Barcode, Dashboards, Notifications, and SAP.

## Current App Context

FactoryFlow already has these related modules:

| Existing Module | Current Role | Maintenance Connection |
|---|---|---|
| Gate | Vehicle, supplier, security check, maintenance material gate-in | Receives spare parts, repair items, tools, and vendor material into the factory |
| Maintenance Gate-In | Maintenance type, work order number, supplier, material, equipment ID, urgency | Existing base flow for maintenance material inward |
| Production | Production planning, execution, machine checklist, breakdown log, downtime reports | Raises breakdowns and links machine downtime to maintenance work orders |
| WMS / Warehouse | SAP-backed warehouse stock, BOM requests, stock movement | Tracks spare stock, consumption, critical spares, and issue to work orders |
| GRPO | Posts accepted received material into SAP | Posts spare/vendor material receipts after gate completion when SAP posting is needed |
| QC | Inspections and accepted/rejected/hold decisions | Optional inspection for critical spare parts, lubricants, chemicals, and outsourced repairs |
| Barcode | Box, pallet, item, location, scan-based movement | QR/Code tagging for assets, spare parts, tools, and maintenance documents |
| Notifications | Push/user notifications | PM due alerts, breakdown escalation, low spare alerts, vendor visit reminders |
| Dashboards | Factory-level operational visibility | Shows maintenance KPIs, open breakdowns, overdue PMs, downtime, spare alerts |

## Target Goal

- Reduce production downtime by linking breakdowns directly to machines, production runs, and maintenance actions.
- Ensure preventive maintenance is planned, visible, assigned, and closed on time.
- Maintain an asset master with QR tagging, documents, photos, and lifecycle history.
- Track spare parts from gate-in or GRPO to store stock, issue, consumption, and reorder.
- Give management daily and monthly insight into MTTR, MTBF, downtime cost, PM compliance, and spare usage.

## Proposed Module Structure

```
src/modules/maintenance/
├── module.config.tsx
├── pages/
│   ├── MaintenanceDashboardPage.tsx
│   ├── assets/
│   ├── work/
│   ├── spares/
│   ├── vendors/
│   └── reports/
├── components/
├── api/
├── constants/
├── schemas/
├── types/
└── docs/
```

Backend can be added as a dedicated `maintenance` Django app while keeping the existing `maintenance_gatein` app for gate-entry receiving.

## End-to-End Integration Flow

```
Production Line / User Complaint
        |
        v
Maintenance Work Order
        |
        +-- Asset selected from Asset Master
        +-- Breakdown linked to ProductionRun when production is affected
        +-- Spare requirement checked in WMS / Store
        +-- If spare unavailable, request/purchase/vendor flow starts
        |
        v
Gate-In receives spare/vendor material
        |
        +-- Optional QC inspection for critical material
        +-- GRPO posts accepted material to SAP
        +-- WMS stock updated
        |
        v
Spare issued to Work Order
        |
        v
Maintenance completed with before/after photos, checklist, downtime, RCA/CAPA
        |
        v
Dashboards, reports, production downtime, and asset history updated
```

## Module-Wise Refined Scope

### 1. Maintenance Dashboard

The dashboard should summarize the health of assets, pending work, breakdown impact, and spare risk.

**Features**

- Asset status summary: Running, Idle, Breakdown, Under Maintenance, Retired.
- PM summary: Due today, overdue, completed, skipped, upcoming 7 days.
- Breakdown summary: Open, assigned, waiting spare, waiting vendor, resolved today.
- Production impact: downtime minutes, affected line, affected production run, lost output estimate.
- Spare alerts: low stock, critical spare unavailable, pending indent, high consumption.
- Vendor/AMC alerts: visit due, service pending, warranty expiry.
- Utility status: compressor, DG, boiler, RO, water, electrical panels.

**Connected Modules**

| Source | Dashboard Use |
|---|---|
| Production | Breakdown downtime, line stoppage, run impact |
| WMS / Warehouse | Spare stock and critical shortage |
| Gate / Maintenance Gate-In | Incoming repair material and vendor material status |
| Notifications | Alert counts and escalation status |
| SAP | Stock, GRPO, vendor receipt, purchase status where available |

### 2. Assets Module

Assets should be the master record for machines, utilities, equipment, panels, pumps, compressors, forklifts, tools, and safety-related equipment.

**Features**

- Asset master with code, name, category, line, department, location, make, model, serial number, purchase date, warranty, AMC, and responsible person.
- QR/Code tagging for each asset.
- Asset hierarchy: plant > area > line > machine > component.
- Asset status: Running, Idle, Breakdown, Under PM, Under Repair, Retired.
- Condition monitoring: vibration, temperature, noise, oil leakage, pressure, ampere load, running hours.
- Monthly asset photos.
- Before/after maintenance photos.
- Asset document storage: manuals, warranty cards, service reports, calibration certificates.
- Asset lifecycle history: all complaints, breakdowns, PMs, spare consumption, vendor visits, photos, and downtime.

**Connected Modules**

| Module | Integration |
|---|---|
| Production | Production run selects line/machine; breakdown against run updates asset status |
| Barcode | Asset QR opens asset profile, checklist, and work order creation |
| Gate-In | Incoming repair material can be mapped to `equipment_id` / asset code |
| WMS / Store | Spare consumption is posted against asset and work order |
| Reports | Asset utilization, recurring breakdowns, MTBF, MTTR |

### 3. Work Module

This is the operational heart of maintenance. It should manage complaints, breakdowns, preventive maintenance, inspections, safety tasks, and vendor work.

**Work Types**

| Work Type | Purpose |
|---|---|
| Complaint | User/department raises an issue before full breakdown |
| Breakdown | Machine stopped or production affected |
| Preventive Maintenance | Daily, weekly, monthly, quarterly, half-yearly, yearly PM |
| Inspection | Routine checks, safety inspection, utility inspection |
| Calibration | Instruments, weighbridge, gauges, lab equipment |
| AMC / Vendor Visit | External engineer or vendor service |
| Project / Improvement | Non-breakdown improvement work |

**Features**

- Complaint registration by production, store, QC, gate, admin, or maintenance team.
- Work order creation with priority, asset, department, line, target date, assignee, and impact.
- Preventive maintenance schedule by asset and frequency.
- Checklist builder for PM and inspection tasks.
- Mobile-friendly checklist execution.
- Breakdown start/end time, response time, repair time, downtime reason.
- Root cause analysis and CAPA fields for major breakdowns.
- Spare request from work order.
- Labor time and technician assignment.
- Vendor visit tracking with gate-in linkage.
- Completion approval by maintenance head or department owner.
- Reopen flow if issue repeats.

**Production Integration**

```
ProductionRun / Machine Checklist
        |
        +-- Operator reports issue
        v
Maintenance Work Order created
        |
        +-- ProductionRun.breakdown_status updated
        +-- Machine status becomes Breakdown
        +-- Downtime timer starts
        |
        v
Maintenance resolves issue
        |
        +-- Downtime timer stops
        +-- Breakdown reason posted to production reports
        +-- Asset history updated
```

### 4. Store / Spare Module

Spare management should connect maintenance demand with WMS/SAP stock and gate-in receiving.

**Features**

- Spare parts master with item code, part number, asset compatibility, category, UOM, vendor, make, model, and criticality.
- Critical spare list by asset/line.
- Minimum, maximum, reorder, and safety stock.
- Stock in/out and issue to work order.
- Spare reservation for PM or breakdown.
- Spare consumption by asset, work order, technician, and department.
- Return unused spare to store.
- Scrap/damaged spare tracking.
- Low stock and no-stock alerts.
- Indent/requisition flow for unavailable spare.

**Gate-In / GRPO / WMS Integration**

```
Spare required in Work Order
        |
        +-- Check WMS/SAP stock
        |
        +-- If available: Store issues spare to Work Order
        |
        +-- If unavailable: Indent/Purchase/Vendor process
                    |
                    v
              Gate Maintenance Entry
                    |
                    v
              QC if required
                    |
                    v
              GRPO / SAP posting
                    |
                    v
              WMS stock available
                    |
                    v
              Issue to Work Order
```

### 5. Vendor / AMC Module

Vendor work should be visible from the moment a visit is planned until the service report is attached and the work order is closed.

**Features**

- Vendor master and AMC contract details.
- Warranty and AMC expiry alerts.
- Vendor visit plan with asset, problem, visit date, and contact.
- Link vendor person/vehicle to Gate-In or Person Gate-In.
- Attach service report, invoice, quotation, and photos.
- Track vendor response time, repeat visits, and pending action.
- Rate vendor by service quality and closure time.

**Connected Modules**

| Module | Integration |
|---|---|
| Gate / Person Gate-In | Vendor engineer and repair material entry |
| Maintenance Work | Vendor visit belongs to one or more work orders |
| Assets | Warranty/AMC asset coverage |
| Notifications | Visit reminders and delayed visit escalation |

### 6. Reports Module

Reports should serve both daily maintenance control and monthly management review.

**Reports**

- Daily maintenance report.
- Monthly maintenance summary.
- PM due, completed, skipped, and overdue report.
- Breakdown report by line, machine, reason, shift, and department.
- Downtime Pareto and recurring issue analysis.
- MTTR and MTBF report.
- Spare consumption report by asset, line, work type, and department.
- Critical spare availability report.
- Vendor/AMC visit report.
- Utility consumption and utility downtime report.
- Safety inspection and compliance report.
- Before/after maintenance photo report.

**Export**

- PDF for daily/monthly reviews.
- Excel for spare usage, breakdown history, and asset history.
- Drill-down from dashboard cards to filtered reports.

## Data Model Proposal

| Model | Purpose | Important Links |
|---|---|---|
| `MaintenanceAsset` | Machine/utility master | Department, line, location, QR code |
| `AssetComponent` | Motor, pump, panel, sensor, belt, bearing, etc. | Parent asset |
| `MaintenanceWorkOrder` | Complaint, breakdown, PM, inspection, AMC work | Asset, ProductionRun, Department, assignee |
| `PreventiveMaintenancePlan` | Frequency and checklist schedule | Asset, checklist template |
| `MaintenanceChecklistTemplate` | Reusable checklist definition | Work type, asset category |
| `MaintenanceChecklistResult` | Filled checklist with readings | Work order |
| `MaintenanceSpare` | Spare master | SAP item code, compatible assets |
| `WorkOrderSpareIssue` | Spare issued/consumed | Work order, spare, WMS/SAP reference |
| `MaintenanceVendorVisit` | Vendor/AMC visit | Work order, vendor, gate/person entry |
| `AssetPhoto` | Monthly and before/after photos | Asset, work order |
| `MaintenanceReading` | Condition monitoring readings | Asset, work order/checklist |

## Suggested Development Priority

1. Assets Module: Asset master, QR tagging, status, photos, asset history.
2. Work Module: Complaints, breakdowns, PM schedules, checklist execution, work order closure.
3. Production Integration: Link breakdowns to ProductionRun, downtime, line/machine status, production reports.
4. Store / Spare Integration: Spare master, stock check, issue to work order, critical spare alerts.
5. Gate-In / Vendor Integration: Link maintenance gate entries and person/vendor visits to work orders.
6. Dashboard: Maintenance KPIs, overdue PMs, open breakdowns, downtime and spare alerts.
7. Reports: Daily/monthly reports, MTTR/MTBF, spare consumption, asset utilization.
8. SAP/GRPO Enhancements: Posting references, purchase/receipt status, SAP item mapping.

## Permissions

| Permission | Description |
|---|---|
| `maintenance.view_dashboard` | View maintenance dashboard |
| `maintenance.manage_assets` | Create/edit assets and components |
| `maintenance.view_assets` | View asset master and history |
| `maintenance.create_work_order` | Create complaints and work orders |
| `maintenance.assign_work_order` | Assign technician/vendor |
| `maintenance.close_work_order` | Complete and close work orders |
| `maintenance.approve_closure` | Approve completed work |
| `maintenance.manage_pm` | Create/edit PM schedules and checklists |
| `maintenance.issue_spares` | Issue spare parts to work orders |
| `maintenance.view_reports` | View and export reports |
| `maintenance.manage_vendors` | Manage vendor/AMC records |

## Status Lifecycle

### Asset Status

```
RUNNING -> IDLE -> UNDER_PM -> RUNNING
RUNNING -> BREAKDOWN -> UNDER_REPAIR -> RUNNING
RUNNING -> RETIRED
```

### Work Order Status

```
DRAFT -> OPEN -> ASSIGNED -> IN_PROGRESS -> WAITING_SPARE -> IN_PROGRESS -> COMPLETED -> APPROVED -> CLOSED
                                      |
                                      +-- WAITING_VENDOR
                                      +-- ON_HOLD
```

## Related Documentation

- [Gate Module](./gate.md)
- [Production Module](./production.md)
- [WMS Module](./wms.md)
- [GRPO Module](./grpo.md)
- [QC Module](./qc.md)
- [Barcode Module](./barcode.md)
- [Dashboard Module](./dashboard.md)
