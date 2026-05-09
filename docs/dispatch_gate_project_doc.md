# Project Documentation

Generated from the code and local PostgreSQL schema on 2026-05-09.

This project contains two related applications:

1. A root-level QR scanner for tracking physical assets/sheets/pellets through QR codes.
2. A `/mobile` PHP application called Utilities Mobile / JivoFactory for factory operations, form collection, approvals, material movement, truck docking, gate pass printing, reporting, and notifications.

The code is plain PHP, HTML, JavaScript, and SQL. There is no application framework, router, build step, package manifest, or Git repository metadata in this directory.

Security note: this document intentionally does not repeat hardcoded database passwords, API keys, or SMTP passwords. The source currently contains several secrets directly in PHP files and JavaScript constants; those should be moved to environment variables or a server-side secret store.

## High-Level Purpose

The system is an operational factory tool for Jivo Wellness/JivoFactory. It handles:

- Mobile data entry through database-driven forms.
- Utility meter readings, production/warehouse logs, labour requests, quality/lab checks, material-out records, kitchen/wastage/production data.
- Approval of submitted forms by users who have approval permissions.
- Material outward movement, return closing, and receipt confirmation.
- Truck docking, dock-photo upload, gate-pass generation, and final gate-print commit tracking.
- SAP HANA/ERP invoice lookups through SQL Server linked servers.
- Reports with date filters, image display, and Excel download.
- Automated WhatsApp and email notification scripts.
- A dispatch lock that prevents gate movement during lock periods.
- A QR scanner for asset/location tracking outside the `/mobile` app.

## Runtime Stack

| Area | Implementation |
| --- | --- |
| Backend | Vanilla PHP scripts |
| Frontend | Server-rendered HTML, plain JavaScript, jQuery, Bootstrap on PWA pages |
| Main database | PostgreSQL database `utilities` on `localhost` |
| QR database | PostgreSQL database `postgres` on `proxy2.jivocanola.com` |
| ERP/SAP integration | SQL Server `sqlsrv` extension with linked SAP HANA servers such as `HANA112` / `HANADB112` |
| Notifications | AiSensy WhatsApp campaign API and PHPMailer SMTP |
| PWA | `mobile/manifest.json` and `mobile/sw.js` |
| Image storage | `/var/www/site2/mobile/uploads/` |
| QR scanning library | `lib.js`, bundled Html5Qrcode library |

Required PHP extensions based on code usage:

- `pgsql`
- `sqlsrv`
- `curl`
- `json`
- `mbstring` or equivalent string support
- file upload support

External libraries expected on the server:

- PHPMailer files under `/home/phpmailer/`
- FPDF under `/home/fpdf/fpdf.php`

## Top-Level File Map

### Root Files

| File | Purpose |
| --- | --- |
| `index.html` | Immediate redirect to `scan2.html`. |
| `scan.html` | First QR scanner page. Uses `lib.js`, expects QR payload `id,unique_code`, calls `scanner.php`, and displays a text result. |
| `scan2.html` | Enhanced QR scanner page. Uses `scanner2.php`, shows success/error styling, supports location-update form returned by the server. |
| `scanner.php` | Basic QR validation and audit insert endpoint. |
| `scanner2.php` | Enhanced QR scan endpoint with one-scan-per-day protection and location update flow. |
| `check_qrcodes.php` | Debug/helper script that prints sample rows from `tbl_qrcodes`. |
| `test_db.php` | Debug/helper script that connects to the QR PostgreSQL database and lists public tables. |
| `lib.js` | Bundled/minified Html5Qrcode JavaScript library. |
| `JivoFactory.html` | Self-contained TiddlyWiki page titled "JivoFactory"; mainly a static knowledge/link hub including links to scanners, dashboards, and the mobile app. |
| `README.md` | Existing narrow note about notification debugging changes. |
| `mobile.tar.gz`, `um.apk` | Binary/deployment artifacts, not source code. |

### Mobile Directory

The `/mobile` directory is the main operational app.

| Group | Files |
| --- | --- |
| Shared config | `config.php`, `sqlsrv_retry.php` |
| Login/session | `login_html.php`, `check_login.php`, `validate_session.php`, `logout.php` |
| Main menus | `main_html.php`, `menu_include.php`, `menu_include_android.php` |
| PWA/mobile form app | `um.php`, `um_power.php`, `manifest.json`, `sw.js` |
| Form APIs/views | `list_forms.php`, `list_forms_html.php`, `get_questions.php`, `submit_response.php`, `submit_response_html.php` |
| Approval/material movement | `utility_approval.php`, `approve_submission.php`, `show_submission.php`, `set_out_movement.php`, `close_responses.php`, `close_submission.php`, `confirm_received.php` |
| Reporting | `reporting.php`, `reporting_android.php`, `planningreport.php`, `material_out_report.php` |
| Dock/gate/invoice | `dock_invoice.php`, `dock_photo.php`, `gate_invoice2.php`, `gate_finalprint.php`, `empty_truck_in.php`, `mart_print.php`, `gupta_invoice.php` |
| Notifications/jobs | `polling.php`, `polling2.php`, `polling3.php`, `polling4.php`, `polling4b.php`, `polling5.php`, `polling6.php`, `polling7.php`, `polling7b.php`, `polling8.php`, `polling9.php` |
| Admin/debug tools | `pg_client.php`, `sql_client.php`, `lock.php`, `temp.php` |
| Backup/old variants | `dock_invoice.php.master`, `dock_photo.php.new`, `reporting.bak`, `login_html.bak` |

## Authentication And Authorization

The project has two authentication patterns.

### Browser Session Login

Used by most server-rendered pages.

1. User opens `mobile/login_html.php`.
2. If `$_SESSION['expiry']` exists and is still in the future, the user is redirected to `main_html.php`.
3. On POST, the script reads `login` and `password`.
4. Empty values show `Please enter both login ID and password`.
5. The password is compared directly with `tbl_login.password`.
6. On success:
   - A random base64 session token is generated.
   - A 7-day expiry is calculated.
   - A 5-minute `hyper_expiry` is calculated but is not widely enforced elsewhere.
   - A row is inserted into `tbl_sessions`.
   - `$_SESSION['session_token']`, `$_SESSION['expiry']`, `$_SESSION['login']`, and `$_SESSION['hyper_expiry']` are set.
   - User is redirected to `main_html.php`.
7. Invalid login or bad password shows an error.

Protected pages usually check:

```php
if (!isset($_SESSION['session_token']) || time() >= $_SESSION['expiry']) {
    header('Location: login_html.php');
    exit();
}
```

Many protected pages also check `tbl_pageperm`:

- `login` must match `$_SESSION['login']`.
- `url` must match `basename($_SERVER['PHP_SELF'])`.
- If no row exists, the page prints `No access.` and exits.

### API Password And Local Storage Login

Used by `um.php` and `um_power.php`.

1. The JavaScript has a hardcoded shared API password.
2. Login calls `check_login.php?password=<shared-password>&login=<login>&pwd=<user-password>`.
3. `check_login.php` requires `config.php` and calls `check_password()`.
4. User password is compared against `tbl_login.password`.
5. On success, a token is inserted into `tbl_sessions`.
6. The response includes `session_token`, `expiry`, and `hyper_expiry`.
7. The browser stores token, expiry, login, and password in `localStorage`.

Important condition: most API endpoints only check the shared API password, not the session token. `validate_session.php` can validate a token, but the PWA code does not use it consistently before API calls.

### Permission Tables

| Table | Purpose |
| --- | --- |
| `tbl_login` | Users, names, passwords, email IDs, phone numbers. |
| `tbl_sessions` | Generated session tokens and expiry timestamps. |
| `tbl_pageperm` | Page-level access for server-rendered pages and menus. |
| `tbl_permissions` | Form-level upload/approval access. `UPLD` allows form submission; `APPR` allows approval. |
| `tbl_reportaccess` | Report-level access inside reporting dashboards. |

## Database Model

This section reflects the local PostgreSQL schema inspected on 2026-05-09.

### Core Tables

`tbl_login`

- `id integer`
- `name character varying`
- `login character varying`
- `password character varying`
- `emailid character varying`
- `phonenum character varying`

`tbl_sessions`

- `id integer`
- `login character varying`
- `session_token character varying`
- `expiry timestamp`
- `created_at timestamp`

`tbl_questions`

- `id integer`
- `formid integer`
- `formname character varying`
- `questionid integer`
- `question character varying`
- `type character varying`

`tbl_permissions`

- `id integer`
- `login character varying`
- `formid integer`
- `access character varying`

`tbl_pageperm`

- `pagename character varying`
- `url character varying`
- `login character varying`

`tbl_reportaccess`

- `reportname character varying`
- `login character varying`

### Form Response Table

`tbl_responses`

- `id integer`
- `formid integer`
- `questionid integer`
- `datetimestamp timestamp`
- `response character varying`
- `imagepath character varying`
- `approved integer`
- `approvedby character varying`
- `approvaldttm timestamp`
- `responseid character varying`
- `loginuser character varying`
- `closed character varying`
- `out_movement character varying`
- `gatepassid integer`
- `randcode character varying`
- `notified integer`
- `gateout_person character varying`
- `gate_return_receiver character varying`
- `notified_return integer`
- `received_back integer`
- `notified_self integer`

Important status meanings inferred from code:

- `approved IS NULL`: pending approval.
- `approved = 1`: approved.
- `approved = 2`: rejected.
- `approvedby = 'AUTO'`: auto-approved by `polling5.php`.
- `closed = 'C'`: material-out return flow closed by gate/receiver.
- `out_movement = 1`: material or gate pass has moved out.
- `notified = 1`: generic approval/reminder notification sent.
- `notified_return = 1`: return notification sent to sender.
- `received_back = 1`: sender/final recipient has confirmed receipt through `confirm_received.php`.
- `notified_self = 1`: submitter self-notification sent.

### Truck And Invoice Tables

`tbl_invoice_printing`

- `id integer`
- `db character varying`
- `invoiceid character varying`
- `dttm timestamp`
- `login character varying`
- `gatepass integer`
- `randcode character varying`
- `gate_printed integer`
- `bilty character varying`
- `biltydate date`
- `truckno character varying`
- `transporter character varying`
- `contact character varying`
- `drivername character varying`
- `freightamt double precision`
- `dockincharge character varying`
- `printdate timestamp`
- `print_commit integer`
- `rejected integer`
- `rejectdttm timestamp`
- `system_comment character varying`
- `photo_path character varying`
- `customer_name character varying`
- `inv_amount numeric`
- `billed_qty bigint`
- `latitude double precision`
- `longitude double precision`
- `eway_bill_attached smallint`
- `uom character varying`
- `physical_quantity integer`
- `sap_weight numeric`
- `wb_weight numeric`

Key state meanings:

- `gate_printed = 0`: docked, waiting for gate pass.
- `gate_printed = 1`: gate pass generated/printed at least once.
- `print_commit = 1`: final print commit completed through `gate_finalprint.php`.
- `print_commit IS NULL`: printed in PostgreSQL but not finally committed.
- `print_commit = 0`: copied into JSAP mirror table but not finally committed.
- `rejected = 1`: invoice rejected at gate after docking.
- `photo_path IS NULL`: dock photo not attached yet.

`tbl_truck_entry`

- `dttm timestamp`
- `truckno character varying`
- `login character varying`

`tbl_invoice_ggo`

- `id integer`
- `entry_id integer`
- `truck_number character varying(20)`
- `driver_name character varying(100)`
- `driver_contact character varying(20)`
- `transporter_name character varying(100)`
- `bilty_number character varying(50)`
- `invoice_number character varying(20)`
- `company_db character varying(50)`
- `customer_name character varying(255)`
- `customer_address text`
- `dttm timestamp`
- `login character varying(50)`

`wb_data`

- `id character varying`
- `vehicle_name character varying`
- `material_name character varying`
- `cardcode character varying`
- `gross_wt character varying`
- `gross_dt character varying`
- `tare_wt character varying`
- `tare_dt character varying`
- `net_wt character varying`

### Control And Notification Tables

`tbl_lock`

- `lockedout integer`

`tbl_lock_email`

- `status character varying`

`notified_bunty`

- `responseid character varying`

`notification_log`

- `id integer`
- `responseid character varying`
- `notification character varying`

### QR Tables Used By Root Scanner

These are in the remote/root QR database, not the `utilities` database:

- `tbl_qrcodes`: expected columns include `id`, `unique_code`, and `location`.
- `tbl_auditlog`: expected columns include `id`, `itemid`, `operation`, `stamp`, and `location`.

## Dynamic Forms

Forms are stored in `tbl_questions`. `questionid` is scoped by `formid`. Each answer is stored as a separate row in `tbl_responses`; all rows belonging to the same submitted form share the same `responseid`.

Question type handling:

- `INT`: rendered as a number input in `um.php`; server accepts numeric/decimal-looking strings.
- `TEXT`: rendered as a text input.
- `IMG`: rendered as an image upload/camera field; image is base64 encoded by the client and stored under `/var/www/site2/mobile/uploads/`.
- `YES/NO`: rendered as radio buttons in `um.php`.
- Any other type containing `/`: rendered as a select dropdown with slash-separated options.
- `ON/OFF`, `ACCEPT/REJECT/HOLD`, `Oil/Beverages`, etc. are all handled through slash-separated options unless special-cased by a page.

### Current Forms And Questions

| Form | Name | Questions |
| --- | --- | --- |
| 1 | Electricity main meter | 1 Reading in KWHr `[INT]`; 3 Reading in KVAH `[INT]` |
| 2 | Electricity Ground Floor | 1 Reading in KWHr `[INT]`; 2 Photo `[IMG]` |
| 3 | Electricity First Floor | 1 Reading in KWHr `[INT]`; 2 Photo `[IMG]` |
| 4 | Electricity Terrace Floor | 1 Reading in KWHr `[INT]`; 2 Photo `[IMG]` |
| 5 | Boiler | 1 Reading in KWHr `[INT]`; 2 Photo `[IMG]`; 3 Brickett consumption `[INT]`; 4 Boiler water input reading `[INT]`; 5 Photo `[IMG]`; 6 Steam `[INT]` |
| 6 | HP Compressor 512 | 1 Reading in KWHr `[INT]`; 2 Photo `[IMG]` |
| 7 | HP Compressor 196 | 1 Reading in KWHr `[INT]`; 2 Photo `[IMG]` |
| 8 | LP Compressor | 1 Reading in KWHr `[INT]`; 2 Photo `[IMG]` |
| 9 | DG1 Hours | 1 Reading `[INT]` |
| 10 | DG2 Hours | 1 Reading `[INT]` |
| 11 | Powercut | 1 Power? `[ON/OFF]` |
| 12 | Borewell 1 consumption | 1 Reading `[INT]`; 2 Photo `[IMG]` |
| 13 | Borewell 2 consumption | 1 Reading `[INT]`; 2 Photo `[IMG]` |
| 16 | Truck load Arrival | 1 Item Name `[TEXT]`; 2 Weighing Required `[YES/NO]`; 3 Vendor Name `[TEXT]`; 4 Billing Qty `[INT]`; 5 Truck No. as per bill `[TEXT]`; 6 Invoice No. `[TEXT]`; 7 BILTY No. `[INT]`; 8 Certificate of Analysis `[YES/NO]` |
| 17 | Quality Acceptance | 1 Item name `[TEXT]`; 2 Lab in Time `[TEXT]`; 3 Sample is approved or not `[ACCEPT/REJECT/HOLD]`; 4 Reason `[TEXT]`; 5 Photo `[IMG]` |
| 18 | Machine or Material or FOC sample out | 1 Description of Machine / Material `[TEXT]`; 2 Reason for Out movement `[TEXT]`; 3 Photo `[IMG]`; 4 Invoice, if NA enter 0 `[TEXT]`; 5 Returnable `[Returnable/Non-returnable]`; 6 Business `[Oil/Beverages]`; 7 Delivery Note, if NA enter 0 `[TEXT]`; 8 Sender email override `[TEXT]`; 9 Final receiver email for non-returnable `[TEXT]` |
| 19 | Labour Request | 1 How many labourers you need? `[INT]`; 2 Day or night shift? `[Tomorrow Day/Tonight]` |
| 20 | Labour Received | 1 How many labourers you received? `[INT]`; 2 Acceptance `[YES/NO]`; 3 Day or night shift? `[Day/Night]` |
| 21 | ETP | 1 Input reading `[INT]`; 2 Photo `[IMG]`; 3 Output reading `[INT]`; 4 Photo `[IMG]` |
| 22 | STP | 1 Input reading `[INT]`; 2 Photo `[IMG]`; 3 Output reading `[INT]`; 4 Photo `[IMG]` |
| 23 | Urgent labour need now | 1 How many labour you need? `[INT]` |
| 24 | Urgent labour need - receipt | 1 How many labour you received? `[INT]` |
| 25 | Labour request - Oil | Clearpack, JP, 10 Head, 6 head, Tin Pack, Pouch OLD/NEW, Desi ghee, Seeds, Stock Transfer, Goods return, Company labour available, Outside labour required, shift, non-machine labour, and SKU selections for 10 head/Clearpack/6 head |
| 26 | Labour request - Beverage | Shift, Water line, Wheatgrass, Rework, Process room, CSD, Bottle Blowing, Company labour available |
| 27 | Labour received - Oil | Oil labour receipt counts for the same departments plus shift and non-machine labour |
| 28 | Labour received - Beverage | Beverage labour receipt counts plus shift |
| 29 | YBR Data | Y/B/R voltage and ampere readings, images, and earthing value |
| 30 | Kitchen Expenses | Cost heading, description, amount, date |
| 31 | Kitchen food consumers | Breakfast+lunch+dinner headcount |
| 32 | Wastage | SKU/PM/FG number, description, number wasted |
| 33 | Production | SKU/PM/FG number, number produced |

## Form API Details

### `config.php`

Sets:

- Shared API password used by `check_password()`.
- PostgreSQL connection to `utilities`.
- JSON content type.

`check_password()` requires `$_GET['password']` to match the shared password. Missing or wrong password returns HTTP 403 and JSON `{ "error": "Unauthorized" }`.

### `list_forms.php`

Inputs:

- GET `password`
- GET `login`

Conditions:

- Shared API password must be valid.
- `login` is required.
- Returns only forms for which `tbl_permissions.login = login` and `access = 'UPLD'`.

Output:

- JSON array of `formid`, `formname`, and a generated `link` to `get_questions.php`.

### `get_questions.php`

Inputs:

- GET `password`
- GET `formid`

Conditions:

- Shared API password must be valid.
- `formid` must be present.
- `formid` is converted to integer.

Output:

- JSON array of questions ordered by `questionid`.

### `submit_response.php`

Inputs:

- GET `password`
- POST `formid`
- POST `questionid`
- POST `responseid`
- POST `user`
- POST `answer`

Conditions:

- Shared API password must be valid.
- Missing `formid`, `questionid`, `responseid`, or `user` returns an error.
- Question type must exist in `tbl_questions` for that `formid` and `questionid`.
- For `INT`, the answer must be numeric/decimal-like. Invalid zero-like values are rejected.
- For `TEXT`, answer is accepted as text.
- For `IMG`, answer must be base64, decode successfully, and be writable to `/var/www/site2/mobile/uploads/`.
- Unknown types default to text behavior.

Database action:

- Inserts one row into `tbl_responses` with `(formid, questionid, response, imagepath, responseid, loginuser)`.

Important behavior:

- A full submitted form creates one row per question.
- The client generates a UUID-like `responseid` and posts each question independently.
- There is no transaction covering all answers in `um.php`, so partial submission can occur if some question posts fail.

## PWA And Mobile Entry Points

### `um.php`

Main mobile PWA/browser entry.

Flow:

1. On load, checks `localStorage` expiry.
2. If session still valid by local timestamp, shows forms.
3. Otherwise shows login.
4. Login calls `check_login.php`.
5. Available forms are loaded from `list_forms.php`.
6. Selecting a form calls `get_questions.php`.
7. Questions render dynamically by type.
8. Image fields use camera capture with `capture="environment"`.
9. Images are compressed client-side to a target of about 300 KB, max dimension 1600 px.
10. On submit, all questions must have answers.
11. Each answer is posted separately to `submit_response.php`.
12. When all posts finish, the user sees success/failure counts.
13. Reporting opens `reporting_android.php` inside an iframe by POSTing stored login/password.

Client-side validation conditions:

- Empty login or password blocks login attempt.
- No available forms shows `No forms available`.
- No questions for a form shows `No questions available for this form`.
- Image must be an image MIME type.
- Image must be less than 10 MB before compression.
- All questions must be answered before submission.

### `um_power.php`

Variant of `um.php` for power users who want to upload gallery photos. Main difference:

- `IMG` input does not force `capture="environment"`, so gallery selection is allowed.
- It links `manifest.json` for PWA installation metadata.

### `submit_response_html.php`

Older/standalone form page for a specific `formid`.

Inputs:

- GET `formid`

Features:

- Fetches questions.
- Supports Cordova camera plugin, Flutter `NativeBridge`, and HTML file input fallback.
- Submits answers sequentially.

Important condition:

- It uses a hardcoded `responseid` value of `abc`, so it is not suitable for normal production multi-submission use without change.

## Main Web Dashboard

### `main_html.php`

After login, displays a page grid based on `tbl_pageperm`.

Conditions:

- Requires PHP session.
- Queries `tbl_pageperm` for current login.
- Excludes URLs containing `android`.
- Sorts reporting last by substituting `Reporting` with sort key `ZZZ`.
- If no pages are found, shows a "no access to any pages" message.

### `menu_include.php`

Shared menu included on protected pages.

Behavior:

- Reuses existing `$db` connection if available.
- Otherwise opens its own PostgreSQL connection.
- Shows the same permissioned page grid as `main_html.php`.
- Highlights the current page by comparing URL basename.
- If session is missing/expired, shows a login prompt instead of redirecting.

### `menu_include_android.php`

Android-specific menu include.

Behavior:

- Does not validate PHP session.
- Reads login from `$_POST['login']`.
- Only exposes `reporting_android.php` if permitted.

## Approval Workflow

### `utility_approval.php`

Approval dashboard.

Conditions:

- Requires PHP session.
- Requires `tbl_pageperm` access to `utility_approval.php`.
- Connects to SQL Server `Jivo_All_Branches_Live` for SAP checks.
- Fetches rows where:
  - `tbl_responses.approved IS NULL`
  - the current user has `tbl_permissions.access = 'APPR'`
  - response rows join to `tbl_questions`
- Groups rows by `(formid, responseid)`.

Invoice validation special case for Form 18:

- If a question text equals `Invoice, if NA enter 0`, and the value is not `0`, `NA`, or `na`, the value is treated as an invoice number.
- If question text `Business` equals `Oil`, the SAP schema is `JIVO_OIL_HANADB`; otherwise it is `JIVO_BEVERAGES_HANADB`.
- For Form 18 question 9, the page checks SAP for the invoice/customer.
- If SAP has no matching invoice, it updates the Form 18 invoice response by appending `/INVALID`, unless already marked invalid.

Editing and actions:

- Non-image responses are editable in text inputs.
- Image responses display uploaded images from `/mobile/uploads/`.
- Approve button exists for all pending submissions.
- Reject button exists only for forms `18`, `19`, `25`, and `26`.

### `approve_submission.php`

JSON endpoint called by `utility_approval.php`.

Input JSON:

- `formId`
- `submissionId`
- `editedResponses`
- `action`, either `approve` or `reject`

Conditions:

- Requires valid PHP session.
- Invalid/missing input returns HTTP 400.
- Starts a PostgreSQL transaction.
- For every edited response:
  - If `formId != 18`, update `tbl_responses.response`.
  - Update is allowed only when `approved IS NULL`.
  - Form 18 editing is intentionally skipped because editing could overwrite `/INVALID` invoice markers.
- Sets approval status on all rows for that form/submission where `approved IS NULL`.

Status mapping:

- `approve` -> `approved = 1`
- `reject` -> `approved = 2`

Other fields set:

- `approvaldttm = timezone('Asia/Kolkata', now())`
- `approvedby = $_SESSION['login']`

WhatsApp notification logic exists but is currently commented out, so responses return `"No notification sent"` even after successful approval/rejection.

## Form 18 Material-Out Workflow

Form 18 is central to material/machine/sample outward movement.

### Submission

User submits:

- Description.
- Reason.
- Photo.
- Invoice or `0`/`NA`.
- Returnable vs Non-returnable.
- Business, Oil or Beverages.
- Delivery note.
- Optional sender email override.
- Optional final receiver email.

### Approval

Pending Form 18 entries appear in `utility_approval.php` for approvers with `APPR` permission.

Special conditions:

- Some invoice numbers may be marked `/INVALID` during approval page loading if SAP lookup fails.
- Form 18 edited responses are not saved by `approve_submission.php`.

### Gate Out / Out Movement

`show_submission.php` lists approved Form 18 submissions ready for out movement.

Conditions:

- Requires session and page permission.
- Only shows:
  - `formid = 18`
  - `approved = 1`
  - `approvaldttm` between yesterday and tomorrow window used by the code
  - `out_movement IS NULL`
- Clicking a row/card reveals the out movement button.

On POST `action=gatepass`:

- Requires `formId` and `submissionId`.
- Updates all matching response rows where `out_movement IS NULL`:
  - `out_movement = 1`
  - `randcode = random 5-character code`
  - `gatepassid = nextval('tbl_responses_gatepassid_seq')`
  - `gateout_person = current login`
- If no rows update, returns `Gatepass already printed.`
- Fetches submission details and renders a printable gate pass with QR content `gatepassId-randCode`.

Invoice coupling condition:

- If the Form 18 invoice question has a non-empty, non-NA, non-0 invoice value and is not marked `/INVALID`, `show_submission.php` checks `tbl_invoice_printing`.
- If the invoice is already marked out, it rejects the gate pass.
- Otherwise it inserts into `tbl_invoice_printing` with `gate_printed = 1`, `print_commit = 1`, and `system_comment = 'printed via form 18'`.
- It also inserts into the SQL Server/JSAP mirror `tbl_invoice_printing` with `print_commit = 0`.

### Manual Out Movement Endpoint

`set_out_movement.php` directly sets `out_movement = 1`.

Conditions:

- Requires session.
- Input JSON must contain `formId` and `submissionId`.
- Updates only submissions whose `approvaldttm` is in a two-day window around today.

This endpoint is present but `show_submission.php` now posts to itself for full gate pass generation.

### Closing Returnable Items

`close_responses.php` lists returnable Form 18 entries that have gone out but are not closed.

Conditions:

- Requires session and page permission.
- Shows rows where:
  - `formid = 18`
  - `closed IS NULL`
  - `approved = 1`
  - `out_movement = '1'`
  - a response for question 5 is exactly `Returnable`
- Selecting a row/card reveals a Close button.

`close_submission.php` closes a submission.

Input JSON:

- `formId`
- `submissionId`

Database action:

- Sets `closed = 'C'`
- Sets `gate_return_receiver = current login`
- Only updates rows where `closed IS NULL`

### Receipt Confirmation

`confirm_received.php` is opened from email links.

Inputs:

- GET `id`
- GET `token`

Conditions:

- `id` must be positive.
- `token` must equal `md5(id . '##hsjivofriendsalways##')`.
- Updates only `tbl_responses.id = id`, `formid = 18`, `questionid = 1`.

Database action:

- Sets `received_back = 1`.

Outputs:

- Success message with material name if a row was updated.
- Warning if no matching row exists or it was already processed.
- Error if token is invalid or database update fails.

## Labour Approval And Notification Workflow

Relevant forms:

- `19`: simple labour request.
- `20`: simple labour received.
- `23`: urgent labour need now.
- `24`: urgent labour receipt.
- `25`: oil/canola detailed labour request.
- `26`: beverage detailed labour request.
- `27`: oil labour received.
- `28`: beverage labour received.

### `polling5.php` Labour Auto-Approval

Runs from CLI/cron-style execution.

It processes unapproved entries for forms `19`, `25`, and `26`.

Unapproved condition:

- Row in `tbl_responses`
- `formid = target form`
- `questionid = 1`
- `approved IS NULL OR approved = 0`

Form 25 Oil/Canola thresholds:

- Clearpack depends on SKU question 17:
  - `5 LTR`: 20
  - `1 LTR`: 18
  - `1+1`: 22
  - `5+1`: 24
  - missing/invalid defaults to `5 LTR`
- JP: 18
- 10 Head depends on SKU question 16:
  - `5 LTR`: 18
  - other: 15
- 6 head depends on SKU question 18:
  - `1 LTR`: 15
  - other: 18
- Tin: 17
- Pouch OLD + NEW combined: 9
- Desi ghee: 12
- Seeds: 7
- Stock transfer: 5
- Goods return: 2
- Non-machine: 3

Form 26 Beverage thresholds:

- Water line: 11
- Wheatgrass: 15
- Rework: 0
- Process room: 7
- CSD: 0
- Bottle blowing: 4
- Total standard limit: 37

Form 19 FG Warehouse threshold:

- `labour` limit is 0, so any positive value needs approval.

Decision:

- If no individual or total limit is exceeded, all rows for the `responseid` are auto-approved with `approved = 1`, `approvedby = 'AUTO'`, and `approvaldttm = NOW()`.
- If approval is needed and `notified` is not already 1, it sends WhatsApp notification to configured approver numbers.
- Templates:
  - Form 25: `labour_canola_approve`
  - Form 26: `labour_beverages_approve`
  - Form 19: `labour_fg_approve`
- If at least one notification succeeds, sets `notified = 1` on question 1.
- If AiSensy returns HTTP 400, processing stops to avoid repeated bad requests.

### `polling6.php`

Sends a WhatsApp notification for approved labour demand entries.

Conditions:

- Forms in `19`, `23`, `25`, `26`.
- `approved = 1`.
- Not already in `notified_bunty`.
- Aggregates question/response text and numeric total.

Action:

- Sends template `labour_approved_6` to a configured phone.
- Inserts `responseid` into `notified_bunty` after success.
- Creates `notified_bunty` table if it does not exist.

## Docking, Truck, And Gate Pass Workflow

### `dock_invoice.php`

Dock loading invoice entry page.

Conditions:

- Requires session and page permission.
- Connects to PostgreSQL and SQL Server `DSRLive`.
- SQL Server linked server `HANA112` is expected to query SAP HANA.

Actions:

1. `test_hana_connection`
   - POST action.
   - Runs `SELECT 1 FROM DUMMY` through `OPENQUERY(HANA112, ...)`.
   - Returns JSON success/error.

2. `fetch_invoice`
   - POST action.
   - Inputs: `invoice_id`, `company_db`.
   - `invoice_id` must be 1-10 digits.
   - `company_db` must be one of:
     - `JIVO_OIL_HANADB`
     - `JIVO_BEVERAGES_HANADB`
     - `JIVO_MART_HANADB`
   - Rejects if `tbl_invoice_printing` already has the invoice/db:
     - If `rejected = 1`, says invoice was rejected and should be edited.
     - Otherwise says dock loading details were already submitted with date/login.
   - Queries SAP `OINV` and `OWTR` for customer name/address.
   - Only accepts non-cancelled documents after the hardcoded cutoff `2025-01-28`.

3. `save_invoices`
   - POST action.
   - Accepts JSON array of added invoices plus transport details.
   - Validates:
     - `bilty`: alphanumeric, max 20.
     - `bilty_date`: `YYYY-MM-DD`.
     - `truckno`: alphanumeric, max 15.
     - `transporter`: letters/spaces, max 50.
     - `contact`: exactly 10 digits.
     - `drivername`: letters/spaces, max 50.
     - `freightamt`: numeric and non-negative.
   - Inserts each non-duplicate invoice into `tbl_invoice_printing` with `gate_printed = 0`.

Page also shows recently rejected invoices:

- `rejected = 1`
- `rejectdttm` within the last 7 days
- Enriched with SAP customer/address.

### `dock_photo.php`

Attaches truck photo and SAP-derived invoice details to docked invoices.

Conditions:

- Requires session and page permission.
- Invoice ID must be 1-10 digits.
- Company DB must be Oil/Beverages/Mart.
- Invoice must already exist in `tbl_invoice_printing`.
- `photo_path` must be empty.
- SAP document must exist and be non-cancelled after cutoff `2025-04-28`.
- Upload must be JPEG or PNG.
- Upload must be no larger than 5 MB before compression.
- Truck photo is required.

Client behavior:

- Compresses selected image to JPEG, target under roughly 300 KB, max dimension 800 px.
- Geolocation code exists but is currently commented out, so latitude/longitude are not sent.

Database update:

- Updates all `tbl_invoice_printing` rows for matching normalized truck number within the last 24 hours and `photo_path IS NULL`.
- Sets:
  - `photo_path`
  - `customer_name`
  - `inv_amount`
  - `billed_qty`
  - `latitude`
  - `longitude`
  - `sap_weight`

### `gate_invoice2.php`

Gate pass generator for docked invoices.

Global conditions:

- Requires session and page permission.
- If `tbl_lock.lockedout = 1`, exits with dispatch lock message.
- Uses PostgreSQL, SQL Server `DSRLive`, and SQL Server `JSAP`.

Stage 1: invoice lookup

- POST `lookup_invoice`.
- Invoice ID must be 1-10 digits.
- Company DB must be Oil/Beverages/Mart.
- Finds a recent docked invoice where:
  - invoice/db match
  - `rejected IS NULL`
  - `dttm >= now() - interval '2 days'`
  - either `gate_printed = 0` or `gate_printed = 1 AND print_commit IS NULL AND printdate is today`
- Requires `photo_path` to exist. If no dock photo is attached, it blocks gate pass printing.
- Queries SAP for invoice/customer/date/amount/weight.

Stage 2: gate pass details

- POST `submit_gatepass_details`.
- Validates:
  - invoice ID and company DB.
  - `uom` must be `Pcs` or `Box`.
  - `physical_quantity` must be numeric and non-negative.
- Fetches latitude/longitude from `tbl_invoice_printing`.
- Displays a confirmation row with e-way bill, UOM, physical quantity, and geotag.

Reject invoice action

- GET `action=reject_invoice`.
- Validates invoice/db.
- If `gate_printed = 1` and either:
  - `print_commit = 1`, or
  - `print_commit = 0` and `printdate` is not today,
  then rejection is blocked with `Cannot reject: Gate pass already issued.`
- If already rejected, returns `Invoice already rejected.`
- Otherwise sets:
  - `rejected = 1`
  - `rejectdttm = timezone('Asia/Kolkata', now())`
  - `login = current login`

Generate gate pass action

- GET `action=generate_gatepass`.
- Validates invoice ID, company DB, UOM, and physical quantity.
- Loads existing `tbl_invoice_printing` row.
- Blocks if gate pass is already issued by the same print-commit rules as rejection.
- If `gate_printed = 1` but still allowed for same-day uncommitted print, labels output as duplicate.
- Queries SAP invoice details and weight.
- Looks up weighbridge weight from `wb_data` by normalized truck number and recent gross date.
- Generates random code.
- Updates `tbl_invoice_printing`:
  - `printdate = timezone('Asia/Kolkata', now())`
  - `randcode`
  - `gate_printed = 1`
  - `login`
  - `eway_bill_attached`
  - `uom`
  - `physical_quantity`
  - `wb_weight`
- Inserts a mirror row into JSAP `tbl_invoice_printing` with `print_commit = 0`.
- Renders a printable gate pass with a QR code.

QR content:

```text
invoiceId-gatepassId-randomCode-ddMMyyyyhhmmssAMPM
```

Printing:

- Print button calls `gate_finalprint.php` and then `window.print()`.

### `gate_finalprint.php`

Marks a gate-pass print as finally committed.

Inputs:

- GET `invoice_id`
- GET `company_db`

Conditions:

- Invoice ID must be 1-10 digits.
- Company DB must be Oil/Beverages/Mart.

Database actions:

- PostgreSQL: `UPDATE tbl_invoice_printing SET print_commit = 1 WHERE invoiceid = $1 AND db = $2`
- SQL Server JSAP: same update.

Output:

- Plain text `Done.`

### `empty_truck_in.php`

Permits an empty truck to enter if it was docked recently.

Conditions:

- Requires session and page permission.
- If dispatch lock is active, exits with lock message.
- User can search by truck number or invoice ID.
- Truck number comparison normalizes by removing spaces and dashes and comparing uppercase.
- Match condition:
  - `tbl_invoice_printing.rejected IS NULL`
  - `dttm >= now() - interval '24 hours'`
  - matching truck or invoice

If found:

- Shows permit details.
- `mark_truck_entry` inserts into `tbl_truck_entry` with timestamp, truck number, and current login.

### `mart_print.php`

Prints Jivo Mart invoices.

Conditions:

- Requires session and page permission.
- `invoice_id` must be 1-10 digits.
- `company_db` must be exactly `JIVO_MART_HANADB`.
- Queries SAP HANA through SQL Server linked server `HANADB112`.
- Header comes from `JIVO_MART_HANADB.OINV`.
- Lines come from `JIVO_MART_HANADB.INV1`.
- Only documents from the last two months and `CANCELED = 'N'` are accepted.

Output:

- Printable invoice with item code, description, quantity, rate, amount, VAT, and total.

### `gupta_invoice.php`

Manual multi-invoice gate pass flow for "Gupta Invoice Out".

Conditions:

- Requires session and page permission.
- Connects to SQL Server `Jivo_All_Branches_Live` and linked server `HANADB112`.
- Company DB must be Oil/Beverages/Mart.
- Invoice number must be 1-10 digits.

AJAX action `get_invoice_details`:

- Validates invoice/db.
- Queries SAP `OINV` and `OWTR` for customer, address, total amount, date.
- Only non-cancelled documents after `2025-04-28`.

Submit action:

- Requires truck number, driver name, driver contact, transporter name, bilty number, and at least one invoice.
- Generates `entry_id` from `entry_id_seq`.
- Verifies each invoice in SAP.
- Inserts one row per invoice into `tbl_invoice_ggo`.
- On success, renders a printable gate pass with all invoice details and QR code.

QR content:

```text
entryId-biltyNumber-randomCode-ddMMyyyyhhmmssAMPM
```

## Reporting

### `reporting.php`

Main server-rendered reporting dashboard.

Conditions:

- Requires session.
- Requires `tbl_pageperm` access to `reporting.php`.
- User sees only reports listed in `tbl_reportaccess` for their login.

Report execution:

- Each report has:
  - internal key
  - display name
  - SQL query
  - `needs_fromdate`
  - `needs_todate`
- Reports with date fields use `pg_query_params` with `$1` and `$2`.
- Reports without date fields run with no parameters.
- If a result row has `imgpath`, code checks if the file exists under `/var/www/site2/mobile/uploads/`.
- Existing image paths are converted to public URLs under `https://proxy2.jivocanola.com:8001/mobile/uploads/`.
- Missing files display `image has been deleted`.
- Rows with `colourcoding` are styled green/red/white/yellow and that column is hidden from display/download.

Download:

- POST `action=download_report`.
- Returns tab-separated `.xls` output.
- Escapes tabs and newlines in values.
- Excludes `colourcoding`.

Current report keys:

| Key | Name | Date inputs |
| --- | --- | --- |
| `pending_docking` | All trucks waiting inside | No |
| `material_out` | Material that has gone total | No |
| `material_out_per_person` | Material that has gone out this month | No |
| `labour_today` | Today's total labour demand | No |
| `labour_today_and_yesterday` | Total labour demand for security | No |
| `etp_stp_report` | ETP / STP Report for today | No |
| `labour_report_gautam` | Today's and yesterday's total labour demand and receipt | No |
| `labour_report_parvinder` | Today's and yesterday's total labour demand and receipt | No |
| `electricity_report` | Date based electricity and other utilities information | From/to |
| `labour_today_receiving` | Labour received today by department person | No |
| `lab_report` | Lab report for yesterday and today | No |
| `labour_today_new` | Today's total labour demand NEW | No |
| `labour_received_new` | Today's total labour receiving | No |
| `labour_today_yesterday_new` | Today's and yesterday's total labour demand NEW | No |
| `labour_received_today_y_new` | Today's and yesterday's total labour receiving | No |
| `labour_today_yesterday_new_bydate` | Total labour demand by date | From/to |
| `truck_report` | Truck vs Invoice report with Photos | From/to |
| `simple_truck_report` | Truck Status report with Photos | From/to |

### `reporting_android.php`

Android/iframe variant of `reporting.php`.

Differences:

- Does not use PHP session.
- Validates page access by POST `login` and `pswd` against `tbl_pageperm` and `tbl_login.password`.
- Uses `$_POST['login']` where `reporting.php` uses `$_SESSION['login']`.
- Includes hidden `login` and `pswd` fields in view/download forms to preserve access state.

### `planningreport.php`

Week-wise production and dispatch report.

Conditions:

- Requires `sqlsrv_connect` and `pg_connect`.
- Requires session and page permission.
- Schema must be one of:
  - `JIVO_OIL_HANADB`
  - `JIVO_BEVERAGES_HANADB`
- Dates must be valid `YYYY-MM-DD`.
- Default date range is last 30 days to today.

Report logic:

- Queries SAP production orders `OWOR` for planned/completed quantity.
- Queries SAP deliveries `ODLN`/`DLN1` for dispatched quantity.
- Joins item names from `OITM`.
- Groups by ISO week, year, item code, item name.

### `material_out_report.php`

Email/PDF report generator for material-out records.

Default date logic:

- If run on day 15: first through 15th of current month.
- If run on last day of month: 16th through last day.
- Otherwise: first of month through today.

Current code override:

- The dynamic dates are overwritten with hardcoded `20250601` to `20250703`.

Report contents:

- Form 18 material out rows.
- Person, machine/material, reason, image, returnable status, returned status, gate receiver, received confirmation.
- Color coding:
  - `Yellow`: non-returnable
  - `White`: returnable but not closed
  - `Green`: closed/returned

Output:

- Creates a temporary PDF using FPDF.
- Emails it through PHPMailer SMTP to configured recipients.
- Deletes the temporary PDF.

## Notification Scripts

These scripts are intended for cron/manual CLI runs. Most echo processing summaries.

| File | Purpose | Main conditions/actions |
| --- | --- | --- |
| `polling.php` | WhatsApp reminder for Form 18 material-out approvals. | Selects Form 18 question 1 rows with `notified = 0`, sends AiSensy template `material_out`, marks matching responses `notified = 1`. |
| `polling2.php` | Email reminder for Form 18 pending approvals. | Sends email for minimum pending Form 18 item to `bhupinder@jivo.in`, then marks all Form 18 question 1 rows `notified = 1`. |
| `polling3.php` | Dispatch lock email notifier. | Reads one row from `tbl_lock_email`, emails `hardeep@jivo.in` and `security@jivo.in`, deletes processed status row. |
| `polling4.php` | Return notification email to original sender. | Finds Form 18 question 1 rows with `gate_return_receiver` set and `notified_return IS NULL`, emails sender with confirmation link, sets `notified_return = 1`. |
| `polling4b.php` | WhatsApp return notification. | Same return-notification idea as `polling4.php`, but sends AiSensy template `material_return` to sender phone. |
| `polling5.php` | Labour approval automation. | Auto-approves labour requests within thresholds; sends WhatsApp approval alerts when thresholds are exceeded. |
| `polling6.php` | Approved labour notification. | Sends approved labour summary to configured phone, stores `responseid` in `notified_bunty`. |
| `polling7.php` | Bulk email for returnable items not confirmed received. | Groups Form 18 returnable approved rows where `received_back` is null/0 by sender email. |
| `polling7b.php` | Bulk email for non-returnable final recipient confirmation. | Groups Form 18 non-returnable approved rows where `received_back` is null/0 by final recipient email. |
| `polling8.php` | Submitter self-notification. | Sends WhatsApp to submitter phone for responses where `notified_self IS NULL`, then sets `notified_self = 1`. |
| `polling9.php` | Invoice-printing backfill. | For `tbl_invoice_printing` rows with blank `customer_name` and date after hardcoded cutoff, fetches SAP customer/amount/qty/weight and updates the row. |

Shared notification conditions:

- Phone numbers are normalized by removing non-digits, prefixing `91` for 10-digit Indian numbers, and ensuring a leading `+`.
- WhatsApp scripts use AiSensy endpoint `/campaign/t1/api/v2`.
- Several scripts stop further attempts on HTTP 400 to avoid repeated invalid-plan or invalid-payload calls.
- PHPMailer scripts use SMTP and set HTML plus plain-text bodies.

## Dispatch Lock

### `lock.php`

Admin page to lock or unlock dispatch.

Conditions:

- Requires session.
- Requires page permission.

State:

- Reads `tbl_lock.lockedout`.
- Checkbox checked means locked.

On POST `action=toggle_lock`:

- Sets `tbl_lock.lockedout` to 1 if `lock_dispatch` is checked, else 0.
- Inserts a row into `tbl_lock_email` with `locked` or `unlocked`.

Lock effects:

- `gate_invoice2.php` blocks gate pass generation when locked.
- `empty_truck_in.php` blocks truck-in marking when locked.
- Other pages may not enforce the lock.

`polling3.php` sends the lock/unlock email and deletes the status row.

## QR Scanner Workflow

### QR Payload

The scanner expects QR content in this format:

```text
id,unique_code
```

`scan2.html` comments mention `id,unique_code,location`, but the JavaScript only uses the first two parts.

### `scanner.php`

Basic scanner endpoint.

Inputs:

- GET `id`
- GET `unique_code`

Conditions:

- Both parameters must exist.
- `id` is converted to integer.
- Looks up `tbl_qrcodes.unique_code` by `id`.
- If row is missing or unique code does not match, returns `Error: Inconsistent data.`

Success action:

- Inserts into `tbl_auditlog`:
  - `itemid = id`
  - `operation = 'tracked'`
  - `stamp = NOW()`
- Returns `Success: Audit log entry created.`

### `scanner2.php`

Enhanced scanner endpoint.

Inputs:

- GET `id`
- GET `unique_code`
- Optional GET `change_location=yes`
- Optional GET `new_location`
- Optional GET `audit_log_id`

Conditions:

- Validates QR ID and unique code against `tbl_qrcodes`.
- If `change_location=yes`, `new_location` is present, and `audit_log_id` is present:
  - Updates `tbl_auditlog.location` for that audit log row.
  - Returns success/error text.
- Otherwise checks if the item was already scanned today:
  - `tbl_auditlog.itemid = id`
  - `operation = 'tracked'`
  - `DATE(stamp) = today`
  - If count > 0, returns `This item has already been scanned today.`
- Determines current location:
  - Latest non-null location from `tbl_auditlog` for the item.
  - If none, uses `tbl_qrcodes.location`.
- Inserts a new `tbl_auditlog` row with `operation='tracked'`, `stamp=NOW()`, and the current location.
- Returns an HTML success block with current location and a dropdown to change it.

Allowed location dropdown values:

- `Canola Floor`
- `Middle Floor`
- `Basement`

## PWA Files

### `manifest.json`

Defines:

- App name and short name: `Utilities Mobile`
- Start URL: `/mobile/um.php`
- Display: `standalone`
- Scope: `/mobile/`
- Theme color: `#6200EE`
- Icons:
  - `/mobile/icons/icon-192x192.png`
  - `/mobile/icons/icon-512x512.png`

### `sw.js`

Service worker behavior:

- Cache name: `utilities-mobile-v1`
- Caches:
  - `/mobile/um.php`
  - PWA icons
  - Bootstrap CSS/JS from CDN
  - jQuery from CDN
- Fetch strategy:
  - Return cached response if present.
  - Otherwise fetch from network.
  - If fetch fails, returns simple offline HTML.
- Activate event deletes caches not matching current cache name.

Important limitation:

- The service worker caches only a small shell. Dynamic API calls and most PHP pages are not made truly offline-capable.

## Admin And Debug Tools

### `pg_client.php`

PostgreSQL query executor.

Conditions:

- Requires session and page permission.
- Connects as a PostgreSQL user configured in the file.
- Blocks multiple SQL statements by rejecting more than one semicolon.
- Detects `SELECT` by checking whether trimmed query starts with `SELECT`.

Behavior:

- SELECT queries display result columns and rows.
- Non-SELECT queries execute and show affected row count.

### `sql_client.php`

SQL Server query executor.

Conditions:

- Requires session and page permission checked through PostgreSQL.
- Connects to SQL Server `Jivo_All_Branches_Live`.
- Blocks multiple SQL statements by rejecting more than one semicolon.

Behavior:

- SELECT queries display result columns and rows.
- DateTime values are converted to strings.
- Non-SELECT queries show affected row count.

### `temp.php`

Tiny JSON demo endpoint that returns random sales-like numbers for a fixed list of US states. It is not connected to the main application workflow.

## External Integrations

### PostgreSQL `utilities`

Used for:

- Users, sessions, permissions.
- Dynamic forms and responses.
- Approval and material-out status.
- Invoice/truck/gate-pass tracking.
- Report access.
- Lock state.

### PostgreSQL QR Database

Used by root scanner:

- QR code lookup.
- Audit log scan tracking.
- Location state.

### SQL Server And SAP HANA

Multiple scripts connect through `sqlsrv_connect_retry()`.

Common SQL Server targets:

- `dsr.jivocanola.com\jivo`, database `DSRLive`
- `dsr.jivocanola.com\jivo`, database `JSAP`
- `103.89.45.75`, database `Jivo_All_Branches_Live`

Common SAP HANA linked servers:

- `HANA112`
- `HANADB112`
- lower-case references such as `hanadb112` in planning reports

Common SAP schemas:

- `JIVO_OIL_HANADB`
- `JIVO_BEVERAGES_HANADB`
- `JIVO_MART_HANADB`

SAP document tables used:

- `OINV` / `INV1` for invoices and invoice lines.
- `OWTR` / `WTR1` for stock transfers.
- `OITM` for item master and sales factors/weights.
- `OWOR` for production orders.
- `ODLN` / `DLN1` for dispatch/delivery.

### AiSensy WhatsApp

Used by:

- `approve_submission.php` contains a currently disabled approval notification helper.
- `polling.php`
- `polling4b.php`
- `polling5.php`
- `polling6.php`
- `polling8.php`

Payload shape:

- `apiKey`
- `campaignName`
- `destination`
- `userName`
- `source`
- `media`
- `templateParams`

Authentication:

- Bearer token header plus API key in body.

### PHPMailer SMTP

Used by:

- `polling2.php`
- `polling3.php`
- `polling4.php`
- `polling7.php`
- `polling7b.php`
- `material_out_report.php`

Purpose:

- Pending material-out approvals.
- Lock/unlock notices.
- Return notifications.
- Returnable/non-returnable receipt reminders.
- PDF material-out reports.

## Error And Edge Conditions To Know

- There is no central error handler. Most pages echo errors directly.
- Sessions are PHP-session based for web pages but localStorage/API-password based for `um.php`.
- Passwords are compared as plaintext from `tbl_login.password`.
- Several SQL queries interpolate session or request data directly rather than using parameters.
- Some scripts call external systems before checking every possible input or access condition.
- Some debug output is still present, for example `gate_invoice2.php` echoes weighbridge debug text during gate pass generation.
- Some comments say apps are being phased out or TODO geolocation is not fully implemented.
- `dock_photo.php` has a typo in `$company_map`: `JIVO_BEVERAGES_HAN ADB`, but it is only used for display and may trigger an undefined index for Beverages display.
- `dock_invoice.php` shows edit links for rejected invoices using `?action=edit_rejected...`, but no server-side branch handles `edit_rejected`.
- `submit_response_html.php` uses fixed `responseid = "abc"`.
- `material_out_report.php` computes date ranges and then overrides them with hardcoded dates.
- `gate_finalprint.php` does not require a session before committing final print status.
- `gate_invoice2.php` only blocks rejection/duplicate printing based on gate/commit state; there is a comment that editing after dock/gate details are already done is not fully handled.
- Image paths in `tbl_responses` are stored as absolute filesystem paths, while invoice photos store just the filename in `tbl_invoice_printing.photo_path`.

## Security And Maintenance Recommendations

1. Move database credentials, SMTP passwords, and AiSensy keys out of source files.
2. Replace plaintext password comparison with password hashes.
3. Make API endpoints validate session tokens, not just the shared API password.
4. Replace interpolated SQL with parameterized queries across all pages.
5. Add CSRF protection for state-changing browser forms.
6. Add upload MIME validation using server-side file inspection, not only browser-provided MIME type.
7. Normalize all date cutoffs into configuration.
8. Remove debug echoes from production flows.
9. Add transaction handling for multi-row form submissions.
10. Add audit tables for gate pass generation, rejection, and final commit.
11. Consolidate duplicate report definitions between `reporting.php` and `reporting_android.php`.
12. Consolidate repeated SAP invoice query fragments into shared helper functions.
13. Restrict `pg_client.php` and `sql_client.php` to a very small admin group or remove from production.
14. Add a schema migration file so database structure is versioned with code.

