import {studioStatus} from './studio-status.js';
import {artworkMode, layoutFingerprint, profilesFor, roundMm} from './print-layout.js';
import {frameSummary, compositionControls, designReviewControls} from './compose-ui.js';
import { BRANDS, brandLogos, BRAND_LOGO_REQUIRED } from './brand-logos.js';
import {PRODUCT,INKS,NOTICES,newJob,activeVariants,variantInks,ink,position,logoSize,escapeHtml,relFile,CATALOG_BRANDS,productCatalog,saveProductMaster,applyProductToJob,activateJobProduct,proposedFilename} from './data.js';
import {convertTextToOutlines} from './text-outline.js';
import {getClientId,setClientId,driveConnected,connectDrive,disconnectDrive,saveJobToDrive,listDriveJobs,fetchDriveJob} from './drive-sync.js';
import {artworkSvg,svgDataUri,processLogo,parseSafeSvg} from './vector.js';
import {preflight,canExportProduction,downloadText,exportSvg,exportProductionZip,openPdfPrint,exportDesignReview} from './exporter.js';

const STORE='sccustom-artwork-studio-v1';
const app=document.querySelector('#app');
let jobs=[],jobIndex=0,view='editor',step=2,previewMode='all',zoom=100,toastTimer=0;
let studioMode='product',localSaveState='idle';
const studioPanels=new Set();
function persist(){
  try{localStorage.setItem(STORE,JSON.stringify({jobs,jobIndex}));localSaveState='saved';return true;}
  catch(err){localSaveState='failed';notify('พื้นที่เก็บข้อมูลเบราว์เซอร์เต็ม กรุณา Export Project JSON สำรอง',true);return false;}
}
try{
  const stored=JSON.parse(localStorage.getItem(STORE)||'null');
  if(stored?.jobs?.length&&Array.isArray(stored.jobs)){jobs=stored.jobs;jobIndex=Math.min(Math.max(0,stored.jobIndex||0),jobs.length-1);}
}catch(e){console.warn('Saved state could not be opened',e);}
if(!jobs.length){jobs=[newJob()];jobIndex=0;persist();}else{localSaveState='saved';}
activateJobProduct(jobs[jobIndex]);
const job=()=>jobs[jobIndex];
const FONTS=['Prompt','Kanit','Sarabun','IBM Plex Sans Thai','Mitr','Bai Jamjuree'];
let cloudJobs=[],pendingBrand='',lastFontFile=null;
function e(s){return escapeHtml(s);}
function select(options,selected,attrs=''){
  return `<select ${attrs}>${options.map(o=>`<option value="${e(o.value)}" ${String(selected)===String(o.value)?'selected':''}>${e(o.label)}</option>`).join('')}</select>`;
}
const inkOptions=()=>INKS.map(i=>({value:i.id,label:i.name}));
function pill(text,kind='neutral'){return `<span class="pill pill-${kind}">${e(text)}</span>`;}
function icon(name,size=18){const paths={
  dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  pen:'<path d="m12 19-7 2 2-7L17.5 3.5a2 2 0 0 1 3 3L10 17"/><path d="m15 6 3 3"/>',
  bag:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/>',
  chart:'<path d="M4 20V11m6 9V6m6 14v-8m5 8H2"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4"/><path d="M12 17h.01"/>',
  save:'<path d="M4 4h14l2 2v14H4Z"/><path d="M8 4v6h8V4M8 20v-7h8v7"/>',
  upload:'<path d="M12 16V3m-4 4 4-4 4 4M4 16v4h16v-4"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  alert:'<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v.1"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6m0-10v.1"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back:'<path d="m12 19-7-7 7-7m-7 7h14"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3"/>',
  copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  trash:'<path d="M3 6h18M9 6V4h6v2M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  ruler:'<path d="M4 4h16v16H4zM8 4v5m4-5v3m4-3v5"/>',
  layers:'<path d="m12 2 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5m-18 5 9 5 9-5"/>',
  rotate:'<path d="M3 12a9 9 0 1 0 9-9H7m0 0 3-3M7 3l3 3"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  open:'<path d="M14 3h7v7m0-7-9 9"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/>',
  file:'<path d="M5 2h9l5 5v15H5Z"/><path d="M14 2v6h5M8 13h8m-8 4h8"/>',
  logo:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>'
};return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.info}</svg>`;}
function notify(message,bad=false){
  let t=document.querySelector('#toast');if(!t)return alert(message);
  t.innerHTML=`${icon(bad?'alert':'check',17)} <span>${e(message)}</span>`;
  t.className='toast show '+(bad?'danger':'good');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),4300);
}
function invalidate(){const j=job();if(j.customerApproved){j.customerApproved=false;j.approvedAt=null;j.ackNotes=false;j.approvalLayoutKey=null;j.revision++;j.status='Draft';notify('Artwork เปลี่ยนแปลง: ยกเลิกการอนุมัติและเพิ่ม Revision แล้ว');}}
function changed(critical=true){if(critical)invalidate();job().modifiedAt=new Date().toISOString();persist();}
function currentInkNames(v){return variantInks(job(),v.id).map(id=>ink(id).short).join(' + ');}
function header(){return `<header class="topbar"><a class="app-logo" href="#" data-action="go-view" data-view="editor" title="SCCUSTOM Smart Artwork Studio"><span>SC<span class="emphasis">CUSTOM</span></span><i></i></a><div class="top-divider"></div><div class="app-title"><b>Smart Artwork Studio</b><small>ระบบสร้างและจัดการ Artwork สินค้าพรีเมียม</small></div><nav class="topnav" aria-label="Primary"><button data-action="go-view" data-view="editor" class="${view==='editor'?'nav-active':''}">${icon('pen',16)} สร้าง Artwork</button><button data-action="go-view" data-view="dashboard" class="${view==='dashboard'?'nav-active':''}">${icon('file',16)} งานของฉัน</button><button data-action="go-view" data-view="library" class="${view==='library'?'nav-active':''}">${icon('bag',16)} คลังสินค้า / Admin</button><button data-action="go-view" data-view="reports" class="${view==='reports'?'nav-active':''}">${icon('chart',16)} รายงาน</button></nav><div class="top-actions"><button class="icon-btn" aria-label="Help" data-action="go-view" data-view="help">${icon('help',20)}</button><span class="avatar">S</span><b>Sales01</b></div></header>`;}
function brandLogoSmall(logo){return logo?`<img alt="" src="${e(logo.url)}">`:'<span class="brand-placeholder">ยังไม่ได้เลือกโลโก้</span>';}
function brandSelector(j,{showVisual=true}={}){
  const logo=brandLogos.get(j.brandId);
  const hasOptions=BRANDS.some(brand=>brandLogos.get(brand.id));
  const options=BRANDS.map(brand=>{
    const ready=brandLogos.get(brand.id);
    const suffix=ready?'':brandLogos.status(brand.id)==='unavailable'?' — เปิดไฟล์โลโก้ไม่ได้':' — ยังไม่ตั้งค่าโลโก้';
    return `<option value="${e(brand.id)}"${ready?(brand.id===j.brandId?' selected':''):' disabled'}>${e(brand.name+suffix)}</option>`;
  }).join('');
  return `<section class="brand-settings" aria-labelledby="template-brand-label">
    <h3 class="sidebar-subtitle"><label id="template-brand-label" for="template-brand">แบรนด์บนหัวเอกสาร</label></h3>
    ${showVisual?`<div class="brand-current${logo?' has-logo':''}">
      ${logo?`<img src="${e(logo.url)}" alt=""><strong>${e(logo.name)}</strong>`:'<span>ยังไม่ได้เลือกแบรนด์</span>'}
    </div>`:''}
    <select id="template-brand" class="brand-select" data-brand="1" aria-describedby="template-brand-help">
      <option value="" disabled${logo?'':' selected'}>เลือกแบรนด์</option>${options}
    </select>
    <p class="sidebar-tip" id="template-brand-help">${hasOptions?'เปลี่ยนเฉพาะโลโก้หัวเอกสาร ไม่เปลี่ยนแบบพิมพ์หรือสินค้า':'ยังไม่มีโลโก้พร้อมใช้ กรุณาติดต่อผู้ดูแล'}</p>
  </section>`;
}
function documentGate(j){return brandLogos.get(j.brandId)?'':'disabled';}
function documentBrandHint(j){
  if(brandLogos.get(j.brandId))return '';
  const prior=BRANDS.find(b=>b.id===j.brandId);
  const message=j.brandId==='custom'?'งานเดิมใช้โลโก้หัวเอกสารที่อัปโหลดเอง กรุณาเลือกโลโก้กลางใหม่':prior?`โลโก้ ${prior.name} ของงานนี้ยังไม่พร้อมใช้ กรุณาเลือกโลโก้ที่ตั้งค่าแล้ว`:BRAND_LOGO_REQUIRED;
  return `<p class="brand-doc-hint">${e(message)}</p>`;
}
function sidebar(){const j=job(),steps=[['เลือกสินค้า',PRODUCT.brand+' / '+PRODUCT.model],['ตั้งค่าสีและรูปแบบ','คละสี 6 ด้าม / สีสกรีน'],['อัปโหลดและจัดวางโลโก้','ขนาดและตำแหน่งงานพิมพ์'],['ตรวจสอบและส่งออก','Proof / ไฟล์ผลิต']];return `<aside class="sidebar"><div class="side-head"><h3>ขั้นตอนการสร้าง Artwork</h3><p>Guided production workflow</p></div><div class="step-list">${steps.map(([t,sub],i)=>`<button class="step ${step===i+1?'active':''}" data-action="goto-step" data-step="${i+1}"><span class="step-number ${i+1<step?'done':''}">${i+1<step?icon('check',15):i+1}</span><span class="step-titles"><strong>${e(t)}</strong><small>${e(sub)}</small></span></button>`).join('')}</div>${brandSelector(j)}<div class="tip-card"><div class="tip-card-title">${icon('info',18)} ข้อควรระวัง</div><p>${NOTICES[0]}</p><p>${NOTICES[1]}</p><p>งานพิมพ์รองรับสูงสุด 3 สี</p><button class="text-link" data-action="go-view" data-view="help">ดูข้อกำหนดทั้งหมด ${icon('arrow',14)}</button></div></aside>`;}
function jobTop(){const j=job();return `<div class="workspace-heading"><div><div class="eyebrow">SCCUSTOM / ARTWORK WORKSPACE</div><h1>${step===1?'เลือกสินค้าและข้อมูลงาน':step===2?'ตั้งค่าสีและรูปแบบสินค้า':step===3?'อัปโหลดและจัดวางโลโก้':'ตรวจสอบ Artwork และส่งออก'}</h1><p>${step===1?'กำหนดข้อมูลลูกค้าและสินค้าเพื่อเริ่มสร้างแบบ':step===2?'กำหนดสีด้าม จำนวน และสีสกรีนสำหรับงานนี้':step===3?'จัดวางโลโก้ให้อยู่ภายในพื้นที่พิมพ์จริง': 'ตรวจแบบและสร้างเอกสารจาก Template เดียวกัน'}</p></div><div class="heading-actions"><span class="job-code">Job: ${e(j.id)}</span>${pill(j.status,j.customerApproved?'success':'warning')}<button class="outline-btn" data-action="save">${icon('save',16)} บันทึกร่าง</button></div></div>`;}
function productStrip(){return `<div class="product-strip"><img src="${relFile(PRODUCT.variants[0]?.photo||'assets/pen-sky.webp')}" alt="Product preview"><div class="prod-identity"><strong>${e(PRODUCT.brand)}</strong><span>รุ่น : ${e(PRODUCT.model)}</span></div><div><small>ประเภท</small><strong>${e(PRODUCT.type)}</strong><span>หัวปากกา : ${e(PRODUCT.nib)}</span></div><div><small>พื้นที่พิมพ์ (Print Area)</small><strong>${PRODUCT.printWidthMm} × ${PRODUCT.printHeightMm} mm</strong></div><div><small>ความยาวด้าม</small><strong>${PRODUCT.lengthMm} mm</strong></div><div><small>กระบวนการพิมพ์</small><strong>Silkscreen</strong><span>1–3 Colours</span></div></div>`;}
function pen(v,small=false){const j=job();return `<div class="pen-preview ${small?'mini':''}" role="img" aria-label="ภาพจำลองปากกาสี ${e(v.name)} กับโลโก้ที่วาง"><img class="pen-photo" src="${relFile(v.photo)}" alt="">${position(j).safe.locationId==='barrel'?`<img class="pen-mark" src="${svgDataUri(artworkSvg(j,v.id))}" alt="">`:''}</div>`;}
function actualArtwork(vId,{compact=false}={}){
  const j=job(),p=position(j),f=p.safe;
  return `<div class="actual-art-card"><div class="section-mini">พื้นที่งานพิมพ์ <span>หน่วยมิลลิเมตร</span></div>
  <div class="measure-width"><span></span><b>${f.outerWidth} มม.</b><span></span></div>
  <div class="artboard-frame" data-drag-area="1" title="ลากเพื่อเลื่อนแบบในกรอบปลอดภัย" style="aspect-ratio:${f.outerWidth}/${f.outerHeight}">
    <img id="artboard-image" src="${svgDataUri(artworkSvg(j,vId,-1,{guides:true}))}" alt="ภาพตัวอย่างพื้นที่พิมพ์และกรอบปลอดภัย" draggable="false">
  </div>
  <div class="measure-bottom"><span>กรอบนอกสูง ${f.outerHeight} มม.</span><strong data-composition-size>${p.width.toFixed(2)} × ${p.height.toFixed(2)} มม.</strong></div>
  ${compact?'':frameSummary(j)}
  <p class="tiny-info">เส้นประสีน้ำเงินคือกรอบปลอดภัย · ภาพบนจอไม่ใช่ขนาดจริง 1:1</p></div>`;
}
function allPens(){const a=activeVariants(job());return `<div class="pens-list">${a.length?a.map(v=>`<button class="pen-list-item ${job().selectedVariant===v.id?'focused':''}" data-action="focus-variant" data-variant="${v.id}">${pen(v)}<span>${e(v.en)} · ${e(currentInkNames(v))}</span></button>`).join(''):'<div class="empty-state">ยังไม่ได้เลือกสีด้าม</div>'}</div>`;}
function photoPanel(){const j=job(),a=activeVariants(j),focused=a.find(v=>v.id===j.selectedVariant)||a[0]||PRODUCT.variants[0];return `<section class="preview-card panel"><div class="preview-toolbar"><div class="tab-group"><button class="${previewMode==='all'?'on':''}" data-action="preview-mode" data-value="all">${icon('dashboard',16)} ตัวอย่างรวม (${a.length} สี)</button><button class="${previewMode==='single'?'on':''}" data-action="preview-mode" data-value="single">${icon('bag',16)} ดูทีละสี</button><button class="${previewMode==='actual'?'on':''}" data-action="preview-mode" data-value="actual">${icon('ruler',16)} พื้นที่พิมพ์ (1:1)</button></div><div class="zoom-tools"><button data-action="zoom-minus" aria-label="Zoom out">−</button><span>${zoom}%</span><button data-action="zoom-plus" aria-label="Zoom in">+</button></div></div><div class="preview-body ${previewMode}"><div class="product-stage">${previewMode==='all'?allPens():previewMode==='single'?`<div class="single-pen">${pen(focused)}<p>สีด้าม: ${e(focused.name)} / สีสกรีน: ${e(currentInkNames(focused))}</p></div>`:`<div class="actual-large">${actualArtwork(focused.id)}</div>`}</div><div class="technical-rail">${previewMode==='actual'?`<div class="tech-note"><b>Drag to Position</b><p>สามารถลากตำแหน่งโลโก้ภายใน Print Area ได้</p></div>`:actualArtwork(focused.id)}<div class="art-data"><h4>ข้อมูล Artwork</h4><div><span>ขนาดแบบ (กว้าง × สูง)</span><b>${position(j).width.toFixed(2)} × ${position(j).height.toFixed(2)} mm</b></div><div><span>จำนวนสีสกรีน</span><b>${j.inkCount} สี</b></div><div><span>สีสกรีน (${e(focused.en)})</span><span class="ink-dots">${variantInks(j,focused.id).map(x=>`<i style="background:${ink(x).hex}" title="${e(ink(x).name)}"></i>`).join('')}</span></div><div class="good-status">${icon('check',17)} จัดวางอยู่ในกรอบ ไม่ใช่ผลอนุมัติผลิต</div></div></div></div></section>`;}
function variantRow(v){const j=job(),p=j.variants[v.id],enabled=p.enabled,inks=variantInks(j,v.id),isCustom=!j.sameInk;return `<div class="variant-row ${enabled?'':'off'}"><label class="variant-name"><input type="checkbox" data-variant-toggle="${v.id}" ${enabled?'checked':''}/><span class="swatch" style="background:${v.swatch}"></span><span>${e(v.name)} <small>(${e(v.en)})</small></span></label><div class="variant-inks">${inks.map(id=>`<span class="mini-ink" title="${e(ink(id).name)}" style="background:${ink(id).hex}"></span>`).join('')}<span class="ink-caption">${e(inks.map(x=>ink(x).short).join(' / '))}</span>${isCustom?`<button class="mini-edit" data-action="edit-variant" data-variant="${v.id}">แก้ไข</button>`:''}</div><input type="number" min="0" max="999999" step="1" data-qty="${v.id}" value="${Number(p.qty)||0}" ${!enabled?'disabled':''} aria-label="จำนวน ${e(v.name)}"/></div>${j.editingVariant===v.id&&isCustom?`<div class="variant-custom-config">${Array.from({length:j.inkCount},(_,i)=>`<label>Ink ${i+1} ${select(inkOptions(),p.inks[i],`data-variant-ink="${v.id}" data-ink-index="${i}"`)}</label>`).join('')}</div>`:''}`;}
function variantsPanel(){const j=job(),a=activeVariants(j),qty=a.reduce((s,v)=>s+(Number(j.variants[v.id].qty)||0),0);return `<section class="variant-card panel"><div class="card-title-row"><h3 id="variants-heading" tabindex="-1">จัดการสีด้าม <span>(Colour Variants)</span></h3>${pill(`คละสี ${a.length} ด้าม`,'blue')}</div><div class="mode-options"><label class="mode-choice ${j.sameInk?'chosen':''}"><input type="radio" name="inkmode" value="same" ${j.sameInk?'checked':''}/><div><b>ใช้ Artwork / สีสกรีนเดียวกัน</b><small>แชร์ขนาด ตำแหน่ง และสีหมึก</small></div></label><label class="mode-choice ${!j.sameInk?'chosen':''}"><input type="radio" name="inkmode" value="custom" ${!j.sameInk?'checked':''}/><div><b>กำหนดสีสกรีนแต่ละด้าม</b><small>เปลี่ยนเฉด Ink ต่อสีด้าม</small></div></label></div><div class="ink-settings"><div class="inline-head"><b>จำนวนสีพิมพ์</b><div class="segments">${[1,2,3].map(n=>`<button data-action="ink-count" data-count="${n}" class="${n===j.inkCount?'active':''}">${n} สี</button>`).join('')}</div></div>${j.sameInk?`<div class="shared-ink-list">${Array.from({length:j.inkCount},(_,i)=>`<label>Ink ${i+1} ${select(inkOptions(),j.sharedInks[i],`data-shared-ink="${i}"`)}</label>`).join('')}</div>`:`<p class="inline-help">กด “แก้ไข” ในรายการสีด้ามเพื่อกำหนดสีหมึก 1–${j.inkCount} รายการสำหรับแต่ละสี</p>`}</div><div class="variant-header"><span><label><input type="checkbox" id="select-all-variants" ${a.length===PRODUCT.variants.length?'checked':''}> สีด้าม (Barrel)</label></span><span>สีสกรีน (Ink)</span><span>จำนวน</span></div><div class="variants-scroll">${PRODUCT.variants.map(variantRow).join('')}</div><div class="variant-total"><span>รวมจำนวน</span><strong>${qty.toLocaleString('en-US')} ด้าม</strong></div><div class="small-footnote">สีตัวสินค้าเป็นภาพจำลองสำหรับทดสอบ UX ไม่ใช่รหัสสี SKU ที่ยืนยัน</div></section>`;}
function templatePreview(){const b=brandLogos.get(job().brandId);return `<section class="template-preview panel"><div class="template-header"><span>ตัวอย่างเอกสาร <small>(Live Template Preview)</small></span><span class="muted-sm">ใช้โลโก้จากแบรนด์ที่เลือก</span></div><div class="paper-mini"><div class="paper-brand">${brandLogoSmall(b)}</div><div class="paper-name"><strong>ARTWORK FOR SILKSCREEN</strong><small>Customer Name : ${e(job().customer||'...................................')}</small><small>Representative : ${e(job().representative||'........................')}</small></div></div><div class="export-buttons"><button data-action="proof" ${documentGate(job())} class="export-item"><span class="file-icon pdf">PDF</span><span><b>Customer Proof</b><small>ตัวอย่างแบบสำหรับลูกค้า</small></span>${icon('open',17)}</button><button data-action="prod-pdf" ${documentGate(job())} class="export-item"><span class="file-icon pdf">PDF</span><span><b>Production Spec</b><small>รายละเอียดสั่งผลิต</small></span>${icon('open',17)}</button><button data-action="prod-svg" class="export-item"><span class="file-icon svg">SVG</span><span><b>Artwork SVG</b><small>เวกเตอร์ขนาดจริง</small></span>${icon('download',17)}</button><button data-action="prod-zip" class="export-item"><span class="file-icon zip">ZIP</span><span><b>Production ZIP</b><small>SVG แยกกลุ่มหมึก/สี</small></span>${icon('download',17)}</button></div>${documentBrandHint(job())}</section>`;}
function productStep(){
  const j=job(),catalog=productCatalog(),brandName=pendingBrand||PRODUCT.brand;
  const byBrand=catalog.filter(p=>p.brand===brandName);
  return `<section class="form-page panel"><div class="form-heading"><div class="round-icon">${icon('bag',22)}</div><div><h2>ข้อมูลสินค้าและคำสั่งงาน</h2><p>เลือกแบรนด์และรุ่นจาก Product Master ที่จัดเก็บไว้</p></div></div><div class="form-grid">
  <label>แบรนด์สินค้า${select(CATALOG_BRANDS.map(b=>({value:b.name,label:b.name})),brandName,'data-product-brand="1"')}</label>
  <label>รุ่นปากกา${select(byBrand.length?byBrand.map(p=>({value:p.id,label:p.model+' — '+p.nib})):[{value:'',label:'ยังไม่มีสินค้าในแบรนด์นี้'}],byBrand.some(p=>p.id===j.productId)?j.productId:'','data-product="1"')}</label>
  <label>ประเภทหัวปากกา<input readonly value="${e(PRODUCT.nib)}"/></label>
  <label>Printing Process<input readonly value="${e(PRODUCT.printProcess)}"/></label>
  <label>Customer Name<input data-field="customer" value="${e(j.customer)}" placeholder="ชื่อลูกค้า / บริษัท"/></label>
  <label>Representative<input data-field="representative" value="${e(j.representative)}" placeholder="ชื่อผู้ประสานงาน"/></label>
  <label>P.O. Number<input data-field="po" value="${e(j.po)}" placeholder="PO / เลขที่ใบสั่งซื้อ"/></label>
  <label>EXT. / Reference<input data-field="ext" value="${e(j.ext)}" placeholder="Reference"/></label></div>
  ${byBrand.length?'':`<div class="editor-warn">แบรนด์นี้ยังไม่มี Product Master กรุณาเพิ่มที่หน้าคลังสินค้า / Admin ก่อน</div><button class="outline-btn" data-action="go-view" data-view="library">ไปเพิ่มสินค้า</button>`}
  <div class="prod-confirm"><div><strong>Print Area ตาม Product Master</strong><p>${PRODUCT.printWidthMm} × ${PRODUCT.printHeightMm} mm · Pen Length ${PRODUCT.lengthMm} mm</p></div>${pill(PRODUCT.verified?'ยืนยันสเปกแล้ว':'ต้องตรวจสอบสเปกโรงงาน',PRODUCT.verified?'success':'warning')}</div></section>`;
}

function textEditorControls(j){
  const t=j.textArtwork||{};
  const tracking=Math.max(0,Math.min(.35,Number(t.trackingEm)||0));
  const family=FONTS.includes(t.family)?t.family:'Prompt';
  return `<div class="text-editor">
    <label class="control-label">ข้อความที่จะพิมพ์ <input type="text" maxlength="120" data-text-value="1" value="${e(t.text||'')}" placeholder="พิมพ์ข้อความไทยหรืออังกฤษ"></label>
    <label>ช่องไฟตัวอักษร (% ของขนาดฟอนต์)<input type="number" min="0" max="35" step="1" data-tracking value="${Math.round(tracking*100)}"></label>
    <details class="studio-disclosure" data-studio-disclosure="type"${studioPanels.has('type')?' open':''}>
      <summary>เลือกฟอนต์และน้ำหนัก</summary>
      <div class="studio-details-body">
        <div class="two-inputs">
          <label>ฟอนต์ตัวอย่าง${select(FONTS.map(f=>({value:f,label:f})),family,'data-font-family="1"')}</label>
          <label>น้ำหนัก${select([{value:'400',label:'ปกติ'},{value:'500',label:'กลาง'},{value:'700',label:'หนา'}],t.weight||'700','data-font-weight="1"')}</label>
        </div>
        <div class="font-sample" style="font-family:'${family}',sans-serif;font-weight:${[400,500,700].includes(+t.weight)?+t.weight:700};letter-spacing:${tracking}em">${e(t.text||'ตัวอย่างข้อความ')}</div>
        <p class="small-footnote">ถ้าฟอนต์จัดช่องไฟโดยรักษากลุ่มสระหรือวรรณยุกต์ไม่ได้ ให้ลองใช้ 0% หรือส่งให้ Design ตรวจ</p>
      </div>
    </details>
    <input id="outline-font-file" type="file" accept=".ttf,.otf,font/ttf,font/otf" hidden>
    <button class="outline-btn full" data-action="outline-font">${icon('pen',16)} แปลงข้อความเป็นเส้นเวกเตอร์</button>
    <p class="small-footnote" data-outline-status>${j.logo.vector?'แปลงแล้ว · '+e(j.logo.fontFamily||t.fontFileName||'ไฟล์ฟอนต์ที่เลือก'):'เลือกไฟล์ฟอนต์ TTF/OTF ที่ตรงกับแบบจริงก่อนส่งผลิต'}</p>
  </div>`;
}
function studioIdentity(j){
  const brand=brandLogos.get(j.brandId);
  const customer=j.customer?.trim();
  return `<section class="studio-identity" aria-label="ข้อมูลงาน">
    <div class="studio-identity-main">
      <div class="studio-kicker">SCCUSTOM / PRINT STUDIO</div>
      <h1 id="studio-heading" tabindex="-1">จัดแบบพิมพ์</h1>
      <p>${e(customer||'ยังไม่ระบุชื่อลูกค้า')} <span aria-hidden="true">·</span> ${e(j.id)} <span aria-hidden="true">·</span> ${e(PRODUCT.brand)} ${e(PRODUCT.model)}</p>
    </div>
    <div class="studio-identity-meta">
      <div class="studio-brand-tag">${brand?`<img src="${e(brand.url)}" alt=""><div><small>แบรนด์บนเอกสาร</small><strong>${e(brand.name)}</strong></div>`:'<span>ยังไม่เลือกแบรนด์เอกสาร</span>'}</div>
      <div class="studio-save"><span class="studio-save-state" data-studio-save>${studioSaveLabel()}</span>
        <button type="button" class="outline-btn" data-action="save">${icon('save',17)} บันทึกร่าง</button></div>
    </div>
  </section>`;
}
function studioSaveLabel(){return localSaveState==='saved'?'บันทึกในเครื่องแล้ว':localSaveState==='failed'?'บันทึกในเครื่องไม่สำเร็จ':'ยังไม่ได้บันทึก';}
function studioSteps(){
  return `<nav class="studio-steps" aria-label="ขั้นตอนจัดทำแบบ">${['เลือกสินค้า','ตั้งค่าสีด้าม','จัดแบบพิมพ์','ตรวจแบบและส่งออก'].map((label,i)=>
      `<button type="button" data-action="goto-step" data-step="${i+1}"${i===2?' aria-current="step"':''}><span>${i+1}</span>${label}</button>`).join('')}</nav>`;
}
function studioSetup(j,mode,variants,focused){
  return `<section class="panel studio-setup" aria-labelledby="studio-setup-title">
    <h2 id="studio-setup-title">ตั้งค่างาน</h2>
    <div class="studio-segment">
      <div class="studio-field-heading"><h3>รุ่นปากกา</h3><button class="text-link" data-action="goto-step" data-step="1">เปลี่ยนรุ่น</button></div>
      <strong>${e(PRODUCT.brand)} ${e(PRODUCT.model)}</strong><p class="small-footnote">${e(PRODUCT.type)} · ${e(PRODUCT.printProcess)}</p>
    </div>
    <div class="studio-segment">
      <div class="studio-field-heading"><h3>สีด้ามที่แสดง</h3><button class="text-link" data-action="goto-step" data-step="2">แก้สีและจำนวน</button></div>
      ${variants.length?`<div class="studio-swatches" role="group" aria-label="เลือกสีด้ามในภาพตัวอย่าง">
        ${variants.map(v=>`<button type="button" data-action="studio-variant" data-variant="${e(v.id)}" aria-label="${e(v.name)}" aria-pressed="${v.id===focused.id}" title="${e(v.name)}"><span class="swatch" style="background:${/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.swatch)?v.swatch:'#8ca0b5'}"></span></button>`).join('')}
      </div><p class="small-footnote">${e(focused.name)} · เลือกในงาน ${variants.length} สี</p>`:'<p class="small-footnote">ยังไม่เลือกสีด้าม · ภาพที่เห็นเป็นตัวอย่างเท่านั้น</p>'}
    </div>
    <div class="studio-segment">
      <h3>รูปแบบงานพิมพ์</h3>
      <div class="artwork-choice compose-modes" role="group" aria-label="องค์ประกอบงานพิมพ์">
        ${[['logo','โลโก้'],['text','ข้อความ'],['both','โลโก้ + ข้อความ']].map(([id,label])=>`<button data-action="artwork-mode" data-value="${id}" aria-pressed="${mode===id}" class="${mode===id?'active':''}">${label}</button>`).join('')}
      </div>
    </div>
    ${brandSelector(j,{showVisual:false})}
  </section>`;
}
function studioPreview(j,focused){
  const f=position(j).safe,z=studioMode==='area';
  const sample=j.logo?.sourceType==='demo';
  return `<section class="panel studio-preview" aria-labelledby="studio-preview-title">
    <div class="studio-preview-header">
      <div><h2 id="studio-preview-title">ดูชิ้นงาน</h2><p>${e(PRODUCT.brand)} ${e(PRODUCT.model)} · ${e(focused.name)}</p></div>
      <div class="studio-preview-toggle" role="group" aria-label="มุมมองภาพตัวอย่าง">
        <button type="button" data-action="studio-view" data-value="product" aria-pressed="${!z}">${icon('pen',16)} ดูบนด้าม</button>
        <button type="button" data-action="studio-view" data-value="area" aria-pressed="${z}">${icon('ruler',16)} ขยายพื้นที่พิมพ์</button>
      </div>
    </div>
    ${z?`<div class="studio-canvas studio-canvas-area">${actualArtwork(focused.id,{compact:true})}</div>`:
      `<div class="studio-canvas studio-canvas-product">
        <div class="studio-canvas-cap"><span>${e(f.locationLabel)}</span><span>${sample?'ภาพจำลอง · แบบตัวอย่าง':'ภาพจำลอง'}</span></div>
        <div class="large-product studio-pen">${pen(focused)}</div>
      </div>`}
    <div class="studio-preview-caption">${z?'ลากแบบเพื่อเลื่อนภายในกรอบ หรือกรอกพิกัดในแถบปรับแบบ':f.locationId!=='barrel'?'ตำแหน่งนี้ยังไม่มีภาพจำลอง ให้ดูในมุมขยายพื้นที่พิมพ์':'ภาพบนด้ามใช้ดูตำแหน่งโดยประมาณ ไม่ใช่ขนาดจริง 1:1'}</div>
  </section>`;
}
function studioInspector(j,mode){
  const source=mode==='both'?j.savedLogo:j.logo;
  const uploaded=source&&source.sourceType!=='demo';
  return `<section class="panel studio-inspector" aria-labelledby="studio-inspector-title">
    <h2 id="studio-inspector-title">ปรับแบบ</h2>
    <div id="studio-content" class="studio-segment" tabindex="-1">
      <h3>องค์ประกอบบนด้าม</h3>
      ${mode!=='text'?`<button class="outline-btn full studio-upload" data-action="trigger-logo">${icon('upload',19)} ${uploaded?'เปลี่ยนไฟล์โลโก้':'อัปโหลดโลโก้ลูกค้า'}</button>
        <input hidden type="file" id="logo-file" accept="image/svg+xml,.svg,image/png,image/jpeg,image/webp">
        <p class="small-footnote">${uploaded?e(source.name)+' · ':''}${uploaded&&source.vector?'SVG เวกเตอร์':'SVG สำหรับผลิต · PNG/JPG/WebP สำหรับดูแบบ'}</p>`:''}
      ${mode!=='logo'?textEditorControls(j):''}
    </div>
    <div class="studio-segment">${compositionControls(j,{open:studioPanels.has('layout')})}</div>
    <details id="studio-profile" class="studio-disclosure" data-studio-disclosure="profile"${studioPanels.has('profile')?' open':''}>
      <summary>สเปกพื้นที่พิมพ์</summary><div class="studio-details-body">${frameSummary(j)}</div>
    </details>
    <details id="studio-design-review" class="studio-disclosure" data-studio-disclosure="design"${studioPanels.has('design')?' open':''}>
      <summary>${j.designReview?.status==='pending'?'รอ Design ตรวจรายละเอียด':'ส่ง Design ตรวจรายละเอียด'}</summary><div class="studio-details-body">${designReviewControls(j)}</div>
    </details>
  </section>`;
}
function studioStatusMarkup(j){
  const {fit,production}=studioStatus(j);
  return `<div class="studio-status-item"><span class="studio-status-label">ตำแหน่งแบบ</span><span class="studio-flag is-${fit.tone}">${e(fit.label)}</span></div>
    <div class="studio-status-item"><span class="studio-status-label">ไฟล์ผลิต</span><span class="studio-flag is-${production.tone}">${e(production.label)}</span>
      ${production.issueCount&&production.target!=='review'?`<button data-action="studio-resolve" data-target="${e(production.target)}" class="text-link studio-status-link">${e(production.action)}</button>`:''}
    </div>`;
}
function logoEditor(){
  const j=job(),mode=artworkMode(j),variants=activeVariants(j);
  const focused=variants.find(v=>v.id===j.selectedVariant)||variants[0]||PRODUCT.variants[0];
  return `<main class="studio-shell">
    ${studioIdentity(j)}
    ${studioSteps()}
    <div class="studio-workspace">
      ${studioPreview(j,focused)}
      ${studioSetup(j,mode,variants,focused)}
      ${studioInspector(j,mode)}
    </div>
    <div class="studio-actionbar">
      <div class="studio-status" data-studio-status aria-live="polite">${studioStatusMarkup(j)}</div>
      <button type="button" class="primary-btn" data-action="studio-review">ตรวจแบบก่อนส่ง ${icon('arrow',18)}</button>
    </div>
  </main>`;
}
function proofStep(){const j=job(),issues=preflight(j),a=activeVariants(j);return `<div class="review-grid"><section class="panel approval-panel"><div class="card-title-row"><h3 id="review-heading" tabindex="-1">ตรวจแบบและส่งออก</h3>${pill(issues.some(x=>x.level==='block')?'Action Required':issues.length?'Warnings':'Ready',issues.some(x=>x.level==='block')?'danger':issues.length?'warning':'success')}</div><div class="checks"><div class="check-line pass">${icon('check',16)} ขนาดแบบ: ${position(j).width.toFixed(2)} × ${position(j).height.toFixed(2)} mm / กรอบใน ${position(j).safe.width} × ${position(j).safe.height} mm</div><div class="check-line pass">${icon('check',16)} จำนวนสีพิมพ์ ${j.inkCount} สี (สูงสุด 3)</div><div class="check-line pass">${icon('check',16)} เลือกสีด้าม ${a.length} สี</div>${issues.map(i=>`<div class="check-line ${i.level==='block'?'block':'warn'}">${icon('alert',16)} ${e(i.text)}</div>`).join('')}</div><div class="approval-box"><label><input type="checkbox" data-ack="1" ${j.ackNotes?'checked':''}> อ่านและรับทราบข้อควรระวังทั้งหมดก่อนการ Export</label><label><input type="checkbox" data-approved="1" ${j.customerApproved?'checked':''}> ยืนยันว่าลูกค้าอนุมัติ Artwork Revision ${j.revision} แล้ว</label><small>ช่องนี้เป็นการบันทึกสถานะโดย Sales ไม่ใช่ลายเซ็นดิจิทัลหรือการอนุมัติจากโรงงาน</small></div><div class="check-last">${canExportProduction(j)?pill('สามารถส่งออกไฟล์สำหรับ Prepress Review','success'):pill('Production Export ยังถูกล็อก','danger')}</div></section><section class="panel output-panel"><h3>Export Documents & Production</h3><p>Customer Proof ส่งได้ก่อนการอนุมัติ ส่วนไฟล์ผลิตจะปลดล็อกเมื่อผ่านเงื่อนไข</p><div class="output-actions"><button data-action="proof" ${documentGate(job())} class="action-card">${icon('file',24)}<span><b>Customer Proof PDF</b><small>เปิดเอกสาร A4 เพื่อ Print / Save as PDF</small></span>${icon('arrow',17)}</button><button data-action="prod-pdf" ${documentGate(job())} class="action-card">${icon('file',24)}<span><b>Production Spec PDF</b><small>รายการสี ขนาด และข้อควรระวัง</small></span>${icon('arrow',17)}</button><button data-action="prod-svg" class="action-card ${!canExportProduction(j)?'disabled':''}">${icon('layers',24)}<span><b>Production SVG 1:1</b><small>ไฟล์เวกเตอร์ตามหน่วย mm</small></span>${icon('download',17)}</button><button data-action="prod-zip" class="action-card ${!canExportProduction(j)?'disabled':''}">${icon('download',24)}<span><b>Production ZIP / Separations</b><small>Artwork แยกกลุ่มสีหมึก (สำหรับ Prepress)</small></span>${icon('download',17)}</button></div>${documentBrandHint(j)}<div class="editor-warn">${icon('alert',17)} การพิมพ์ PDF ต้องเลือก 100% / Actual Size และปิด Fit to Page; ตรวจด้วยไม้บรรทัดและ Prepress ก่อนผลิต</div></section></div>`;}
function bottomActions(){return `<div class="bottom-controls"><button class="outline-btn" data-action="prev-step">${icon('back',17)} ย้อนกลับ</button><div class="autosave">${icon('save',15)} ข้อมูลบันทึกในเบราว์เซอร์ (Local)</div><button class="primary-btn" data-action="next-step">${step<4?'ถัดไป : '+['','ตั้งค่าสีด้าม','อัปโหลดและจัดวางโลโก้','ตรวจสอบและส่งออก'][step]:'กลับไปแก้ไข Artwork'} ${icon('arrow',18)}</button></div>`;}
function editor(){if(step===3)return logoEditor();return `<div class="layout">${sidebar()}<main class="workspace">${jobTop()}${productStrip()}${step===1?productStep():step===2?`<div class="main-editor-grid">${photoPanel()}${variantsPanel()}</div>`:proofStep()}${bottomActions()}${templatePreview()}<div class="legal-inline">ระบบ Pilot: ตำแหน่งโลโก้ในภาพเป็นภาพจำลอง ต้องตรวจความถูกต้องของ Product Master, ตัวสินค้า และไฟล์เวกเตอร์ก่อนใช้ผลิตจริง</div></main></div>`;}
function dashboard(){return `<main class="content-page"><div class="page-hero"><div><div class="eyebrow">SCCUSTOM / SALES WORKFLOW</div><h1>งาน Artwork ของฉัน</h1><p>สร้างงาน แก้ไข ทำซ้ำ และสำรองงานด้วย Project JSON หรือ Google Drive</p></div><button class="primary-btn" data-action="new-job">+ สร้าง Artwork ใหม่</button></div>
<div class="stat-grid"><div class="stat-card"><small>Total Jobs</small><strong>${jobs.length}</strong><span>บันทึกในเบราว์เซอร์นี้</span></div><div class="stat-card"><small>Draft</small><strong>${jobs.filter(j=>!j.customerApproved).length}</strong></div><div class="stat-card"><small>Approved</small><strong>${jobs.filter(j=>j.customerApproved).length}</strong><span>Sales-side record</span></div><div class="stat-card"><small>Product Masters</small><strong>${productCatalog().length}</strong><span>${CATALOG_BRANDS.length} แบรนด์ที่รองรับ</span></div></div>
<div class="panel jobs-card"><div class="card-title-row"><h3>Recent Artwork</h3><button class="outline-btn small" data-action="import-job">${icon('upload',15)} Import Project JSON</button></div><input type="file" id="project-import" hidden accept="application/json,.json"/><div class="table-wrap"><table class="jobs-table"><thead><tr><th>JOB NO.</th><th>ลูกค้า / สินค้า</th><th>REV</th><th>สถานะ</th><th>แก้ไขล่าสุด</th><th>จัดการ</th></tr></thead><tbody>${jobs.map((j,i)=>`<tr><td><b>${e(j.id)}</b></td><td>${e(j.customer||'ยังไม่ระบุลูกค้า')}<small>${e(j.productSpec?.brand||'Quantum')} / ${e(j.productSpec?.model||'341224')}</small></td><td>Rev. ${j.revision}</td><td>${pill(j.customerApproved?'Approved':'Draft',j.customerApproved?'success':'warning')}</td><td>${new Date(j.modifiedAt||Date.now()).toLocaleString('th-TH',{dateStyle:'short'})}</td><td class="job-actions"><button data-action="open-job" data-id="${i}">เปิด</button><button data-action="duplicate-job" data-id="${i}">${icon('copy',14)}</button><button data-action="export-job" data-id="${i}">${icon('download',14)}</button><button data-action="delete-job" data-id="${i}" class="danger-text">${icon('trash',14)}</button></td></tr>`).join('')}</tbody></table></div></div>
<div class="panel cloud-card"><div class="card-title-row"><h3>Google Drive Workspace <span>· Optional Sync</span></h3>${pill(driveConnected()?'Connected':'Not Connected',driveConnected()?'success':'warning')}</div>
<p>Google Drive Sync ใช้ OAuth จาก Google Cloud Project ขององค์กร เปิดใช้ Drive API และกำหนด JavaScript origin ของ GitHub Pages ก่อน (Client ID ไม่ใช่ Secret)</p>
<div class="cloud-actions"><input id="google-client-id" placeholder="xxxxxxxx.apps.googleusercontent.com" value="${e(getClientId())}"/><button data-action="save-client" class="outline-btn">บันทึก Client ID</button><button data-action="drive-connect" class="primary-btn">${driveConnected()?'เชื่อมต่อใหม่':'เชื่อม Google Drive'}</button><button data-action="drive-disconnect" class="outline-btn">ออกจาก Drive</button></div>
<div class="cloud-actions"><button data-action="drive-save" class="outline-btn">☁ Save งานปัจจุบันไป Drive</button><button data-action="drive-list" class="outline-btn">↻ ค้นหาไฟล์งานบน Drive</button></div><div class="drive-list">${cloudJobs.length?cloudJobs.map(f=>`<button class="drive-file" data-action="drive-open" data-file-id="${e(f.id)}">${icon('file',15)} ${e(f.name)} · ${new Date(f.modifiedTime).toLocaleString('th-TH')}</button>`).join(''):'<span class="muted-sm">เชื่อมต่อบัญชีแล้วกดค้นหาเพื่อเรียกงานเดิมข้ามเครื่อง</span>'}</div>
<p class="small-footnote">ไฟล์เก็บใน Drive ของบัญชีที่ล็อกอิน ขอบเขต drive.file เฉพาะไฟล์ที่แอปสร้าง/เปิดได้ ไม่ใช่ระบบแชร์งานทั้งทีมที่มีสิทธิ์แยกตามบทบาท</p></div></main>`;}
function library(){const catalog=productCatalog();return `<main class="content-page"><div class="page-hero"><div><div class="eyebrow">PRODUCT MASTER / ASSET MANAGEMENT</div><h1>คลังสินค้าและ Product Master</h1><p>8 แบรนด์ · ตั้งชื่อไฟล์อัตโนมัติ · ภาพ WebP · Print Area เป็นหน่วย mm</p></div>${pill('Local Admin — Pilot','warning')}</div>
<div class="brand-chip-grid">${CATALOG_BRANDS.map(b=>`<span>${e(b.name)} <small>${b.code}</small></span>`).join('')}</div>
<div class="library-grid"><section class="panel library-data"><h3>เพิ่ม Product Master</h3><form id="product-admin-form" class="admin-form"><label>Brand${select(CATALOG_BRANDS.map(b=>({value:b.name,label:b.name})),'Quantum','name="brand"')}</label><label>Model / SKU<input name="model" required placeholder="เช่น 341224"/></label><label>ประเภทสินค้า<input name="type" value="ปากกาลูกลื่น"/></label><label>หัวปากกา<input name="nib" value="0.5 mm"/></label><label>ความยาวสินค้า (mm)<input name="length" type="number" min="1" step="0.1" value="140"/></label><label>พื้นที่พิมพ์กว้าง (mm)<input name="width" type="number" min="0.1" step="0.1" value="28.3" required/></label><label>พื้นที่พิมพ์สูง (mm)<input name="height" type="number" min="0.1" step="0.1" value="4.5" required/></label><label class="span-all">เพิ่มรูปสีสินค้า (PNG, JPG, WebP) <input id="product-assets" type="file" accept="image/png,image/jpeg,image/webp" multiple/></label><p class="small-footnote span-all">ใช้ภาพด้านข้าง 2400×800 px PNG Transparent เป็น Master แนะนำ จากนั้นระบบย่อภาพลงเป็น WebP Preview ขนาดไม่เกิน 1600×533 px และตั้งชื่อไฟล์สำหรับจัดเก็บใน Drive</p><button class="primary-btn span-all" type="submit">+ เพิ่มสินค้าในคลัง Local</button></form></section>
<section class="panel library-data"><h3>รายการสินค้า (${catalog.length})</h3><div class="catalog-list">${catalog.map(p=>`<div class="catalog-row"><img src="${e(relFile(p.variants[0]?.photo||'assets/pen-sky.webp'))}" alt=""><div><b>${e(p.brand)} / ${e(p.model)}</b><small>${e(p.id)} · ${p.printWidthMm}×${p.printHeightMm} mm · ${p.variants.length} variant(s)</small></div><button data-action="use-catalog" data-product-id="${e(p.id)}" class="outline-btn small">เลือกทำงาน</button></div>`).join('')}</div><button class="outline-btn" data-action="catalog-export">Export Product Catalog JSON</button><button class="outline-btn" data-action="catalog-import">Import Catalog JSON</button><input id="catalog-import-file" type="file" accept="application/json,.json" hidden/></section></div>
<div class="panel library-data"><h3>มาตรฐานไฟล์สินค้า</h3><p>ตัวอย่าง: <code>qtm_341224_skyblue_side_web_v001.webp</code> · จัดเก็บต้นฉบับตาม Brand / Model / master, web, specs</p><p class="small-footnote">ไฟล์ภาพที่เพิ่มผ่านหน้านี้เก็บอยู่ใน Local Browser สำหรับทดลองเท่านั้น ใช้ Export Catalog JSON สำรอง และอย่าใช้ URL ของ GitHub Pages เป็นช่องทางเก็บรูปที่เป็นความลับ</p></div></main>`;}

function reports(){const total=jobs.reduce((s,j)=>s+activeVariants(j).reduce((sum,v)=>sum+Number(j.variants[v.id].qty||0),0),0);return `<main class="content-page"><div class="page-hero"><div><div class="eyebrow">WORKFLOW ANALYTICS</div><h1>Artwork Reports</h1><p>สถิติจากงานที่บันทึกในเบราว์เซอร์เครื่องนี้เท่านั้น</p></div></div><div class="stat-grid"><div class="stat-card"><small>Total Jobs</small><strong>${jobs.length}</strong></div><div class="stat-card"><small>Draft Jobs</small><strong>${jobs.filter(j=>!j.customerApproved).length}</strong></div><div class="stat-card"><small>Sales-side Approved</small><strong>${jobs.filter(j=>j.customerApproved).length}</strong></div><div class="stat-card"><small>Estimated Pieces</small><strong>${total.toLocaleString('en-US')}</strong></div></div><section class="panel report-panel"><h3>Approval Status</h3><div class="report-bars"><div class="bar-track"><div class="bar-fill" style="width:${jobs.length?100*jobs.filter(j=>j.customerApproved).length/jobs.length:0}%"></div></div><p>อนุมัติ ${jobs.filter(j=>j.customerApproved).length} จาก ${jobs.length} งาน (${Math.round(jobs.length?100*jobs.filter(j=>j.customerApproved).length/jobs.length:0)}%)</p></div><div class="editor-warn">${icon('info',17)} รายงานนี้ไม่เชื่อมต่อระบบ CRM, ฐานข้อมูล หรือข้อมูลพนักงานอื่น และไม่ใช่ยอดสั่งผลิตที่ยืนยันแล้ว</div></section></main>`;}
function help(){return `<main class="content-page"><div class="page-hero"><div><div class="eyebrow">USER GUIDE / SAFE PRODUCTION</div><h1>คู่มือและข้อกำหนดการใช้งาน</h1><p>สิ่งที่ Sales ต้องตรวจสอบทุกครั้งก่อนส่ง Artwork ให้ลูกค้าหรือโรงงาน</p></div></div><div class="panel help-panel"><h3>Artwork & Printing Notes</h3>${NOTICES.map((t,i)=>`<div class="help-row"><span>${i+1}</span><p>${e(t)}</p></div>`).join('')}<h3>Workflow ที่แนะนำ</h3><p>เลือกสินค้า → เลือกสีด้าม → ตั้งค่า 1–3 สีสกรีน → อัปโหลดโลโก้ SVG → Auto Fit / ปรับตำแหน่ง → Customer Proof → อนุมัติ Revision → Export SVG/Separation ZIP → ให้ Prepress ตรวจงาน</p><h3>ข้อจำกัดของ Pilot นี้</h3><p>ไม่มี Login, Cloud Database, การแชร์งานข้ามเครื่อง, การเชื่อมต่อ ERP, ลายเซ็นดิจิทัล หรือ Preflight ระดับโรงงาน การบันทึก Draft อยู่ใน LocalStorage ของเครื่องและเบราว์เซอร์ที่เปิดใช้งานเท่านั้น</p><p>ไฟล์ SVG จากระบบเป็นเวกเตอร์จริงหน่วยมิลลิเมตรสำหรับงานที่อัปโหลดเป็น SVG Path และผ่านเงื่อนไขในระบบ แต่การอ้างอิงชื่อ Spot Colour ยังคงอยู่ใน Manifest/สเปก ไม่ใช่ Spot Separation ใน PDF แบบ Native; โรงงานต้องตรวจและกำหนด Spot Colours ใหม่ก่อนผลิต</p><p>การสร้าง PDF ใช้คำสั่ง Print / Save as PDF ของเบราว์เซอร์ ตั้ง Scale = 100%, ปิด Fit to Page และตรวจวัดขนาดบนไฟล์ที่ได้</p><button class="outline-btn" data-action="go-view" data-view="editor">${icon('back',16)} กลับไป Artwork Studio</button></div></main>`;}
function draftText(t){
  const txt=String(t?.text||'');
  const em=Math.max(0,Math.min(.35,Number(t?.trackingEm)||0));
  const clusters=[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(txt)].length||1;
  return {sourceType:'text',name:'ข้อความยังไม่แปลงเป็นเส้น',text:txt,vector:false,aspect:Math.max(1,clusters*(.72+em)),palette:['#000000'],markup:null,notes:[]};
}
function updateText(j,field,value){
  j.textArtwork={...(j.textArtwork||{}),[field]:value,status:'not-generated',fontFileName:''};
  j.logo=draftText(j.textArtwork);j.savedTextOutline=null;
  changed(true);
}
function normalizePlacement(j){
  const p=position(j);
  j.offsetX=p.offsetX;j.offsetY=p.offsetY;
  if(p.parts.length===2)j.gapMm=p.gap;
}
function cleanArtworkAsset(asset){
  if(!asset)return null;
  if(asset.sourceType==='svg'||(asset.sourceType==='text'&&asset.vector)){
    const vb=String(asset.viewBox||'');
    if(!/^[0-9eE., +\-]+$/.test(vb))throw Error('SVG viewBox ไม่ถูกต้อง');
    const verified=parseSafeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${asset.markup||''}</svg>`);
    return {...asset,data:null,markup:verified.markup,viewBox:verified.viewBox,palette:verified.palette,aspect:verified.aspect,vector:true};
  }
  if(asset.sourceType==='raster'){
    if(!/^data:image\/(png|jpeg|webp);base64,/i.test(String(asset.data||'')))throw Error('Raster data ไม่ถูกต้อง');
    return {...asset,vector:false,markup:null};
  }
  if(asset.sourceType==='text')return {...asset,vector:false,markup:null,data:null};
  return newJob().logo;
}
function validateImportedJob(obj,retainId=false){
  if(!obj?.variants||!obj?.logo||typeof obj.id!=='string')throw Error('Project JSON ไม่ถูกต้อง');
  const copy=structuredClone(obj);
  copy.logo=cleanArtworkAsset(copy.logo);
  copy.savedLogo=cleanArtworkAsset(copy.savedLogo);
  copy.savedTextOutline=cleanArtworkAsset(copy.savedTextOutline);
  if(copy.productSpec){const p=copy.productSpec;if(!p.variants?.length||!Number.isFinite(+p.printWidthMm)||!Number.isFinite(+p.printHeightMm)||+p.printWidthMm<=0||+p.printHeightMm<=0)throw Error('Product Spec ไม่ถูกต้อง');}
  return {...newJob(),...copy,id:retainId?copy.id:newJob().id,status:retainId?copy.status:'Draft',customerApproved:retainId?copy.customerApproved:false,approvedAt:retainId?copy.approvedAt:null,ackNotes:retainId?copy.ackNotes:false};
}
async function resizeProductImage(file){
  if(file.size>5_000_000||!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('ภาพต้องเป็น PNG/JPEG/WebP และไม่เกิน 5MB');
  const source=URL.createObjectURL(file);
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('เปิดรูปไม่สำเร็จ'));i.src=source;});
  URL.revokeObjectURL(source);
  const ratio=3,targetW=1600,targetH=533;
  const cvs=document.createElement('canvas');cvs.width=targetW;cvs.height=targetH;
  const ctx=cvs.getContext('2d');
  // Preserve transparent background and fit the product without distortion.
  const scale=Math.min(targetW/img.naturalWidth,targetH/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;
  ctx.drawImage(img,(targetW-w)/2,(targetH-h)/2,w,h);
  return {data:cvs.toDataURL('image/webp',.82),sourceWidth:img.naturalWidth,sourceHeight:img.naturalHeight};
}
app.addEventListener('submit',async ev=>{
  if(ev.target.id!=='product-admin-form')return;ev.preventDefault();
  const form=ev.target,info=Object.fromEntries(new FormData(form)),fileList=[...(form.querySelector('#product-assets')?.files||[])];
  try{
    if(!fileList.length)throw Error('กรุณาแนบภาพสินค้าอย่างน้อย 1 สี');
    if(fileList.length>12)throw Error('Pilot รับรูปไม่เกิน 12 ไฟล์ต่อรุ่น');
    const brand=CATALOG_BRANDS.find(b=>b.name===info.brand),code=String(info.model||'').trim().replace(/[^a-zA-Z0-9_-]/g,'-');
    if(!brand||!code)throw Error('กรุณากำหนด Brand และ Model');
    const id=brand.code+'-'+code;
    if(productCatalog().some(p=>p.id===id))throw Error('มี Product ID นี้แล้ว');
    const variants=[];
    for(let i=0;i<fileList.length;i++){
      const f=fileList[i],variant=f.name.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'-').toLowerCase()||'color-'+(i+1);
      const image=await resizeProductImage(f);
      variants.push({id:variant+'-'+(i+1),name:variant,en:variant,swatch:['#37c5d9','#ed9fb8','#f1d551','#71c59d','#9d8cd2','#334155'][i%6],photo:image.data,fileName:proposedFilename(brand.code,code,variant),sourceImageSize:[image.sourceWidth,image.sourceHeight]});
    }
    const p={id,brand:brand.name,model:code,type:info.type||'ปากกา',nib:info.nib||'-',name:brand.name+' '+code,printProcess:'Silkscreen',lengthMm:+info.length,printWidthMm:+info.width,printHeightMm:+info.height,variants,verified:false,specVersion:1};
    saveProductMaster(p);render();notify('เพิ่ม '+brand.name+' / '+code+' ลง Product Master แล้ว (ยังไม่ยืนยันสเปกโรงงาน)');
  }catch(err){notify(err.message||'เพิ่มสินค้าไม่ได้',true);}
});
function render(){
  document.querySelectorAll('[data-studio-disclosure]').forEach(panel=>{
    if(panel.open)studioPanels.add(panel.dataset.studioDisclosure);
    else studioPanels.delete(panel.dataset.studioDisclosure);
  });
  app.innerHTML=`${header()}${view==='editor'?editor():view==='dashboard'?dashboard():view==='library'?library():view==='reports'?reports():help()}<div id="toast" role="status" aria-live="polite" class="toast"></div>`;}
function copyProject(j){downloadText(JSON.stringify({app:'SCCUSTOM',version:1,project:j},null,2),(j.id||'project')+'.json','application/json');}
function nextJob(){jobs.unshift(newJob());jobIndex=0;activateJobProduct(job());pendingBrand='';step=1;view='editor';persist();render();}
function afterCritical(){changed(true);render();}
app.addEventListener('click',async ev=>{
  const btn=ev.target.closest('[data-action]');if(!btn)return;
  ev.preventDefault();const action=btn.dataset.action,j=job();
  try{
    if(action==='go-view'){view=btn.dataset.view;render();return;}
    if(action==='goto-step'){
      step=Number(btn.dataset.step);render();
      if(step===3)document.querySelector('#studio-heading')?.focus();
      return;
    }
    if(action==='prev-step'){step=Math.max(1,step-1);render();return;}
    if(action==='next-step'){step=step===4?3:step+1;render();return;}
    if(action==='save'){const ok=persist();refreshStudioSave();if(ok)notify('บันทึกร่างในเบราว์เซอร์แล้ว');return;}
    if(action==='studio-view'){
      if(!['product','area'].includes(btn.dataset.value)||studioMode===btn.dataset.value)return;
      studioMode=btn.dataset.value;render();
      document.querySelector('[data-action="studio-view"][aria-pressed="true"]')?.focus({preventScroll:true});return;
    }
    if(action==='studio-variant'){
      if(!activeVariants(j).some(v=>v.id===btn.dataset.variant)||j.selectedVariant===btn.dataset.variant)return;
      j.selectedVariant=btn.dataset.variant;changed(false);render();
      document.querySelector('[data-action="studio-variant"][aria-pressed="true"]')?.focus({preventScroll:true});return;
    }
    if(action==='studio-review'){
      step=4;render();document.querySelector('#review-heading')?.focus();return;
    }
    if(action==='studio-resolve'){
      const target=btn.dataset.target;
      if(target==='variants'){step=2;render();document.querySelector('#variants-heading')?.focus();return;}
      if(!['studio-content','studio-profile','studio-design-review'].includes(target))return;
      const node=document.getElementById(target);
      if(node?.tagName==='DETAILS'){node.open=true;node.querySelector('summary')?.focus();}else node?.focus();
      node?.scrollIntoView({block:'center'});return;
    }
    if(action==='new-job'){nextJob();return;}
    if(action==='trigger-logo'){document.querySelector('#logo-file')?.click();return;}
    if(action==='import-job'){document.querySelector('#project-import')?.click();return;}
    if(action==='open-job'){jobIndex=Number(btn.dataset.id);activateJobProduct(job());pendingBrand='';step=2;view='editor';persist();render();return;}
    if(action==='duplicate-job'){const source=jobs[Number(btn.dataset.id)];const cloned=structuredClone(source);cloned.id=newJob().id;cloned.createdAt=new Date().toISOString();cloned.modifiedAt=cloned.createdAt;cloned.status='Draft';cloned.customerApproved=false;cloned.approvedAt=null;cloned.ackNotes=false;cloned.revision=1;jobs.unshift(cloned);jobIndex=0;activateJobProduct(job());persist();view='editor';step=1;render();notify('สร้างสำเนา Artwork แล้ว');return;}
    if(action==='delete-job'){if(jobs.length===1){notify('ต้องมีงานอย่างน้อย 1 งาน',true);return;}if(confirm('ลบงานนี้ออกจากเบราว์เซอร์หรือไม่?')){jobs.splice(Number(btn.dataset.id),1);jobIndex=0;activateJobProduct(job());persist();render();}return;}
    if(action==='export-job'){copyProject(jobs[Number(btn.dataset.id)]);return;}
    if(action==='artwork-mode'){
      const current=artworkMode(j),next=btn.dataset.value;
      if(current===next||!['logo','text','both'].includes(next))return;
      if(next==='logo'){
        j.savedTextOutline=j.logo.vector?j.logo:null;
        j.logo=j.savedLogo||newJob().logo;
      }else if(current==='logo'){
        j.savedLogo=j.logo;
        j.logo=j.savedTextOutline||draftText(j.textArtwork);
      }
      j.layoutMode=next;normalizePlacement(j);afterCritical();
      document.querySelector('[data-action="artwork-mode"][aria-pressed="true"]')?.focus({preventScroll:true});return;
    }
    if(action==='download-design-review'){
      j.designReview={...j.designReview,status:'pending',requestedAt:new Date().toISOString()};
      changed(false);exportDesignReview(j);render();notify('ดาวน์โหลด ZIP แล้ว กรุณาส่งไฟล์ให้ทีม Design');return;
    }
    if(action==='record-design-response'){
      if(j.designReview?.status!=='pending')return;
      j.designReview={...j.designReview,status:'recorded',recordedAt:new Date().toISOString()};
      changed(false);render();notify('บันทึกว่าได้รับผลตรวจแล้ว');return;
    }
    if(action==='outline-font'){const t=j.textArtwork||{};if(!t.text?.trim())throw Error('กรุณาพิมพ์ข้อความก่อน');document.querySelector('#outline-font-file')?.click();return;}
    if(action==='use-catalog'){const p=productCatalog().find(x=>x.id===btn.dataset.productId);if(!p)throw Error('ไม่พบรุ่นนี้');applyProductToJob(j,p);pendingBrand='';step=1;view='editor';changed(false);render();return;}
    if(action==='catalog-export'){downloadText(JSON.stringify({app:'SCCUSTOM-CATALOG',version:2,products:productCatalog().slice(1)},null,2),'SCCUSTOM-Product-Catalog.json','application/json');return;}
    if(action==='catalog-import'){document.querySelector('#catalog-import-file')?.click();return;}
    if(action==='save-client'){setClientId(document.querySelector('#google-client-id')?.value);render();notify('บันทึก Google OAuth Client ID แล้ว');return;}
    if(action==='drive-connect'){await connectDrive();render();notify('เชื่อม Google Drive สำเร็จ');return;}
    if(action==='drive-disconnect'){disconnectDrive();cloudJobs=[];render();return;}
    if(action==='drive-save'){const result=await saveJobToDrive(j);notify('บันทึกงานใน Google Drive แล้ว: '+result.id);return;}
    if(action==='drive-list'){cloudJobs=await listDriveJobs();render();notify('พบ '+cloudJobs.length+' งานบน Google Drive');return;}
    if(action==='drive-open'){const res=await fetchDriveJob(btn.dataset.fileId);const imported=validateImportedJob(res.project,true);const idx=jobs.findIndex(x=>x.id===imported.id);if(idx>=0)jobs[idx]=imported;else jobs.unshift(imported);jobIndex=idx>=0?idx:0;activateJobProduct(job());view='editor';step=2;persist();render();notify('เปิดงานจาก Google Drive แล้ว');return;}
    if(action==='preview-mode'){previewMode=btn.dataset.value;render();return;}
    if(action==='zoom-minus'){zoom=Math.max(50,zoom-25);render();return;}
    if(action==='zoom-plus'){zoom=Math.min(200,zoom+25);render();return;}
    if(action==='focus-variant'){j.selectedVariant=btn.dataset.variant;changed(false);render();return;}
    if(action==='ink-count'){j.inkCount=Number(btn.dataset.count);afterCritical();return;}
    if(action==='edit-variant'){j.editingVariant=j.editingVariant===btn.dataset.variant?null:btn.dataset.variant;render();return;}
    if(action==='reset-position'){j.offsetX=0;j.offsetY=0;afterCritical();return;}
    if(action==='proof'){openPdfPrint(j,'proof');return;}
    if(action==='prod-pdf'){openPdfPrint(j,'production');return;}
    if(action==='prod-svg'||action==='prod-zip'){
      if(!canExportProduction(j)){step=4;render();notify('ยังไม่ผ่านเงื่อนไข Production Export กรุณาตรวจสอบรายการด้านบน',true);return;}
      if(action==='prod-svg')exportSvg(j);else exportProductionZip(j);
      notify('ดาวน์โหลดไฟล์สำหรับ Prepress Review แล้ว (ยังต้องตรวจโรงงาน)');return;
    }
  }catch(err){console.error(err);notify(err.message||'ไม่สามารถทำรายการได้',true);}
});
app.addEventListener('input',ev=>{
  const t=ev.target,j=job();
  if(t.matches('[data-field]')){j[t.dataset.field]=t.value;changed(false);return;}
  if(t.matches('[data-text-value]')){updateText(j,'text',t.value);updateLive();return;}
  if(t.matches('[data-review-note]')){j.designReview={...j.designReview,note:t.value.slice(0,500)};changed(false);return;}
  if(t.matches('[data-range-fit]')){
    j.fit=Number(t.value);normalizePlacement(j);changed(true);
    const label=document.querySelector('[data-fit-value]');if(label)label.textContent=j.fit+'%';
    updateLive();return;
  }
});
app.addEventListener('change',async ev=>{
  const t=ev.target,j=job();
  try{
    if(t.matches('[data-brand]')){
      if(t.disabled||!brandLogos.get(t.value)||j.brandId===t.value)return;
      const focused=document.activeElement===t;
      const scrollTop=document.querySelector('.sidebar')?.scrollTop;
      j.brandId=t.value;
      afterCritical();
      const sidebar=document.querySelector('.sidebar');
      if(sidebar&&scrollTop!=null)sidebar.scrollTop=scrollTop;
      if(focused)document.querySelector('#template-brand')?.focus({preventScroll:true});
      return;
    }
    if(t.matches('[data-product-brand]')){pendingBrand=t.value;render();return;}
    if(t.matches('[data-product]')){const p=productCatalog().find(p=>p.id===t.value);if(p){applyProductToJob(j,p);pendingBrand='';changed(false);render();}return;}
    if(t.matches('[data-print-location]')){
      if(t.value!=='barrel'&&!profilesFor(PRODUCT).some(p=>p.locationId===t.value))return;
      j.printLocationId=t.value;j.offsetX=0;j.offsetY=0;normalizePlacement(j);afterCritical();return;
    }
    if(t.matches('[data-part-gap]')){j.gapMm=Number(t.value);normalizePlacement(j);afterCritical();return;}
    if(t.matches('[data-text-height]')){j.textHeightPct=Math.max(30,Math.min(150,Number(t.value)||75));normalizePlacement(j);afterCritical();return;}
    if(t.matches('[data-text-side]')){j.textSide=t.value==='left'?'left':'right';afterCritical();return;}
    if(t.matches('[data-tracking]')){updateText(j,'trackingEm',Math.max(0,Math.min(35,Number(t.value)||0))/100);normalizePlacement(j);render();return;}
    if(t.matches('[data-font-family]')){updateText(j,'family',t.value);afterCritical();return;}
    if(t.matches('[data-font-weight]')){updateText(j,'weight',t.value);afterCritical();return;}
    if(t.matches('#outline-font-file')){
      const file=t.files?.[0];if(!file)return;
      notify('กำลังแปลงข้อความเป็น Vector Paths…');
      const spec=j.textArtwork;
      const result=await convertTextToOutlines(file,spec?.text||'',spec?.trackingEm||0);
      if(job()!==j||j.textArtwork!==spec||artworkMode(j)==='logo')return;
      j.logo=result;j.textArtwork={...spec,fontFileName:result.fontFileName,status:'outlined'};
      normalizePlacement(j);afterCritical();notify('แปลงเป็นเส้นแล้ว กรุณาตรวจสระ วรรณยุกต์ และรายละเอียดที่ขนาดจริง');return;
    }
    if(t.matches('#catalog-import-file')){
      const f=t.files?.[0];if(!f)return;if(f.size>5_000_000)throw Error('Catalog ใหญ่เกิน 5 MB');
      const data=JSON.parse(await f.text());if(data.app!=='SCCUSTOM-CATALOG'||!Array.isArray(data.products))throw Error('ไม่ใช่ Catalog SCCUSTOM');
      data.products.forEach(p=>{if(!CATALOG_BRANDS.some(b=>b.name===p.brand)||!p.variants?.length||!Number.isFinite(+p.printWidthMm)||!Number.isFinite(+p.printHeightMm))throw Error('Product Master บางรายการไม่ถูกต้อง');saveProductMaster(p);});
      render();notify('นำเข้า Catalog '+data.products.length+' รุ่นแล้ว');return;
    }
    if(t.matches('#logo-file')){
      const f=t.files?.[0];if(!f)return;
      const mode=artworkMode(j);
      const logo=await processLogo(f);
      if(job()!==j||artworkMode(j)!==mode)return;
      if(mode==='both')j.savedLogo=logo;else if(mode==='logo')j.logo=logo;else return;
      normalizePlacement(j);afterCritical();notify('อัปโหลดโลโก้แล้ว: '+f.name);return;
    }
    if(t.matches('#project-import')){
      const f=t.files?.[0];if(!f)return;
      if(f.size>2_500_000)throw Error('Project JSON มีขนาดเกิน 2.5 MB');
      const file=JSON.parse(await f.text());const obj=validateImportedJob(file.project,false);
      jobs.unshift({...newJob(),...obj,id:newJob().id,status:'Draft',customerApproved:false,approvedAt:null,ackNotes:false});jobIndex=0;activateJobProduct(job());persist();view='editor';step=1;render();notify('Import Project สำเร็จ (สถานะอนุมัติถูกรีเซ็ต)');return;
    }
    if(t.matches('[name="inkmode"]')){j.sameInk=t.value==='same';afterCritical();return;}
    if(t.matches('[data-variant-toggle]')){j.variants[t.dataset.variantToggle].enabled=t.checked;afterCritical();return;}
    if(t.matches('#select-all-variants')){Object.values(j.variants).forEach(v=>v.enabled=t.checked);afterCritical();return;}
    if(t.matches('[data-qty]')){j.variants[t.dataset.qty].qty=Math.max(0,Math.floor(Number(t.value)||0));afterCritical();return;}
    if(t.matches('[data-shared-ink]')){j.sharedInks[Number(t.dataset.sharedInk)]=t.value;afterCritical();return;}
    if(t.matches('[data-variant-ink]')){j.variants[t.dataset.variantInk].inks[Number(t.dataset.inkIndex)]=t.value;afterCritical();return;}
    if(t.matches('[data-offset]')){j[t.dataset.offset]=Number(t.value)||0;normalizePlacement(j);afterCritical();return;}
    if(t.matches('[data-focus-select]')){j.selectedVariant=t.value;changed(false);render();return;}
    if(t.matches('[data-ack]')){j.ackNotes=t.checked;changed(false);render();return;}
    if(t.matches('[data-approved]')){if(t.checked&&!j.ackNotes){notify('กรุณาอ่านและรับทราบข้อควรระวังก่อนบันทึกการอนุมัติ',true);render();return;}j.customerApproved=t.checked;j.approvalLayoutKey=t.checked?layoutFingerprint(j,PRODUCT):null;j.approvedAt=t.checked?new Date().toISOString():null;j.status=t.checked?'Approved':'Draft';changed(false);render();return;}
  }catch(err){console.error(err);notify(err.message||'อ่านไฟล์ไม่สำเร็จ',true);render();}
});
function refreshStudioSave(){const saved=document.querySelector('[data-studio-save]');if(saved)saved.textContent=studioSaveLabel();}
function updateLive(){
  const j=job();let found=activeVariants(j).find(v=>v.id===j.selectedVariant)||activeVariants(j)[0]||PRODUCT.variants[0];if(!found)return;
  refreshStudioSave();
  const stageStatus=document.querySelector('[data-studio-status]');
  if(stageStatus){const html=studioStatusMarkup(j);if(stageStatus.dataset.liveMarkup!==html){stageStatus.dataset.liveMarkup=html;stageStatus.innerHTML=html;}}
  const board=document.querySelector('#artboard-image');if(board)board.src=svgDataUri(artworkSvg(j,found.id,-1,{guides:true}));
  const mark=document.querySelector('.large-product .pen-mark');if(mark)mark.src=svgDataUri(artworkSvg(j,found.id));
  const p=position(j);
  document.querySelectorAll('[data-composition-size]').forEach(el=>{el.textContent=p.width.toFixed(2)+' × '+p.height.toFixed(2)+' มม.';});
  document.querySelectorAll('[data-offset]').forEach(el=>{el.value=el.dataset.offset==='offsetX'?p.offsetX:p.offsetY;});
  const status=document.querySelector('[data-outline-status]');
  if(status&&j.logo.sourceType==='text'&&!j.logo.vector)status.textContent='ยังไม่แปลงเป็นเส้น · ใช้ดูตัวอย่างเท่านั้น';
  const sample=document.querySelector('.font-sample');if(sample)sample.textContent=j.textArtwork?.text||'ข้อความตัวอย่าง SCCUSTOM 2026';
}
let drag=null;
app.addEventListener('pointerdown',ev=>{
  const area=ev.target.closest('[data-drag-area]');if(!area||!job().logo||ev.button!==0)return;
  const rect=area.getBoundingClientRect(),p=position(job());drag={id:ev.pointerId,startX:ev.clientX,startY:ev.clientY,ox:p.offsetX,oy:p.offsetY,width:rect.width,height:rect.height,outerWidth:p.safe.outerWidth,outerHeight:p.safe.outerHeight,area};
  area.setPointerCapture(ev.pointerId);area.classList.add('is-dragging');ev.preventDefault();
});
app.addEventListener('pointermove',ev=>{
  if(!drag||drag.id!==ev.pointerId)return;
  const j=job();j.offsetX=roundMm(drag.ox+(ev.clientX-drag.startX)/Math.max(1,drag.width)*drag.outerWidth);
  j.offsetY=roundMm(drag.oy+(ev.clientY-drag.startY)/Math.max(1,drag.height)*drag.outerHeight);
  updateLive();
});
app.addEventListener('pointerup',ev=>{if(!drag||drag.id!==ev.pointerId)return;drag.area.classList.remove('is-dragging');drag=null;normalizePlacement(job());afterCritical();});
app.addEventListener('pointercancel',ev=>{if(!drag||drag.id!==ev.pointerId)return;job().offsetX=drag.ox;job().offsetY=drag.oy;drag.area.classList.remove('is-dragging');drag=null;updateLive();});
await brandLogos.initialize(document.baseURI);
render();
