# SCCUSTOM v1.1.4 — Release notes

- Step 3 has a focused Print Studio layout with job context, product-first preview, setup, inspector and a single primary review action.
- Preview switches between pen mockup and measured safe-area view. Swatches focus an existing ordered variant without changing the ordered set.
- Placement status and production export readiness are displayed independently. Blockers link to the relevant controls.
- Existing projects, branding, print profiles, proofs, production exports and other stages are retained.

## v1.1.3 — Previous release

- Added Design-owned production profiles by product, method and print location with asymmetric safe margins.
- The editor supports logo, text, or a horizontal logo/text pair. It maintains aspect ratio and provides controlled position, gap and relative text height.
- Tracking is applied to generated outlines only when the font run can preserve character groups.
- Added a manual Design-review ZIP and pending status. Production SVG/ZIP is gated by a verified profile, current artwork approval and applicable preflight checks.
- Brand dropdown, existing job format and saved brand configuration remain compatible. New guides do not appear in production exports.

## v1.1.2 — Previous release

- Replaced the vertical brand list with a native dropdown and current-brand image/name above it.
- The dropdown updates the document preview and both PDF headers without changing the selected product or print artwork.
- Improved on-screen typography, secondary-text contrast, wrapping and narrow-screen layout. Physical print dimensions and A4 layout are unchanged.
- Managed logo configuration and saved jobs remain compatible with v1.1.1. Preserve your existing configured file and brand assets when updating the site.

## v1.1.1 — Previous release

- Template header logos now come only from the version-controlled list in `config/brand-logos.js`.
- Unset or broken logo files cannot be selected. Customer Proof and Production Spec require a configured logo.
- The supplied package does not include confirmed current marks. Enable the brands after adding their assets. The old Quantum sample is not used as a header fallback.
- Customer artwork uploads, project storage and artwork-only SVG/ZIP exports are unchanged.
- Existing jobs with an unset brand or a legacy per-job header need a new selection before opening a branded PDF.

## v1.1.0 — Previous release

## New
- Text-only Artwork mode, font specimen dropdown (6 Thai-capable families).
- On-demand text to real SVG glyph paths using a user-supplied licensed TTF/OTF font and pinned external library; original text stays editable.
- Brand catalog with Quantum, Elephant, Elfen, Uni, Mitsubishi, Master Art, Ultimatum, Artifact.
- Product Admin for adding product masters and importing 1–12 colour-variant images. Images are scaled to 1600 × 533 WebP and stored locally.
- Export / Import custom Product Catalog JSON and standardized image naming.
- Optional per-user Google Drive OAuth connection, manual Save / List / Open jobs; snapshots grouped by revision.
- Existing V1 Artwork workflow, Brand Header Selector, variant handling, A4 proofs and SVG 1:1 retained.

## Still pilot / not production-certified
- Production files require supplier/prepress verification, native spot-color separation and product physical calibration.
- Actual font conversion needs Internet for its JavaScript engine and a font uploaded by the user; Thai marks must be checked.
- Product Admin is local browser storage (not shared company catalog).
- Google Drive Sync requires your own OAuth Client ID and is not enterprise role-based collaboration.
- No complete browser End-to-End or real OAuth live-account validation was conducted for this ZIP.

## Migration
- Upload contents over the existing GitHub Pages root, committing to `main`.
- Existing jobs persist for the same origin and browser in `localStorage`; export important JSON backups before upgrade.
- Read `README.md` and `docs/` before enabling Cloud access.
