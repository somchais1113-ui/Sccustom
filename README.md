# SCCUSTOM — Smart Artwork Studio

**Version:** 1.0.0 • Static GitHub Pages pilot • Thai/English UX

Web-based Sales Artwork Workspace สำหรับงานสกรีนปากกา 1–3 สี โดยใช้ *Product Master + Guided Workflow* เพื่อช่วยให้ Sale สร้าง Customer Proof และส่งไฟล์เวกเตอร์ให้ทีม Prepress ตรวจได้เอง โดยยังต้องผ่านการยืนยันสเปกกับโรงงานก่อนผลิตจริง

## Quick start / เปิดใช้งาน

เว็บไซต์เป็น **Static HTML + CSS + JavaScript ES Modules** 100% ไม่มี `node_modules`, ไม่มี Build Step, ไม่มี API Key และไม่ต้องติดตั้ง Dependency

**ทดสอบในเครื่อง**

1. แตกไฟล์ ZIP
2. เปิด Terminal ในโฟลเดอร์นี้ แล้วรัน:

   ```bash
   python3 -m http.server 8000
   ```
3. เปิด <http://localhost:8000> (อย่าเปิด `index.html` ผ่าน `file://` เพราะ ES Modules อาจถูกบล็อก)

**ลง GitHub Pages ด้วย GitHub Actions**

1. สร้าง GitHub Repository ใหม่ เช่น `sccustom-artwork-studio`
2. อัปโหลด **ไฟล์และโฟลเดอร์ทั้งหมดที่อยู่ข้างในแพ็กเกจนี้ไปที่ Root ของ Repo** รวมถึง `.github/workflows/deploy.yml` และ `.nojekyll`
3. ใช้ Branch ชื่อ `main`
4. ไปที่ **Settings → Pages → Build and deployment → Source → GitHub Actions**
5. `push` หรือ `commit` ลง `main` เพื่อเริ่ม Workflow ชื่อ `Deploy SCCUSTOM to GitHub Pages`
6. เปิด URL ที่ GitHub Pages ให้ เช่น `https://<username>.github.io/sccustom-artwork-studio/`

**ตัวอย่าง Git commands**

```bash
git init
git add .
git commit -m "Initial SCCUSTOM Artwork Studio"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

> ไม่ต้องแก้ Base URL ในโค้ด: ไฟล์ใช้ path แบบ relative รองรับ Project Site ของ GitHub Pages

## ฟีเจอร์ที่ทำงานได้ใน Pilot นี้

| Module | ใช้งานจริงใน v1.0 |
|---|---|
| Dashboard | สร้างงาน, เปิดงานเก่า, ทำซ้ำ, ลบ, Export Project JSON, Import Project JSON |
| Product Master | ตัวอย่าง Quantum รุ่น 341224 / 0.5 mm, ขนาด Print Area 28.3 × 4.5 mm |
| 6 Colour Variants | เลือกสี, จำนวนต่อสี, จำนวนรวม, เลือกหมึกแบบใช้ร่วมกันหรือแยกตามสีด้าม |
| 1–3 Ink Colours | ตั้งหมึก 1, 2 หรือ 3 สี พร้อมตรวจจำนวนสีใน SVG |
| Artwork Editor | อัปโหลดไฟล์ SVG/PNG/JPEG/WEBP, Auto Fit, Scale, Offset X/Y, ลากโลโก้ภายใน Print Area |
| Brand Logo Template | เปลี่ยน **เฉพาะโลโก้ส่วนหัวเอกสาร**, เลือกจากแบรนด์ตัวอย่างหรืออัปโหลด Brand Logo ได้ |
| Template | Customer Proof A4 และ Production Specification A4 พร้อมข้อความเตือนทุกฉบับ |
| Export SVG | หน่วย `mm` จริง; สร้าง Composite/Separation SVG ตามกลุ่มสีหมึก |
| Export ZIP | รวมไฟล์ SVG ที่จัดกลุ่มหมึก, Manifest และคำเตือน Prepress ในไฟล์เดียว |
| PDF | ใช้ Print / Save as PDF ผ่านระบบพิมพ์ของเบราว์เซอร์ |
| Approval | รับทราบข้อควรระวัง, บันทึกสถานะ Sales-side Approval, ยกเลิกการอนุมัติและเพิ่ม Revision เมื่อแก้ Artwork |
| Responsive | Desktop-first และหน้า Mobile ที่ใช้งานได้ตามข้อจำกัดของหน้าจอ |

## ทดลองเส้นทาง Export เวกเตอร์

ในโฟลเดอร์ `examples/` มี SVG ที่ถูกแปลงข้อความเป็น **Vector Outlines** แล้ว (ไฟล์ตัวอย่างสำหรับทดสอบฟีเจอร์ ไม่ใช่โลโก้แบรนด์จริง):

- `sample-vector-1colour.svg`: ตั้ง Ink Count = 1
- `sample-vector-2colour.svg`: ตั้ง Ink Count = 2
- `sample-vector-3colour.svg`: ตั้ง Ink Count = 3

ทดลอง: ไปขั้น **3. อัปโหลดและจัดวางโลโก้** → อัปโหลดไฟล์ → ปรับขนาดและตำแหน่ง → ขั้น **4. ตรวจสอบและส่งออก** → ทำเครื่องหมายรับทราบข้อควรระวัง + ยืนยันได้รับอนุมัติจากลูกค้า → ส่งออก Production SVG หรือ ZIP

**สังเกต:** ไฟล์ `examples` เป็น Sample Vector สำหรับทดสอบ ไม่ใช่ไฟล์สั่งผลิตที่ได้รับอนุมัติ

## แนวทางออกแบบ

- **SCCUSTOM** เป็นชื่อแอปและโลโก้บน Top Bar ไม่ใช่ Brand ของสินค้า
- **Template Brand Logo Selector** เปลี่ยนเฉพาะ Header ของเอกสาร Customer Proof และ Production Spec; ไม่เปลี่ยนภาพสินค้า โลโก้ที่จะสกรีน หรือค่ามิลลิเมตร
- ภาพปากกาทั้ง 6 สีสร้างจากรูปอ้างอิงที่ผู้ใช้ให้มาเพื่อทดสอบ UX เท่านั้น **ยังไม่ใช่ภาพยืนยันของ 6 SKU จริง**
- Product Master ใน Pilot มีเพียง Quantum รุ่น 341224 รุ่นเดียว ข้อมูล Brand/Model/Nib ปัจจุบันเป็นตัวเลือก 1 รายการ — การเพิ่มรุ่นสินค้าอื่นให้แก้ `data.js` และเพิ่มรูปใน `assets/`; การทำ Admin CRUD และฐานข้อมูลออนไลน์เป็นงาน Phase ถัดไป

## Production Safety / สิ่งสำคัญก่อนใช้ผลิต

1. รูป Product Preview ไม่ใช่หลักฐานยืนยันตำแหน่งสกรีนบนผิวโค้ง สินค้า ขนาด หรือเฉดสีจริง ต้องเทียบกับ Drawing และชิ้นงานโรงงาน
2. **บนหน้าจอไม่ใช่ Actual 1:1** ถึง SVG จะมี `width="28.3mm" height="4.5mm"` แต่ระดับ Zoom และ Monitor DPI ต่างกัน
3. SVG รูปผลิตไม่มีเส้น Guide หรือภาพสินค้า แต่ไฟล์ยังเป็นข้อมูล **RGB-based SVG** — `PANTONE` ที่แสดงเป็นเพียงรหัสอ้างอิงใน Manifest ไม่ใช่ *native spot colour separation* ในไฟล์ PDF
4. ต้องให้ Prepress ตรวจการกำหนด Spot Colours, Minimum Stroke, Registration, Knockout/Overprint, Trapping, การตั้งบล็อก, ผิววัสดุ และการพิมพ์จริงก่อนสั่งผลิต
5. ไฟล์ PNG/JPG อัปโหลดได้เพื่อทำ Proof แต่ **ระบบล็อก Production SVG** ถ้าไม่ได้อัปโหลดเป็น Vector SVG ที่รองรับ
6. ไฟล์ SVG ที่มี `<text>`, `<defs>`, clipping, gradients, masks, embedded images, external references หรือ unsupported CSS ต้อง **Convert to Outlines / Expand Appearance / Flatten** ก่อนอัปโหลด
7. เบราว์เซอร์จะเปิดหน้าต่างเอกสารสำหรับ PDF: กด **Print / Save as PDF** และเลือก **Scale 100%**, ไม่ใช้ `Fit to Page`, ปิด Header/Footer (ถ้ามี), จากนั้นตรวจขนาดไฟล์ PDF ด้วยเครื่องมือวัดที่เชื่อถือได้
8. ช่อง "ลูกค้าอนุมัติ" ใน Pilot เป็นการลงสถานะโดย Sales **ไม่ใช่ลายเซ็นดิจิทัล** และไม่ได้ส่งอีเมลขออนุมัติเอง

## Data / Privacy

- ข้อมูลทั้งหมดเก็บใน `localStorage` ของเบราว์เซอร์ที่เปิดใช้เท่านั้น ไม่ซิงก์ข้ามเครื่องและไม่ถูกส่งไปเซิร์ฟเวอร์ของแอป
- บันทึกงานโดยกด **บันทึกร่าง**; หากล้างข้อมูล Browser/Incognito อาจสูญหาย ควร Export Project JSON สำรอง
- นำ Project JSON กลับเข้าระบบจาก Dashboard ด้วย Import Project; ระบบรีเซ็ตสถานะอนุมัติเพื่อป้องกันการใช้ Approval จากโปรเจกต์นำเข้าโดยไม่ตรวจซ้ำ
- GitHub Pages ปกติไม่มีระบบ Login หรือ Role-based Access Control **อย่าใช้เป็นระบบเผยแพร่ข้อมูลลูกค้าลับหรือ Production Approval อย่างเป็นทางการก่อนพัฒนาระบบยืนยันตัวตนและฐานข้อมูล**
- ข้อมูลลูกค้า/โลโก้ที่อัปโหลดจากเบราว์เซอร์ **ไม่ได้ถูกคอมมิตขึ้น GitHub อัตโนมัติ** แต่อย่านำ Project JSON ที่มีข้อมูลลูกค้าจริงไปวางใน Public Repo

## File Structure

```text
SCCUSTOM_Artwork_Studio_GitHub_Package/
├── index.html             # Entry point
├── styles.css             # Fully responsive UI
├── app.js                 # UI / event handlers / state
├── data.js                # Product Master / brands / inks / settings
├── vector.js              # SVG sanitization / vector editor / actual mm export
├── exporter.js            # Preflight / ZIP / A4 print layouts
├── assets/                # Demo pen photos and Quantum header mark
├── examples/              # 1, 2, 3-colour vector test logos
├── tests/                 # Node built-in test runner
├── package.json           # Test commands only, no dependencies
├── favicon.svg
├── .nojekyll
└── .github/workflows/deploy.yml
```

## Quality checks

```bash
npm test
npm run check
```

Requires Node.js 18+ for `npm test`. **Running the website does not require Node.js.**

## Next Phase (not implemented)

- Login / Roles (Sales, Design, Production) + shared database and asset storage
- Admin page to add product models, actual variants, approved logo assets and print-area calibration profiles
- Real Pantone/Spot separation through verified production processing pipeline
- Digital Customer Approval / signature / revision audit trail / actual quotation and production order integration
- Factory-specific preflight thresholds (minimum line, screen print constraints, curved barrel geometry)

---

**Implementation status:** Pilot website functionally implemented; requires real pen SKU verification and factory approval before production use.
