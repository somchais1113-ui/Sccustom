# SCCUSTOM v1.1.0 — Release notes

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
