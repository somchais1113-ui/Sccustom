// SCCUSTOM | Editable product master and default template branding.
// All six colourway examples below are visual DEMOS, not verified factory SKUs.
export const PRODUCT = {
  id:'QTM-341224', brand:'Quantum', model:'341224', type:'ปากกาลูกลื่น', nib:'0.5 mm',
  name:'Quantum 341224 / 0.5 mm', printProcess:'Silkscreen',
  lengthMm:140, printWidthMm:28.3, printHeightMm:4.5,
  variants:[
    {id:'sky',name:'ฟ้า',en:'Sky Blue',swatch:'#39C4E5',photo:'assets/pen-sky.webp'},
    {id:'pink',name:'ชมพู',en:'Pink',swatch:'#F49DC1',photo:'assets/pen-pink.webp'},
    {id:'yellow',name:'เหลือง',en:'Yellow',swatch:'#F7D534',photo:'assets/pen-yellow.webp'},
    {id:'mint',name:'เขียวมิ้นท์',en:'Mint Green',swatch:'#78D1A2',photo:'assets/pen-mint.webp'},
    {id:'purple',name:'ม่วง',en:'Purple',swatch:'#B49AE2',photo:'assets/pen-purple.webp'},
    {id:'black',name:'ดำ',en:'Black',swatch:'#344050',photo:'assets/pen-black.webp'}
  ]
};
export const BRANDS = [
  {id:'quantum',name:'Quantum',kind:'image',logo:'assets/quantum-brand.png'},
  {id:'elephant',name:'Elephant',kind:'text'},
  {id:'elfen',name:'Elfen',kind:'text'},
  {id:'uni',name:'Uni',kind:'text'},
  {id:'mitsubishi',name:'Mitsubishi',kind:'text'},
  {id:'master-art',name:'Master Art',kind:'text'},
  {id:'ultimatum',name:'Ultimatum',kind:'text'},
  {id:'artifact',name:'Artifact',kind:'text'},
  {id:'sccustom',name:'SCCUSTOM',kind:'text'},
  {id:'custom',name:'โลโก้ที่อัปโหลด',kind:'custom'}
];
export const INKS = [
  {id:'black',name:'PANTONE BLACK C',short:'BLACK C',hex:'#181b21'},
  {id:'white',name:'WHITE',short:'WHITE',hex:'#ffffff'},
  {id:'red',name:'PANTONE 186 C (ตัวอย่าง)',short:'RED',hex:'#ce2445'},
  {id:'blue',name:'PANTONE 300 C (ตัวอย่าง)',short:'BLUE',hex:'#0076ce'},
  {id:'orange',name:'PANTONE 165 C (ตัวอย่าง)',short:'ORANGE',hex:'#f36e32'},
  {id:'green',name:'PANTONE 347 C (ตัวอย่าง)',short:'GREEN',hex:'#009b62'},
  {id:'yellow',name:'YELLOW (ตัวอย่าง)',short:'YELLOW',hex:'#f2ce18'}
];
export const NOTICES = [
  'ภาพปากกาและสีด้ามบนจอเป็นภาพจำลองเพื่อการจัดวาง ไม่ใช่หลักฐานยืนยันเฉดสีหรือการผลิต',
  'ให้ยึดขนาดที่ระบุเป็นมิลลิเมตรและไฟล์ Artwork 1:1 เท่านั้น ห้ามใช้ Fit to Page',
  'การแสดงผลบนหน้าจอไม่ได้มีขนาด 1:1 และเฉดสีจริงต้องตรวจสอบกับโรงงาน',
  'ไฟล์เวกเตอร์ต้องไม่มีตัวอักษรที่ยังไม่แปลงเป็น Outlines และควรตรวจสอบรายละเอียดเล็กก่อนสั่งผลิต',
  'หากเปลี่ยนโลโก้ ขนาด สีสกรีน หรือตำแหน่งหลังอนุมัติ ต้องให้ลูกค้าอนุมัติ Revision ใหม่',
  'ข้อความที่พิมพ์เองต้องแปลงเป็น Vector Outlines และตรวจตำแหน่งสระ/วรรณยุกต์ภาษาไทยก่อนส่ง Supplier'
];
export function newJob(){
  return {
    id:'ART-'+new Date().getFullYear()+'-'+Math.floor(Date.now()%1000000).toString().padStart(6,'0'),
    createdAt:new Date().toISOString(), modifiedAt:new Date().toISOString(), revision:1,
    customer:'',representative:'',po:'',ext:'',productId:PRODUCT.id,productSpec:structuredClone(PRODUCT),brandId:'quantum',customBrandLogo:null,
    inkCount:1,sameInk:true,sharedInks:['black','red','blue'],
    variants:Object.fromEntries(PRODUCT.variants.map(v=>[v.id,{enabled:true,qty:200,inks:[v.id==='black'?'white':'black','red','blue']} ])),
    logo:{sourceType:'demo',name:'MARDOZIA — SAMPLE',data:null,markup:null,palette:['#181b21'],aspect:6,vector:false,notes:[]},
    textArtwork:{text:'',family:'Prompt',weight:'700',status:'not-generated',fontFileName:''},fit:94,offsetX:0,offsetY:0,selectedVariant:'sky',ackNotes:false,customerApproved:false,approvedAt:null,
    status:'Draft'
  };
}
export const relFile = path => new URL(path,document.baseURI).href;
export function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function ink(id){return INKS.find(i=>i.id===id)||INKS[0];}
export function activeVariants(job){return PRODUCT.variants.filter(v=>job.variants?.[v.id]?.enabled);}
export function variantInks(job,id){return (job.sameInk?job.sharedInks:job.variants[id].inks).slice(0,job.inkCount);}
export function logoSize(job){
  const ratio=Math.min(Math.max(Number(job.logo?.aspect)||4,0.05),100);
  const scale=Math.max(0.1,Math.min(1,Number(job.fit)/100));
  const maxW=PRODUCT.printWidthMm-0.25,maxH=PRODUCT.printHeightMm-0.25;
  let w=maxW,h=w/ratio;
  if(h>maxH){h=maxH;w=h*ratio;}
  return {width:+(w*scale).toFixed(3),height:+(h*scale).toFixed(3)};
}
export function position(job){
  const {width,height}=logoSize(job);
  const x=Math.max(0,Math.min(PRODUCT.printWidthMm-width,(PRODUCT.printWidthMm-width)/2+Number(job.offsetX||0)));
  const y=Math.max(0,Math.min(PRODUCT.printHeightMm-height,(PRODUCT.printHeightMm-height)/2+Number(job.offsetY||0)));
  return {x:+x.toFixed(3),y:+y.toFixed(3),width,height};
}
export function safeFilename(value){return String(value||'artwork').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,75);}

// Catalog is local to the browser until synchronized through a trusted API.
export const CATALOG_BRANDS=[
  {id:'quantum',code:'QTM',name:'Quantum'}, {id:'elephant',code:'ELP',name:'Elephant'},
  {id:'elfen',code:'EFN',name:'Elfen'}, {id:'uni',code:'UNI',name:'Uni'},
  {id:'mitsubishi',code:'MIT',name:'Mitsubishi'}, {id:'master-art',code:'MTA',name:'Master Art'},
  {id:'ultimatum',code:'ULT',name:'Ultimatum'}, {id:'artifact',code:'ATF',name:'Artifact'}
];
const CATALOG_KEY='sccustom-product-masters-v2';
const DEMO_PRODUCT=structuredClone(PRODUCT);
export function productCatalog(){
  let saved=[];try{saved=JSON.parse(localStorage.getItem(CATALOG_KEY)||'[]');}catch{}
  return [DEMO_PRODUCT,...(Array.isArray(saved)?saved:[])];
}
export function saveProductMaster(p){
  if(!p?.id||!p?.brand||!p?.model||!Array.isArray(p.variants)||!p.variants.length)throw Error('ข้อมูลสินค้าไม่ครบ');
  const list=productCatalog().slice(1),i=list.findIndex(x=>x.id===p.id);
  if(i>=0)list[i]=p;else list.push(p);
  localStorage.setItem(CATALOG_KEY,JSON.stringify(list));
}
export function useProduct(p){
  if(!p||!p.printWidthMm||!p.printHeightMm||!p.variants?.length)throw Error('Product Master ไม่ถูกต้อง');
  for(const key of Object.keys(PRODUCT))delete PRODUCT[key];
  Object.assign(PRODUCT,structuredClone(p));
}
export function activateJobProduct(j){useProduct(j.productSpec||productCatalog().find(p=>p.id===j.productId)||DEMO_PRODUCT);}
export function applyProductToJob(j,p){
  useProduct(p);j.productId=p.id;j.productSpec=structuredClone(p);
  j.variants=Object.fromEntries(p.variants.map(v=>[v.id,{enabled:true,qty:0,inks:['black','red','blue']} ]));
  j.selectedVariant=p.variants[0].id;j.customerApproved=false;j.approvedAt=null;j.ackNotes=false;
  j.status='Draft';j.revision++;j.fit=94;j.offsetX=0;j.offsetY=0;
}
export function proposedFilename(brandCode,model,variant,kind='side',type='web',version='v001',ext='webp'){
  const scrub=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return [scrub(brandCode),scrub(model),scrub(variant),scrub(kind),scrub(type),scrub(version)].join('_')+'.'+scrub(ext);
}
