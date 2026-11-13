import {PRODUCT,BRANDS,INKS,NOTICES,newJob,activeVariants,variantInks,ink,position,logoSize,escapeHtml,relFile,CATALOG_BRANDS,productCatalog,saveProductMaster,applyProductToJob,activateJobProduct,proposedFilename} from './data.js';
import {convertTextToOutlines} from './text-outline.js';
import {getClientId,setClientId,driveConnected,connectDrive,disconnectDrive,saveJobToDrive,listDriveJobs,fetchDriveJob} from './drive-sync.js';
import {artworkSvg,svgDataUri,processLogo,parseSafeSvg,fileFromInput} from './vector.js';
import {preflight,canExportProduction,downloadText,exportSvg,exportProductionZip,openPdfPrint} from './exporter.js';

const STORE='sccustom-artwork-studio-v1';
const app=document.querySelector('#app');
let jobs=[],jobIndex=0,view='editor',step=2,previewMode='all',zoom=100,toastTimer=0;
function persist(){
  try{localStorage.setItem(STORE,JSON.stringify({jobs,jobIndex}));return true;}
  catch(err){notify('พื้นที่เก็บข้อมูลเบราว์เซอร์เต็ม กรุณา Export Project JSON สำรอง',true);return false;}
}
try{
  const stored=JSON.parse(localStorage.getItem(STORE)||'null');
  if(stored?.jobs?.length&&Array.isArray(stored.jobs)){jobs=stored.jobs;jobIndex=Math.min(Math.max(0,stored.jobIndex||0),jobs.length-1);}
}catch(e){console.warn('Saved state could not be opened',e);}
if(!jobs.length){jobs=[newJob()];jobIndex=0;persist();}
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
function invalidate(){const j=job();if(j.customerApproved){j.customerApproved=false;j.approvedAt=null;j.ackNotes=false;j.revision++;j.status='Draft';notify('Artwork เปลี่ยนแปลง: ยกเลิกการอนุมัติและเพิ่ม Revision แล้ว');}}
function changed(critical=true){if(critical)invalidate();job().modifiedAt=new Date().toISOString();persist();}
function currentInkNames(v){return variantInks(job(),v.id).map(id=>ink(id).short).join(' + ');}
function header(){return `<header class="topbar"><a class="app-logo" href="#" data-action="go-view" data-view="editor" title="SCCUSTOM Smart Artwork Studio"><span>SC<span class="emphasis">CUSTOM</span></span><i></i></a><div class="top-divider"></div><div class="app-title"><b>Smart Artwork Studio</b><small>ระบบสร้างและจัดการ Artwork สินค้าพรีเมียม</small></div><nav class="topnav" aria-label="Primary"><button data-action="go-view" data-view="editor" class="${view==='editor'?'nav-active':''}">${icon('pen',16)} สร้าง Artwork</button><button data-action="go-view" data-view="dashboard" class="${view==='dashboard'?'nav-active':''}">${icon('file',16)} งานของฉัน</button><button data-action="go-view" data-view="library" class="${view==='library'?'nav-active':''}">${icon('bag',16)} คลังสินค้า / Admin</button><button data-action="go-view" data-view="reports" class="${view==='reports'?'nav-active':''}">${icon('chart',16)} รายงาน</button></nav><div class="top-actions"><button class="icon-btn" aria-label="Help" data-action="go-view" data-view="help">${icon('help',20)}</button><span class="avatar">S</span><b>Sales01</b></div></header>`;}
function brandLogoSmall(b){if(b.kind==='image')return `<img alt="" src="${relFile(b.logo)}">`;if(b.id==='custom'&&job().customBrandLogo)return `<img alt="" src="${e(job().customBrandLogo)}">`;return `<span class="brandtype ${b.id}">${e(b.name)}</span>`;}
function sidebar(){const j=job(),steps=[['เลือกสินค้า',PRODUCT.brand+' / '+PRODUCT.model],['ตั้งค่าสีและรูปแบบ','คละสี 6 ด้าม / สีสกรีน'],['อัปโหลดและจัดวางโลโก้','ขนาดและตำแหน่งงานพิมพ์'],['ตรวจสอบและส่งออก','Proof / ไฟล์ผลิต']];return `<aside class="sidebar"><div class="side-head"><h3>ขั้นตอนการสร้าง Artwork</h3><p>Guided production workflow</p></div><div class="step-list">${steps.map(([t,sub],i)=>`<button class="step ${step===i+1?'active':''}" data-action="goto-step" data-step="${i+1}"><span class="step-number ${i+1<step?'done':''}">${i+1<step?icon('check',15):i+1}</span><span class="step-titles"><strong>${e(t)}</strong><small>${e(sub)}</small></span></button>`).join('')}</div><div class="sidebar-subtitle">โลโก้แบรนด์บน Template <span class="required">*</span></div><p class="sidebar-tip">เปลี่ยนเฉพาะโลโก้ส่วนหัวเอกสาร ไม่เปลี่ยน Artwork หรือภาพสินค้า</p><div class="brand-list">${BRANDS.map(b=>`<label class="brand-option ${j.brandId===b.id?'selected':''}"><input type="radio" name="brand" value="${b.id}" data-brand="1" ${j.brandId===b.id?'checked':''}/><span class="brand-art">${brandLogoSmall(b)}</span><span>${e(b.name)}</span></label>`).join('')}<button class="side-mini-btn" data-action="trigger-brand">${icon('upload',15)} อัปโหลด Brand Logo</button><input hidden id="brand-file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"/></div><div class="tip-card"><div class="tip-card-title">${icon('info',18)} ข้อควรระวัง</div><p>${NOTICES[0]}</p><p>${NOTICES[1]}</p><p>งานพิมพ์รองรับสูงสุด 3 สี</p><button class="text-link" data-action="go-view" data-view="help">ดูข้อกำหนดทั้งหมด ${icon('arrow',14)}</button></div></aside>`;}
function jobTop(){const j=job();return `<div class="workspace-heading"><div><div class="eyebrow">SCCUSTOM / ARTWORK WORKSPACE</div><h1>${step===1?'เลือกสินค้าและข้อมูลงาน':step===2?'ตั้งค่าสีและรูปแบบสินค้า':step===3?'อัปโหลดและจัดวางโลโก้':'ตรวจสอบ Artwork และส่งออก'}</h1><p>${step===1?'กำหนดข้อมูลลูกค้าและสินค้าเพื่อเริ่มสร้างแบบ':step===2?'กำหนดสีด้าม จำนวน และสีสกรีนสำหรับงานนี้':step===3?'จัดวางโลโก้ให้อยู่ภายในพื้นที่พิมพ์จริง': 'ตรวจแบบและสร้างเอกสารจาก Template เดียวกัน'}</p></div><div class="heading-actions"><span class="job-code">Job: ${e(j.id)}</span>${pill(j.status,j.customerApproved?'success':'warning')}<button class="outline-btn" data-action="save">${icon('save',16)} บันทึกร่าง</button></div></div>`;}
function productStrip(){return `<div class="product-strip"><img src="${relFile(PRODUCT.variants[0]?.photo||'assets/pen-sky.webp')}" alt="Product preview"><div class="prod-identity"><strong>${e(PRODUCT.brand)}</strong><span>รุ่น : ${e(PRODUCT.model)}</span></div><div><small>ประเภท</small><strong>${e(PRODUCT.type)}</strong><span>หัวปากกา : ${e(PRODUCT.nib)}</span></div><div><small>พื้นที่พิมพ์ (Print Area)</small><strong>${PRODUCT.printWidthMm} × ${PRODUCT.printHeightMm} mm</strong></div><div><small>ความยาวด้าม</small><strong>${PRODUCT.lengthMm} mm</strong></div><div><small>กระบวนการพิมพ์</small><strong>Silkscreen</strong><span>1–3 Colours</span></div></div>`;}
function pen(v,small=false){const j=job();return `<div class="pen-preview ${small?'mini':''}" role="img" aria-label="ภาพจำลองปากกาสี ${e(v.name)} กับโลโก้ที่วาง"><img class="pen-photo" src="${relFile(v.photo)}" alt=""><img class="pen-mark" src="${svgDataUri(artworkSvg(j,v.id))}" alt=""></div>`;}
function actualArtwork(vId){let j=job();const p=position(j);return `<div class="actual-art-card"><div class="section-mini">พื้นที่งานพิมพ์ <span>Artwork (mm)</span></div><div class="measure-width"><span></span><b>${PRODUCT.printWidthMm} mm</b><span></span></div><div class="artboard-frame" data-drag-area="1" title="ลากเพื่อเลื่อนตำแหน่งโลโก้" style="--zo:${zoom/100}"><img id="artboard-image" src="${svgDataUri(artworkSvg(j,vId,-1,{guides:true}))}" alt="Actual size vector preview" draggable="false"></div><div class="measure-bottom"><span>HEIGHT ${PRODUCT.printHeightMm} mm</span><span>LOGO ${p.width.toFixed(2)} × ${p.height.toFixed(2)} mm</span></div><p class="tiny-info">ขนาดบนหน้าจอไม่ใช่มาตราส่วน 1:1 — ใช้ค่ามิลลิเมตรและไฟล์ Export เท่านั้น</p></div>`;}
function allPens(){const a=activeVariants(job());return `<div class="pens-list">${a.length?a.map(v=>`<button class="pen-list-item ${job().selectedVariant===v.id?'focused':''}" data-action="focus-variant" data-variant="${v.id}">${pen(v)}<span>${e(v.en)} · ${e(currentInkNames(v))}</span></button>`).join(''):'<div class="empty-state">ยังไม่ได้เลือกสีด้าม</div>'}</div>`;}
function photoPanel(){const j=job(),a=activeVariants(j),focused=a.find(v=>v.id===j.selectedVariant)||a[0]||PRODUCT.variants[0];return `<section class="preview-card panel"><div class="preview-toolbar"><div class="tab-group"><button class="${previewMode==='all'?'on':''}" data-action="preview-mode" data-value="all">${icon('dashboard',16)} ตัวอย่างรวม (${a.length} สี)</button><button class="${previewMode==='single'?'on':''}" data-action="preview-mode" data-value="single">${icon('bag',16)} ดูทีละสี</button><button class="${previewMode==='actual'?'on':''}" data-action="preview-mode" data-value="actual">${icon('ruler',16)} พื้นที่พิมพ์ (1:1)</button></div><div class="zoom-tools"><button data-action="zoom-minus" aria-label="Zoom out">−</button><span>${zoom}%</span><button data-action="zoom-plus" aria-label="Zoom in">+</button></div></div><div class="preview-body ${previewMode}"><div class="product-stage">${previewMode==='all'?allPens():previewMode==='single'?`<div class="single-pen">${pen(focused)}<p>สีด้าม: ${e(focused.name)} / สีสกรีน: ${e(currentInkNames(focused))}</p></div>`:`<div class="actual-large">${actualArtwork(focused.id)}</div>`}</div><div class="technical-rail">${previewMode==='actual'?`<div class="tech-note"><b>Drag to Position</b><p>สามารถลากตำแหน่งโลโก้ภายใน Print Area ได้</p></div>`:actualArtwork(focused.id)}<div class="art-data"><h4>ข้อมูล Artwork</h4><div><span>ขนาดโลโก้ (กว้าง × สูง)</span><b>${position(j).width.toFixed(2)} × ${position(j).height.toFixed(2)} mm</b></div><div><span>จำนวนสีสกรีน</span><b>${j.inkCount} สี</b></div><div><span>สีสกรีน (${e(focused.en)})</span><span class="ink-dots">${variantInks(j,focused.id).map(x=>`<i style="background:${ink(x).hex}" title="${e(ink(x).name)}"></i>`).join('')}</span></div><div class="good-status">${icon('check',17)} อยู่ภายในพื้นที่พิมพ์ที่ตั้งค่า</div></div></div></div></section>`;}
function variantRow(v){const j=job(),p=j.variants[v.id],enabled=p.enabled,inks=variantInks(j,v.id),isCustom=!j.sameInk;return `<div class="variant-row ${enabled?'':'off'}"><label class="variant-name"><input type="checkbox" data-variant-toggle="${v.id}" ${enabled?'checked':''}/><span class="swatch" style="background:${v.swatch}"></span><span>${e(v.name)} <small>(${e(v.en)})</small></span></label><div class="variant-inks">${inks.map(id=>`<span class="mini-ink" title="${e(ink(id).name)}" style="background:${ink(id).hex}"></span>`).join('')}<span class="ink-caption">${e(inks.map(x=>ink(x).short).join(' / '))}</span>${isCustom?`<button class="mini-edit" data-action="edit-variant" data-variant="${v.id}">แก้ไข</button>`:''}</div><input type="number" min="0" max="999999" step="1" data-qty="${v.id}" value="${Number(p.qty)||0}" ${!enabled?'disabled':''} aria-label="จำนวน ${e(v.name)}"/></div>${j.editingVariant===v.id&&isCustom?`<div class="variant-custom-config">${Array.from({length:j.inkCount},(_,i)=>`<label>Ink ${i+1} ${select(inkOptions(),p.inks[i],`data-variant-ink="${v.id}" data-ink-index="${i}"`)}</label>`).join('')}</div>`:''}`;}
function variantsPanel(){const j=job(),a=activeVariants(j),qty=a.reduce((s,v)=>s+(Number(j.variants[v.id].qty)||0),0);return `<section class="variant-card panel"><div class="card-title-row"><h3>จัดการสีด้าม <span>(Colour Variants)</span></h3>${pill(`คละสี ${a.length} ด้าม`,'blue')}</div><div class="mode-options"><label class="mode-choice ${j.sameInk?'chosen':''}"><input type="radio" name="inkmode" value="same" ${j.sameInk?'checked':''}/><div><b>ใช้ Artwork / สีสกรีนเดียวกัน</b><small>แชร์ขนาด ตำแหน่ง และสีหมึก</small></div></label><label class="mode-choice ${!j.sameInk?'chosen':''}"><input type="radio" name="inkmode" value="custom" ${!j.sameInk?'checked':''}/><div><b>กำหนดสีสกรีนแต่ละด้าม</b><small>เปลี่ยนเฉด Ink ต่อสีด้าม</small></div></label></div><div class="ink-settings"><div class="inline-head"><b>จำนวนสีพิมพ์</b><div class="segments">${[1,2,3].map(n=>`<button data-action="ink-count" data-count="${n}" class="${n===j.inkCount?'active':''}">${n} สี</button>`).join('')}</div></div>${j.sameInk?`<div class="shared-ink-list">${Array.from({length:j.inkCount},(_,i)=>`<label>Ink ${i+1} ${select(inkOptions(),j.sharedInks[i],`data-shared-ink="${i}"`)}</label>`).join('')}</div>`:`<p class="inline-help">กด “แก้ไข” ในรายการสีด้ามเพื่อกำหนดสีหมึก 1–${j.inkCount} รายการสำหรับแต่ละสี</p>`}</div><div class="variant-header"><span><label><input type="checkbox" id="select-all-variants" ${a.length===PRODUCT.variants.length?'checked':''}> สีด้าม (Barrel)</label></span><span>สีสกรีน (Ink)</span><span>จำนวน</span></div><div class="variants-scroll">${PRODUCT.variants.map(variantRow).join('')}</div><div class="variant-total"><span>รวมจำนวน</span><strong>${qty.toLocaleString('en-US')} ด้าม</strong></div><div class="small-footnote">สีตัวสินค้าเป็นภาพจำลองสำหรับทดสอบ UX ไม่ใช่รหัสสี SKU ที่ยืนยัน</div></section>`;}
function templatePreview(){const b=BRANDS.find(b=>b.id===job().brandId)||BRANDS[0];return `<section class="template-preview panel"><div class="template-header"><span>ตัวอย่างเอกสาร <small>(Live Template Preview)</small></span><span class="muted-sm">เปลี่ยนเฉพาะ Logo Brand บนหัวเอกสาร</span></div><div class="paper-mini"><div class="paper-brand">${brandLogoSmall(b)}</div><div class="paper-name"><strong>ARTWORK FOR SILKSCREEN</strong><small>Customer Name : ${e(job().customer||'...................................')}</small><small>Representative : ${e(job().representative||'........................')}</small></div></div><div class="export-buttons"><button data-action="proof" class="export-item"><span class="file-icon pdf">PDF</span><span><b>Customer Proof</b><small>ตัวอย่างแบบสำหรับลูกค้า</small></span>${icon('open',17)}</button><button data-action="prod-pdf" class="export-item"><span class="file-icon pdf">PDF</span><span><b>Production Spec</b><small>รายละเอียดสั่งผลิต</small></span>${icon('open',17)}</button><button data-action="prod-svg" class="export-item"><span class="file-icon svg">SVG</span><span><b>Artwork SVG</b><small>เวกเตอร์ขนาดจริง</small></span>${icon('download',17)}</button><button data-action="prod-zip" class="export-item"><span class="file-icon zip">ZIP</span><span><b>Production ZIP</b><small>SVG แยกกลุ่มหมึก/สี</small></span>${icon('download',17)}</button></div></section>`;}
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

function textEditorControls(j){const t=j.textArtwork||{};
  return `<div class="text-editor">
    <label class="control-label">ข้อความที่จะพิมพ์<textarea rows="2" maxlength="120" data-text-value="1" placeholder="พิมพ์ข้อความไทยหรืออังกฤษ">${e(t.text||'')}</textarea></label>
    <div class="two-inputs"><label>ฟอนต์ตัวอย่าง${select(FONTS.map(f=>({value:f,label:f})),t.family||'Prompt','data-font-family="1"')}</label><label>น้ำหนัก${select([{value:'400',label:'Regular'},{value:'500',label:'Medium'},{value:'700',label:'Bold'}],t.weight||'700','data-font-weight="1"')}</label></div>
    <div class="font-sample" style="font-family:'${e(t.family||'Prompt')}',sans-serif;font-weight:${+t.weight||700}">${e(t.text||'ข้อความตัวอย่าง SCCUSTOM 2026')}</div>
    <div class="font-notice">ฟอนต์ใน Dropdown สำหรับดูตัวอย่างเท่านั้น การสร้าง Outlines ต้องเลือกไฟล์ TTF/OTF ที่มีสิทธิ์ใช้งานจริง และตรวจสอบวรรณยุกต์ภาษาไทยก่อนส่งผลิต</div>
    <input id="outline-font-file" type="file" accept=".ttf,.otf,font/ttf,font/otf" hidden/>
    <button class="primary-btn full" data-action="outline-font">${icon('pen',16)} แปลงข้อความเป็น Vector Paths</button>
    <p class="small-footnote">${j.logo.vector?'✓ แปลงเป็น Path แล้ว: '+e(t.fontFileName||'font'):'ยังไม่ใช่ Production Vector — Preview เท่านั้น'} · ไม่มีไฟล์ฟอนต์ถูกเก็บใน Project</p>
  </div>`;
}
function logoEditor(){const j=job(),p=position(j),uploaded=j.logo.sourceType!=='demo';const a=activeVariants(j),focused=a.find(v=>v.id===j.selectedVariant)||a[0]||PRODUCT.variants[0];return `<section class="logo-editor-grid"><div class="panel logo-control"><div class="card-title-row"><h3>Upload & Configure Artwork</h3>${pill(j.logo.vector?'Vector SVG':j.logo.sourceType==='raster'?'Raster: Proof only':'Sample only',j.logo.vector?'success':'warning')}</div><div class="artwork-choice"><button class="${j.logo.sourceType==='text'?'active':''}" data-action="artwork-mode" data-value="text">พิมพ์ข้อความ</button><button class="${j.logo.sourceType!=='text'?'active':''}" data-action="artwork-mode" data-value="logo">อัปโหลดโลโก้</button></div>
${j.logo.sourceType==='text'?textEditorControls(j):`<button class="upload-zone" data-action="trigger-logo">${icon('upload',27)}<b>${uploaded?'เปลี่ยนไฟล์โลโก้':'อัปโหลดโลโก้ของลูกค้า'}</b><small>SVG (Vector), PNG, JPG / ไม่เกิน 2.5 MB</small></button><input hidden type="file" id="logo-file" accept="image/svg+xml,.svg,image/png,image/jpeg,image/webp"/>`}
<div class="logo-file-name">${icon('file',16)} ${e(j.logo.name)}</div><div class="control-groups"><label class="control-label">ขนาดโลโก้ <strong>${p.width.toFixed(2)} × ${p.height.toFixed(2)} mm</strong></label><input type="range" min="10" max="100" step="1" data-range-fit="1" value="${j.fit}"/><div class="range-ends"><span>10%</span><span>Fit ${j.fit}%</span><span>100%</span></div><div class="two-inputs"><label>Offset X (mm)<input type="number" step="0.1" data-offset="offsetX" value="${j.offsetX}"/></label><label>Offset Y (mm)<input type="number" step="0.1" data-offset="offsetY" value="${j.offsetY}"/></label></div><button class="outline-btn full" data-action="reset-position">${icon('rotate',16)} Auto Center / Reset</button><div class="editor-warn">${icon('info',16)} โลโก้จะถูกจำกัดให้อยู่ภายใน Print Area และรักษาอัตราส่วนเดิมเสมอ</div></div></div><div class="panel logo-preview"><div class="card-title-row"><h3>Live Artwork Preview</h3>${pill(focused.en,'blue')}</div><div class="large-product">${pen(focused)}</div>${actualArtwork(focused.id)}<div class="variant-focus"><span>เลือกสีด้ามที่ต้องการดู</span>${select(a.map(v=>({value:v.id,label:v.name+' / '+v.en})),focused.id,'data-focus-select="1"')}</div></div></section>`;}
function proofStep(){const j=job(),issues=preflight(j),a=activeVariants(j);return `<div class="review-grid"><section class="panel approval-panel"><div class="card-title-row"><h3>ตรวจสอบ Artwork (Preflight)</h3>${pill(issues.some(x=>x.level==='block')?'Action Required':issues.length?'Warnings':'Ready',issues.some(x=>x.level==='block')?'danger':issues.length?'warning':'success')}</div><div class="checks"><div class="check-line pass">${icon('check',16)} ขนาดโลโก้: ${position(j).width.toFixed(2)} × ${position(j).height.toFixed(2)} mm / ขอบเขต ${PRODUCT.printWidthMm} × ${PRODUCT.printHeightMm} mm</div><div class="check-line pass">${icon('check',16)} จำนวนสีพิมพ์ ${j.inkCount} สี (สูงสุด 3)</div><div class="check-line pass">${icon('check',16)} เลือกสีด้าม ${a.length} สี</div>${issues.map(i=>`<div class="check-line ${i.level==='block'?'block':'warn'}">${icon('alert',16)} ${e(i.text)}</div>`).join('')}</div><div class="approval-box"><label><input type="checkbox" data-ack="1" ${j.ackNotes?'checked':''}> อ่านและรับทราบข้อควรระวังทั้งหมดก่อนการ Export</label><label><input type="checkbox" data-approved="1" ${j.customerApproved?'checked':''}> ยืนยันว่าลูกค้าอนุมัติ Artwork Revision ${j.revision} แล้ว</label><small>ช่องนี้เป็นการบันทึกสถานะโดย Sales ไม่ใช่ลายเซ็นดิจิทัลหรือการอนุมัติจากโรงงาน</small></div><div class="check-last">${canExportProduction(j)?pill('สามารถส่งออกไฟล์สำหรับ Prepress Review','success'):pill('Production Export ยังถูกล็อก','danger')}</div></section><section class="panel output-panel"><h3>Export Documents & Production</h3><p>Customer Proof ส่งได้ก่อนการอนุมัติ ส่วนไฟล์ผลิตจะปลดล็อกเมื่อผ่านเงื่อนไข</p><div class="output-actions"><button data-action="proof" class="action-card">${icon('file',24)}<span><b>Customer Proof PDF</b><small>เปิดเอกสาร A4 เพื่อ Print / Save as PDF</small></span>${icon('arrow',17)}</button><button data-action="prod-pdf" class="action-card">${icon('file',24)}<span><b>Production Spec PDF</b><small>รายการสี ขนาด และข้อควรระวัง</small></span>${icon('arrow',17)}</button><button data-action="prod-svg" class="action-card ${!canExportProduction(j)?'disabled':''}">${icon('layers',24)}<span><b>Production SVG 1:1</b><small>ไฟล์เวกเตอร์ตามหน่วย mm</small></span>${icon('download',17)}</button><button data-action="prod-zip" class="action-card ${!canExportProduction(j)?'disabled':''}">${icon('download',24)}<span><b>Production ZIP / Separations</b><small>Artwork แยกกลุ่มสีหมึก (สำหรับ Prepress)</small></span>${icon('download',17)}</button></div><div class="editor-warn">${icon('alert',17)} การพิมพ์ PDF ต้องเลือก 100% / Actual Size และปิด Fit to Page; ตรวจด้วยไม้บรรทัดและ Prepress ก่อนผลิต</div></section></div>`;}
function bottomActions(){return `<div class="bottom-controls"><button class="outline-btn" data-action="prev-step">${icon('back',17)} ย้อนกลับ</button><div class="autosave">${icon('save',15)} ข้อมูลบันทึกในเบราว์เซอร์ (Local)</div><button class="primary-btn" data-action="next-step">${step<4?'ถัดไป : '+['','ตั้งค่าสีด้าม','อัปโหลดและจัดวางโลโก้','ตรวจสอบและส่งออก'][step]:'กลับไปแก้ไข Artwork'} ${icon('arrow',18)}</button></div>`;}
function editor(){return `<div class="layout">${sidebar()}<main class="workspace">${jobTop()}${productStrip()}${step===1?productStep():step===2?`<div class="main-editor-grid">${photoPanel()}${variantsPanel()}</div>`:step===3?logoEditor():proofStep()}${bottomActions()}${templatePreview()}<div class="legal-inline">ระบบ Pilot: ตำแหน่งโลโก้ในภาพเป็นภาพจำลอง ต้องตรวจความถูกต้องของ Product Master, ตัวสินค้า และไฟล์เวกเตอร์ก่อนใช้ผลิตจริง</div></main></div>`;}
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
function updateText(j,field,value){
  j.textArtwork={...(j.textArtwork||{}),[field]:value,status:'not-generated'};
  j.logo={sourceType:'text',name:'Text — Not Outlined',text:j.textArtwork.text,vector:false,aspect:Math.max(1,([...j.textArtwork.text].length||1)*.7),palette:['#000000'],markup:null,notes:[]};
  changed(true);
}
function validateImportedJob(obj,retainId=false){
  if(!obj?.variants||!obj?.logo||typeof obj.id!=='string')throw Error('Project JSON ไม่ถูกต้อง');
  const copy=structuredClone(obj);
  if(copy.logo.sourceType==='svg'||(copy.logo.sourceType==='text'&&copy.logo.vector)){
    const vb=String(copy.logo.viewBox||'');
    if(!/^[0-9eE., +\-]+$/.test(vb))throw Error('SVG viewBox ไม่ถูกต้อง');
    const verified=parseSafeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${copy.logo.markup||''}</svg>`);
    copy.logo={...copy.logo,markup:verified.markup,viewBox:verified.viewBox,palette:verified.palette,aspect:verified.aspect,vector:true};
  }else if(copy.logo.sourceType==='raster'){
    if(!/^data:image\/(png|jpeg|webp);base64,/i.test(String(copy.logo.data||'')))throw Error('Raster data ไม่ถูกต้อง');
  }else if(copy.logo.sourceType==='text'){copy.logo.vector=false;copy.logo.markup=null;}
  else{copy.logo=newJob().logo;}
  if(copy.productSpec){const p=copy.productSpec;if(!p.variants?.length||!Number.isFinite(+p.printWidthMm)||!Number.isFinite(+p.printHeightMm)||+p.printWidthMm<=0||+p.printHeightMm<=0)throw Error('Product Spec ไม่ถูกต้อง');}
  if(copy.customBrandLogo&&!/^data:image\/(png|jpeg|webp);base64,/i.test(String(copy.customBrandLogo))&&!/^data:image\/svg\+xml;charset=utf-8,/i.test(String(copy.customBrandLogo)))copy.customBrandLogo=null;
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
function render(){app.innerHTML=`${header()}${view==='editor'?editor():view==='dashboard'?dashboard():view==='library'?library():view==='reports'?reports():help()}<div id="toast" role="status" aria-live="polite" class="toast"></div>`;}
function copyProject(j){downloadText(JSON.stringify({app:'SCCUSTOM',version:1,project:j},null,2),(j.id||'project')+'.json','application/json');}
function nextJob(){jobs.unshift(newJob());jobIndex=0;activateJobProduct(job());pendingBrand='';step=1;view='editor';persist();render();}
function afterCritical(){changed(true);render();}
app.addEventListener('click',async ev=>{
  const btn=ev.target.closest('[data-action]');if(!btn)return;
  ev.preventDefault();const action=btn.dataset.action,j=job();
  try{
    if(action==='go-view'){view=btn.dataset.view;render();return;}
    if(action==='goto-step'){step=Number(btn.dataset.step);render();return;}
    if(action==='prev-step'){step=Math.max(1,step-1);render();return;}
    if(action==='next-step'){step=step===4?3:step+1;render();return;}
    if(action==='save'){persist()&&notify('บันทึกร่างในเบราว์เซอร์แล้ว');return;}
    if(action==='new-job'){nextJob();return;}
    if(action==='trigger-logo'){document.querySelector('#logo-file')?.click();return;}
    if(action==='trigger-brand'){document.querySelector('#brand-file')?.click();return;}
    if(action==='import-job'){document.querySelector('#project-import')?.click();return;}
    if(action==='open-job'){jobIndex=Number(btn.dataset.id);activateJobProduct(job());pendingBrand='';step=2;view='editor';persist();render();return;}
    if(action==='duplicate-job'){const source=jobs[Number(btn.dataset.id)];const cloned=structuredClone(source);cloned.id=newJob().id;cloned.createdAt=new Date().toISOString();cloned.modifiedAt=cloned.createdAt;cloned.status='Draft';cloned.customerApproved=false;cloned.approvedAt=null;cloned.ackNotes=false;cloned.revision=1;jobs.unshift(cloned);jobIndex=0;activateJobProduct(job());persist();view='editor';step=1;render();notify('สร้างสำเนา Artwork แล้ว');return;}
    if(action==='delete-job'){if(jobs.length===1){notify('ต้องมีงานอย่างน้อย 1 งาน',true);return;}if(confirm('ลบงานนี้ออกจากเบราว์เซอร์หรือไม่?')){jobs.splice(Number(btn.dataset.id),1);jobIndex=0;activateJobProduct(job());persist();render();}return;}
    if(action==='export-job'){copyProject(jobs[Number(btn.dataset.id)]);return;}
    if(action==='artwork-mode'){
      if(btn.dataset.value==='text'&&j.logo.sourceType!=='text'){
        j.savedLogo=structuredClone(j.logo);j.logo={sourceType:'text',name:'Text — Not Outlined',text:'',vector:false,aspect:6,palette:['#000000'],markup:null,notes:[]};
      }else if(btn.dataset.value==='logo'&&j.logo.sourceType==='text')j.logo=j.savedLogo||newJob().logo;
      afterCritical();return;
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
    if(action==='reset-position'){j.offsetX=0;j.offsetY=0;j.fit=94;afterCritical();return;}
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
  if(t.matches('[data-range-fit]')){
    j.fit=Number(t.value);changed(true);
    const label=document.querySelector('.range-ends span:nth-child(2)');if(label)label.textContent='Fit '+j.fit+'%';
    updateLive();return;
  }
});
app.addEventListener('change',async ev=>{
  const t=ev.target,j=job();
  try{
    if(t.matches('[data-brand]')){j.brandId=t.value;afterCritical();return;}
    if(t.matches('[data-product-brand]')){pendingBrand=t.value;render();return;}
    if(t.matches('[data-product]')){const p=productCatalog().find(p=>p.id===t.value);if(p){applyProductToJob(j,p);pendingBrand='';changed(false);render();}return;}
    if(t.matches('[data-font-family]')){updateText(j,'family',t.value);afterCritical();return;}
    if(t.matches('[data-font-weight]')){updateText(j,'weight',t.value);afterCritical();return;}
    if(t.matches('#outline-font-file')){
      const file=t.files?.[0];if(!file)return;
      notify('กำลังแปลงข้อความเป็น Vector Paths…');
      const result=await convertTextToOutlines(file,j.textArtwork?.text||'');
      j.logo=result;j.textArtwork={...j.textArtwork,family:result.fontFamily,fontFileName:result.fontFileName,status:'outlined'};
      j.fit=94;j.offsetX=0;j.offsetY=0;afterCritical();notify('แปลงข้อความเป็น Vector Paths สำเร็จ กรุณาตรวจภาษาไทยและขนาดอีกครั้ง');return;
    }
    if(t.matches('#catalog-import-file')){
      const f=t.files?.[0];if(!f)return;if(f.size>5_000_000)throw Error('Catalog ใหญ่เกิน 5 MB');
      const data=JSON.parse(await f.text());if(data.app!=='SCCUSTOM-CATALOG'||!Array.isArray(data.products))throw Error('ไม่ใช่ Catalog SCCUSTOM');
      data.products.forEach(p=>{if(!CATALOG_BRANDS.some(b=>b.name===p.brand)||!p.variants?.length||!Number.isFinite(+p.printWidthMm)||!Number.isFinite(+p.printHeightMm))throw Error('Product Master บางรายการไม่ถูกต้อง');saveProductMaster(p);});
      render();notify('นำเข้า Catalog '+data.products.length+' รุ่นแล้ว');return;
    }
    if(t.matches('#brand-file')){
      const f=t.files?.[0];if(!f)return;
      if(/\.svg$/i.test(f.name)||f.type==='image/svg+xml'){
        const parsed=parseSafeSvg(await f.text());j.customBrandLogo=svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${parsed.viewBox}">${parsed.markup}</svg>`);
      }else{if(!/^image\/(png|jpeg|webp)$/.test(f.type))throw Error('Brand Logo รองรับ SVG, PNG, JPEG หรือ WEBP');j.customBrandLogo=await fileFromInput(f);}
      j.brandId='custom';afterCritical();notify('เปลี่ยน Brand Logo บน Template แล้ว');return;
    }
    if(t.matches('#logo-file')){
      const f=t.files?.[0];if(!f)return;
      j.logo=await processLogo(f);j.fit=94;j.offsetX=0;j.offsetY=0;afterCritical();notify('อัปโหลดโลโก้แล้ว: '+f.name);return;
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
    if(t.matches('[data-offset]')){j[t.dataset.offset]=Number(t.value)||0;afterCritical();return;}
    if(t.matches('[data-focus-select]')){j.selectedVariant=t.value;changed(false);render();return;}
    if(t.matches('[data-ack]')){j.ackNotes=t.checked;changed(false);render();return;}
    if(t.matches('[data-approved]')){if(t.checked&&!j.ackNotes){notify('กรุณาอ่านและรับทราบข้อควรระวังก่อนบันทึกการอนุมัติ',true);render();return;}j.customerApproved=t.checked;j.approvedAt=t.checked?new Date().toISOString():null;j.status=t.checked?'Approved':'Draft';changed(false);render();return;}
  }catch(err){console.error(err);notify(err.message||'อ่านไฟล์ไม่สำเร็จ',true);render();}
});
function updateLive(){
  const j=job();let found=activeVariants(j).find(v=>v.id===j.selectedVariant)||activeVariants(j)[0];if(!found)return;
  const board=document.querySelector('#artboard-image');if(board)board.src=svgDataUri(artworkSvg(j,found.id,-1,{guides:true}));
  const mark=document.querySelector('.large-product .pen-mark');if(mark)mark.src=svgDataUri(artworkSvg(j,found.id));
}
let drag=null;
app.addEventListener('pointerdown',ev=>{
  const area=ev.target.closest('[data-drag-area]');if(!area||!job().logo||ev.button!==0)return;
  const rect=area.getBoundingClientRect();drag={id:ev.pointerId,startX:ev.clientX,startY:ev.clientY,ox:Number(job().offsetX)||0,oy:Number(job().offsetY)||0,width:rect.width,height:rect.height,area};
  area.setPointerCapture(ev.pointerId);area.classList.add('is-dragging');ev.preventDefault();
});
app.addEventListener('pointermove',ev=>{
  if(!drag||drag.id!==ev.pointerId)return;
  const j=job();j.offsetX=+(drag.ox+(ev.clientX-drag.startX)/Math.max(1,drag.width)*PRODUCT.printWidthMm).toFixed(3);
  j.offsetY=+(drag.oy+(ev.clientY-drag.startY)/Math.max(1,drag.height)*PRODUCT.printHeightMm).toFixed(3);
  updateLive();
});
app.addEventListener('pointerup',ev=>{if(!drag||drag.id!==ev.pointerId)return;drag.area.classList.remove('is-dragging');drag=null;afterCritical();});
render();
