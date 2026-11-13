import {PRODUCT,BRANDS,NOTICES,activeVariants,escapeHtml,ink,variantInks,safeFilename,relFile,position} from './data.js';
import {artworkSvg,svgDataUri} from './vector.js';

export function preflight(job){
  const issues=[];
  const active=activeVariants(job);
  if(active.length===0)issues.push({level:'block',text:'ต้องเลือกสีด้ามอย่างน้อย 1 สี'});
  if(!(job.customer||'').trim())issues.push({level:'warn',text:'ยังไม่ได้ระบุชื่อลูกค้า'});
  if(!job.logo.vector)issues.push({level:'block',text:'Artwork ยังไม่ได้เป็น Vector Outlines (สำหรับข้อความให้กด แปลงเป็น Paths หลังอัปโหลดฟอนต์ TTF/OTF)'});
  if(job.logo.vector&&(job.logo.palette||[]).length>job.inkCount)issues.push({level:'block',text:'โลโก้มีสีมากกว่าจำนวน Ink ที่ตั้งค่า กรุณาเพิ่มจำนวนสีพิมพ์หรือเตรียม Vector ใหม่'});
  if(job.logo.vector&&(job.logo.palette||[]).length<job.inkCount)issues.push({level:'block',text:'จำนวนสีพิมพ์มากกว่าสีจริงในโลโก้ จะเกิด Separation ว่าง กรุณาลดจำนวนสีพิมพ์หรือเตรียม Vector ใหม่'});
  if(active.some(v=>(Number(job.variants[v.id].qty)||0)<=0))issues.push({level:'warn',text:'สีด้ามที่เลือกบางสีมีจำนวน 0'});
  if(active.some(v=>variantInks(job,v.id).includes('white')))issues.push({level:'warn',text:'ตัวอย่างปากการุ่นนี้มีพื้นที่พิมพ์สีขาว — หมึกสีขาวอาจมองไม่เห็น ควรตรวจวัสดุและสีผิวจริง'});
  if(!job.ackNotes)issues.push({level:'block',text:'กรุณารับทราบข้อควรระวังก่อนส่งออกไฟล์ผลิต'});
  if(!job.customerApproved)issues.push({level:'block',text:'ยังไม่มีการยืนยันว่าลูกค้าอนุมัติ Revision ปัจจุบัน'});
  return issues;
}
export function canExportProduction(job){return preflight(job).every(x=>x.level!=='block');}
function toBytes(value){return value instanceof Uint8Array?value:new TextEncoder().encode(value);}
function u16(arr,pos,n){arr[pos]=n&255;arr[pos+1]=(n>>>8)&255;}
function u32(arr,pos,n){arr[pos]=n&255;arr[pos+1]=(n>>>8)&255;arr[pos+2]=(n>>>16)&255;arr[pos+3]=(n>>>24)&255;}
const crcTable=(()=>{const tab=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;tab[n]=c>>>0;}return tab;})();
function crc32(data){let c=0xffffffff;for(let i=0;i<data.length;i++)c=crcTable[(c^data[i])&255]^(c>>>8);return(c^0xffffffff)>>>0;}
export function zipFile(entries){
  let offset=0; const local=[],central=[];
  for(const [filename,content] of entries){
    const name=toBytes(filename),data=toBytes(content),crc=crc32(data);
    const head=new Uint8Array(30+name.length);u32(head,0,0x04034b50);u16(head,4,20);u16(head,6,0x0800);u16(head,8,0);u32(head,14,crc);u32(head,18,data.length);u32(head,22,data.length);u16(head,26,name.length);head.set(name,30);
    local.push(head,data);
    const cent=new Uint8Array(46+name.length);u32(cent,0,0x02014b50);u16(cent,4,20);u16(cent,6,20);u16(cent,8,0x0800);u32(cent,16,crc);u32(cent,20,data.length);u32(cent,24,data.length);u16(cent,28,name.length);u32(cent,42,offset);cent.set(name,46);central.push(cent);
    offset+=head.length+data.length;
  }
  const centralLen=central.reduce((n,a)=>n+a.length,0);
  const tail=new Uint8Array(22);u32(tail,0,0x06054b50);u16(tail,8,entries.length);u16(tail,10,entries.length);u32(tail,12,centralLen);u32(tail,16,offset);
  return new Blob([...local,...central,tail],{type:'application/zip'});
}
export function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export function downloadText(text,name,type='image/svg+xml'){downloadBlob(new Blob([text],{type}),name);}
export function exportSvg(job){
  const active=activeVariants(job);const variant=active.find(v=>v.id===job.selectedVariant)||active[0];
  if(!variant)throw Error('ยังไม่ได้เลือกสีด้าม');
  downloadText(artworkSvg(job,variant.id),safeFilename(job.id)+'-'+variant.id+'-1to1.svg');
}
export function exportProductionZip(job){
  const groups=new Map();
  for(const v of activeVariants(job)){
    const keys=variantInks(job,v.id);const signature=keys.join('__');
    if(!groups.has(signature))groups.set(signature,{inks:keys,variants:[]});
    groups.get(signature).variants.push(v);
  }
  const entries=[];
  let num=0;
  const summary=[];
  for(const [,group] of groups){
    ++num;const groupId='INK-GROUP-'+String(num).padStart(2,'0');
    const exemplar=group.variants[0].id;
    entries.push([groupId+'/ARTWORK-COMPOSITE-1to1.svg',artworkSvg(job,exemplar)]);
    group.inks.forEach((inkId,i)=>entries.push([groupId+`/SEPARATION-${i+1}-${safeFilename(ink(inkId).short)}-1to1.svg`,artworkSvg(job,exemplar,i)]));
    summary.push({group:groupId,barrelColours:group.variants.map(v=>v.en),inks:group.inks.map(id=>ink(id).name)});
  }
  const manifest={system:'SCCUSTOM Smart Artwork Studio',job:job.id,revision:job.revision,customer:job.customer,model:PRODUCT.model,process:PRODUCT.printProcess,printAreaMm:[PRODUCT.printWidthMm,PRODUCT.printHeightMm],quantity:activeVariants(job).reduce((sum,v)=>sum+Number(job.variants[v.id].qty||0),0),approvalRecordedAt:job.approvedAt,inkGroups:summary,notes:NOTICES};
  entries.push(['JOB-MANIFEST.json',JSON.stringify(manifest,null,2)]);
  entries.push(['IMPORTANT-READ-ME.txt','SCCUSTOM Artwork Export\n\nAll SVG artwork files have physical width '+PRODUCT.printWidthMm+'mm and height '+PRODUCT.printHeightMm+'mm.\nComposite and separation files contain only artwork, NOT product photos or guides.\nColours in SVG are RGB preview equivalents, NOT native named PDF spot separations.\nFactory/prepress MUST assign verified spot colours, verify overprint/trapping, check stroke weights, rasterization and actual mm output before block-making.\nOne ink-group can serve multiple pen barrel colours if manufacturing setup is approved.\nNever use Fit to Page.\nThis workflow records a sales-side approval check but is NOT a digital signature / final production authorization.\n']);
  downloadBlob(zipFile(entries),safeFilename(job.id)+'-production-rev'+job.revision+'.zip');
}
function brandHeader(job){
  const b=BRANDS.find(b=>b.id===job.brandId)||BRANDS[0];
  if(b.kind==='image')return `<img src="${relFile(b.logo)}" alt="${escapeHtml(b.name)}" class="brand-img"/>`;
  if(b.kind==='custom'&&job.customBrandLogo)return `<img src="${escapeHtml(job.customBrandLogo)}" class="brand-img custom" alt="Custom brand"/>`;
  return `<div class="brand-wordmark">${escapeHtml(b.name==='โลโก้ที่อัปโหลด'?'SCCUSTOM':b.name)}</div>`;
}
function penLine(v,job){const raw=artworkSvg(job,v.id);return `<div class="pen-line"><div class="pen-photo"><img src="${relFile(v.photo)}" alt="${escapeHtml(v.en)}"/><div class="mark-overlay">${raw}</div></div><span class="pen-name"><b>${escapeHtml(v.name)}</b> (${escapeHtml(v.en)})</span><span class="pen-qty">${Number(job.variants[v.id].qty||0).toLocaleString('en-US')} ด้าม</span></div>`;}
function inkLegend(job){return activeVariants(job).map(v=>`<tr><td><span class="dot" style="background:${v.swatch}"></span>${escapeHtml(v.name)} / ${escapeHtml(v.en)}</td><td>${variantInks(job,v.id).map(x=>escapeHtml(ink(x).name)).join(' + ')}</td><td>${escapeHtml(job.variants[v.id].qty)}</td></tr>`).join('');}
function printTemplate(job,mode){
  const active=activeVariants(job),first=active.find(v=>v.id===job.selectedVariant)||active[0];
  if(!first)throw Error('ต้องเลือกสีด้ามก่อน');
  const actual=artworkSvg(job,first.id),proof=mode==='proof';
  const date=new Date().toLocaleDateString('th-TH');
  const amount=active.reduce((t,v)=>t+Number(job.variants[v.id].qty||0),0);
  return `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>${proof?'Customer Proof':'Production Specification'} — ${escapeHtml(job.id)}</title>
<style>
@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,Tahoma,sans-serif;color:#1d2836;-webkit-print-color-adjust:exact;print-color-adjust:exact;background:white}.sheet{width:210mm;min-height:297mm;padding:6mm 10mm 6mm;position:relative}.top{display:flex;border:1px solid #d5dfe8;border-radius:8px;overflow:hidden;min-height:17mm}.brand{width:64mm;background:#f8fafc;display:flex;align-items:center;justify-content:center;padding:3mm}.brand-img{width:100%;height:17mm;object-fit:contain}.brand-img.custom{max-height:19mm}.brand-wordmark{font-style:italic;font-weight:900;font-size:20pt;color:#132f4b;letter-spacing:-1px}.heading{flex:1;padding:6mm 7mm}.heading strong{font-size:17pt;display:block;letter-spacing:.1px}.heading small{font-size:9pt;color:#63748a}.darkstrip{background:#112f4c;height:2mm}.meta{margin:2mm 0 1mm;display:grid;grid-template-columns:1fr 1fr;gap:3mm 5mm}.meta>div{border-bottom:1px solid #e1e6ec;padding:.5mm 0 1mm;font-size:8.3pt}.label{color:#6d7b8c;font-size:8pt;display:block;margin-bottom:1mm}.h{font-weight:800;margin:2mm 0 1mm;font-size:11pt;border-bottom:1px solid #ced9e5;padding-bottom:2mm}.actual{background:#f0f3f6;padding:2mm 5mm;border-radius:5px;text-align:center;min-height:16mm}.actual svg{display:block;margin:4mm auto 2mm;max-width:none;max-height:none}.actual .sz{font-weight:700;font-size:9pt}.actual .remark{font-size:7.4pt;color:#5d7183}.pens{display:grid;grid-template-columns:1fr 1fr;gap:1.5mm}.pen-line{border:1px solid #e2e9f0;border-radius:5px;padding:.7mm 2mm;min-width:0}.pen-photo{position:relative;width:100%;height:9.5mm;display:flex;align-items:center}.pen-photo>img:first-child{width:100%;height:100%;object-fit:contain}.pen-photo .mark-overlay{position:absolute;width:20.5%;height:25%;left:43%;top:38%;display:flex;align-items:center;justify-content:center}.pen-photo .mark-overlay svg{width:100%;height:100%}.pen-name{font-size:7.5pt}.pen-qty{float:right;font-size:7.5pt;color:#64748b}.table{width:100%;border-collapse:collapse;font-size:8pt}.table td,.table th{border-bottom:1px solid #e3e9ee;padding:1.2mm;text-align:left}.table th{background:#eff3f8;color:#38506a}.dot{display:inline-block;width:2.5mm;height:2.5mm;border-radius:3px;margin-right:2mm;border:1px solid #999;vertical-align:middle}.notices{background:#f5f7fa;border-radius:4px;padding:2mm 3mm;font-size:6.8pt;line-height:1.55;color:#405469}.notices div{margin:1mm 0}.signrow{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:2mm}.sign{border:1px solid #cbd5e1;border-radius:4px;min-height:10mm;padding:2mm 3mm;font-size:8pt}.sign .dash{border-bottom:1px solid #a9b6c6;margin:3mm 5mm 1mm}.foot{position:absolute;bottom:6mm;left:10mm;right:10mm;display:flex;justify-content:space-between;border-top:1px solid #dce4ec;padding-top:2mm;color:#718096;font-size:7pt}button{position:fixed;right:18px;top:15px;padding:12px 18px;background:#0d3762;color:white;border:0;border-radius:6px;cursor:pointer;font:600 14px Arial;z-index:10}@media print{button{display:none}.sheet{page-break-after:always}}
</style></head><body><button onclick="window.print()">Print / Save as PDF</button><main class="sheet"><div class="top"><div class="brand">${brandHeader(job)}</div><div class="heading"><strong>${proof?'ARTWORK FOR SILKSCREEN':'PRODUCTION SPECIFICATION'}</strong><small>${proof?'CUSTOMER ARTWORK APPROVAL':'TECHNICAL DETAILS / NOT FINAL MACHINE VALIDATION'}</small></div></div><div class="darkstrip"></div>
<section class="meta"><div><span class="label">Customer Name</span>${escapeHtml(job.customer)||'—'}</div><div><span class="label">Representative</span>${escapeHtml(job.representative)||'—'}</div><div><span class="label">P.O. Number</span>${escapeHtml(job.po)||'—'}</div><div><span class="label">EXT. / Reference</span>${escapeHtml(job.ext)||'—'}</div><div><span class="label">Product / Model</span>${escapeHtml(PRODUCT.name)} — ${escapeHtml(PRODUCT.nib)}</div><div><span class="label">Job / Revision / Date</span>${escapeHtml(job.id)} / Rev.${job.revision} / ${date}</div><div><span class="label">Print Process / Colours</span>${escapeHtml(PRODUCT.printProcess)} / ${job.inkCount} Colour(s)</div><div><span class="label">Total Quantity</span>${amount.toLocaleString('en-US')} ด้าม / ${active.length} variants</div></section>
<h3 class="h">ACTUAL SIZE 1:1 — ARTWORK</h3><div class="actual"><div class="sz">${PRODUCT.printWidthMm} × ${PRODUCT.printHeightMm} mm (Maximum Print Area)</div>${actual}<div class="remark">SVG vector area above has real mm dimensions in printed output at 100%. Do not use Fit to Page.</div></div>
<h3 class="h">PRODUCT PREVIEW — ${active.length} BARREL COLOUR${active.length>1?'S':''}</h3><div class="pens">${active.map(v=>penLine(v,job)).join('')}</div>
<h3 class="h">PRINT COLOUR & QUANTITY MAP</h3><table class="table"><thead><tr><th>Barrel colour</th><th>Ink colour(s) / Named reference</th><th>Qty</th></tr></thead><tbody>${inkLegend(job)}</tbody></table>
<h3 class="h">IMPORTANT ARTWORK & PRINTING NOTES</h3><div class="notices">${NOTICES.map((n,i)=>`<div>${i+1}. ${escapeHtml(n)}</div>`).join('')}<div>Print separations, opaque white, trapping, screen line minimum and Pantone matching require factory prepress verification.</div></div>
<div class="signrow"><div class="sign">${proof?'Customer Approval':'Prepared By'}<div class="dash"></div>Name / Date</div><div class="sign">${proof?'Sales Representative':'Production Preflight Approval'}<div class="dash"></div>Name / Date</div></div>
<div class="foot"><span>SCCUSTOM • Smart Artwork Studio</span><span>${escapeHtml(job.id)} · Rev.${job.revision} · ${proof?'Customer proof':'Production spec'} · Page 1/1</span></div></main></body></html>`;
}
export function openPdfPrint(job,mode){
  const html=printTemplate(job,mode);
  const popup=window.open('','_blank');
  if(!popup)throw Error('เบราว์เซอร์บล็อกหน้าต่าง PDF กรุณาอนุญาต Pop-ups สำหรับเว็บไซต์นี้');
  popup.document.open();popup.document.write(html);popup.document.close();popup.focus();
}
