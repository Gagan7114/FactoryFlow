# Legacy Docking Mobile Project

Audit date: 2026-05-18

Canonical detailed documentation lives in `../docking/mobile/README.md`.

This tracked note exists so the FactoryFlow docs set records the legacy app location and live-site comparison.

## Scope

- Local source reviewed: `D:\Test_CompanyJivo\docking\mobile`
- Live URL checked: `https://proxy2.jivocanola.com:8001/mobile/main_html.php`
- Result: the live URL appears to be the deployed copy, or a very close deployment, of `../docking/mobile`.

## Evidence

- Unauthenticated live `main_html.php` redirects to `login_html.php`, matching local code.
- Login with the supplied account succeeded.
- Authenticated dashboard title was `Dashboard - Form App`.
- Live dashboard brand was `Jivo Factory`.
- Live `manifest.json` and `sw.js` matched local files by SHA-256 hash.
- Authenticated menu links mapped directly to local PHP files such as `dock_invoice.php`, `dock_photo.php`, `gate_invoice2.php`, `show_submission.php`, `utility_approval.php`, `reporting.php`, and `planningreport.php`.

## Detailed Doc

See the full inventory, file-by-file behavior, database tables, endpoint map, live menu, gaps in the old README, and security/maintenance findings in:

```text
D:\Test_CompanyJivo\docking\mobile\README.md
```

## Factory Integration Plan

For the build checklist and gap analysis for enclosing docking inside FactoryFlow and `factory_app_v2`, see:

```text
docs/docking-module-factory-integration-plan.md
```
