# SCCUSTOM — Smart Artwork Studio v1.1.1 (GitHub Pages)

**GitHub Pages-ready static website.** This is an upgrade of SCCUSTOM v1.0, retaining its existing design, brand-logo selector, 6-color mixed-pen variants, existing jobs, 1:1 SVG output and A4 proof layouts.

## v1.1.1 — โลโก้หัวเอกสารตั้งจากไฟล์กลาง

- ผู้ดูแลวาง SVG, PNG หรือ WebP ใน `assets/brand-logos/` และใส่พาธใน `config/brand-logos.js` แล้ว commit ขึ้น GitHub
- Sale เลือกได้เฉพาะโลโก้ที่ตั้งค่าและโหลดได้จริง ไม่มีปุ่มอัปโหลดโลโก้หัวเอกสารรายงาน
- แพ็กเกจนี้ยังไม่มีไฟล์โลโก้ปัจจุบันที่ยืนยันแล้ว จึงเริ่มต้นด้วยทุกแบรนด์ยังไม่ตั้งค่า รวมถึง Quantum ตัวเก่า จะเปิด Customer Proof หรือ Production Spec ได้หลังเลือกโลโก้กลางที่พร้อมใช้
- งานเดิมยังเปิดแก้ได้ ถ้าเคยใช้โลโก้รายงานหรือโลโก้ที่ยังไม่ตั้งค่า ให้เลือกโลโก้กลางใหม่ก่อนเปิด PDF ส่วนโลโก้ลูกค้าสำหรับสกรีนยังอัปโหลดได้ในขั้นที่ 3
- ดู [คู่มือตั้งโลโก้และแยกโฟลเดอร์รูปสินค้า](docs/BRAND_LOGO_SETUP.md)

## What was added in v1.1

- **Text Artwork:** in Step 3 switch from "อัปโหลดโลโก้" to "พิมพ์ข้อความ". Enter Thai/English text; choose a specimen font from Prompt, Kanit, Sarabun, IBM Plex Sans Thai, Mitr and Bai Jamjuree. Enter size with existing Fit and Offset controls.
- **Optional Create Outlines:** for production, click **แปลงข้อความเป็น Vector Paths** and select a licensed **TTF/OTF file that you provide**. The browser fetches the pinned `fontkit@2.0.4` JS engine on demand and creates SVG `<path>` outlines. Exact shaping and Thai marks must be checked visually and approved in prepress. No fonts are included in this package or saved in the project.
- **8 product brands:** Quantum, Elephant, Elfen, Uni, Mitsubishi, Master Art, Ultimatum, Artifact. The library includes **only the existing Quantum 341224 example**; other brands have empty catalog slots, not fabricated products or logos.
- **Product Master Admin (local pilot):** add product model, nib, length, real print area, and upload multiple color-variant images. The app fits images into **1600×533 WebP previews** and assigns predictable names such as `qtm_341224_skyblue_side_web_v001.webp`. Data is saved in your browser. Export/Import product catalog as JSON.
- **Optional Google Drive Sync:** in the Dashboard add a Google OAuth **Web Client ID** from your own Google Cloud project, connect your Google account, then Save / Find / Open jobs via Drive. Scope is `drive.file` and files are saved in folders under `SCCUSTOM_DATA/02_CUSTOMER_JOBS/<year>/<job-id>/`. Requires setup; no secrets in GitHub. See `docs/GOOGLE_DRIVE_SETUP.md`.
- **JSON remains editable:** text content, font selection, product metadata, artwork outline paths, positions, mixed variants and revision are retained in project JSON. This enables reopening without preserving the font file.

## Quick deployment — replace existing GitHub Pages site

1. Back up important **jobs** first. In **งานของฉัน**, click the download icon beside each job to export Project JSON. Also back up any custom products via **คลังสินค้า / Admin → Export Product Catalog JSON**.
2. Extract this ZIP and copy the **contents** (not the outer ZIP folder) into the root of your current GitHub repo. You can replace the existing `index.html`, `app.js`, etc. **Keep `.github/workflows/deploy.yml` and `.nojekyll`**.
3. Commit to `main`, with **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Wait for the green deploy check in **Actions** and hard-refresh the published page (Shift+Reload).
5. The v1 browser save key is preserved (`sccustom-artwork-studio-v1`) so older jobs remain available **in the same browser and site origin**. Jobs on other browsers/devices must be imported from JSON or saved through Google Drive Sync.

Local test: `python3 -m http.server 8000` from this folder and open `http://localhost:8000`. Do not double-click `index.html` (ES modules may fail under `file://`).

## Important limitations

1. This release remains a **pilot**, not a certified production RIP or prepress workflow. Files named "Production" are outputs for **supplier/prepress verification**. SVG is physical-size mm but RGB previews, **NOT native Pantone spot-color PDF**. Do not send to press without checking registration, min strokes, transparency, knockout, overprint and material/printing method.
2. The on-demand font-outline tool requires an Internet connection to download the JS engine on its first use and a legitimate licensed TTF/OTF upload. Users can still use the app and export editable proof JSON offline once the website assets load. The actual imported font determines glyph outlines; the Dropdown font name is not a guarantee that a different uploaded font will match.
3. When text changes, the old outline is invalidated and production export is blocked until conversion is run again. The original editable text is still stored. **Thai text and marks must be checked before production.** Raster images are **proof only**.
4. Custom product images currently save only in **local browser storage** and in exported Product Catalog JSON. The Product Library admin is **not** a cloud product database and does not yet write catalog assets into Google Drive. Add a real database and admin access control before team-wide use.
5. Google Drive Sync is optional and only runs once you configure OAuth on **your own Google Cloud project**. Each authorized user can access app-created Drive files permitted by their Google account. It does not provide central login, company role controls or automatic shared-team access. The `drive.file` scope is intentionally narrow.
6. Brand header logo and product brand are **different**. Configure approved assets via `config/brand-logos.js`. Changing the header logo does not change the customer print artwork.
7. User data stored in browser localStorage can be lost when clearing site data or switching computers. Save JSON backups and use a managed Drive workflow for real work.
8. The image overlay position is visual-only and calibrated only approximately for the demo Quantum image; **validate each new product's print area** against actual product measurements before relying on the preview.
9. Printing proof PDF uses browser Print / Save as PDF. Choose 100%, turn off Fit to Page and verify output dimensions. Production vector output uses standalone SVG.

## Folder structure

```text
index.html             # GitHub Pages entry
styles.css             # responsive SCCUSTOM UI
app.js                 # editor, library and Drive controls
data.js                # Product Masters, brands, settings, job schema
vector.js              # safe SVG import, actual-mm SVG assembly
text-outline.js        # on-demand client-side text outlines
exporter.js            # proof/production print, vector and ZIP output
drive-sync.js          # user-authorized Drive save/list/open
brand-logos.js         # shared logo registry and image validation
config/brand-logos.js  # admin-maintained template logo paths
assets/                # 6 demo product photos and brand-logos/
product-library/       # upload standards, brand folders and examples
docs/                  # operational guides
examples/              # SVG input test artwork
tests/                 # unit tests
.github/workflows/     # deploy.yml
.nojekyll              # disable Jekyll on GitHub Pages
```

## Tests

```bash
npm test
npm run check
```

Node 18+ only required for running tests. No build step or `npm install` needed to run the website. Browser font outlining uses a pinned external ESM dependency, not included fonts.

**Next required production work:** verified per-product print-area calibration, approved font-outline QA, native spot-color separation / PDF workflow, official logo assets for all brands, company-managed shared cloud storage and role-based controls.
