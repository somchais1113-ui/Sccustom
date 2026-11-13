// SCCUSTOM | Editable product master and default template branding.
// All six colourway examples below are visual DEMOS, not verified factory SKUs.
export const PRODUCT = {
  id:'qt-341224', brand:'Quantum', model:'341224', type:'ปากกาลูกลื่น', nib:'0.5 mm',
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
  {id:'mardozia',name:'Mardozia',kind:'text'},
  {id:'scpromotion',name:'SC Promotion',kind:'text'},
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
  'หากเปลี่ยนโลโก้ ขนาด สีสกรีน หรือตำแหน่งหลังอนุมัติ ต้องให้ลูกค้าอนุมัติ Revision ใหม่'
];
export function newJob(){
  return {
    id:'ART-'+new Date().getFullYear()+'-'+Math.floor(Date.now()%1000000).toString().padStart(6,'0'),
    createdAt:new Date().toISOString(), modifiedAt:new Date().toISOString(), revision:1,
    customer:'',representative:'',po:'',ext:'',brandId:'quantum',customBrandLogo:null,
    inkCount:1,sameInk:true,sharedInks:['black','red','blue'],
    variants:Object.fromEntries(PRODUCT.variants.map(v=>[v.id,{enabled:true,qty:200,inks:[v.id==='black'?'white':'black','red','blue']} ])),
    logo:{sourceType:'demo',name:'MARDOZIA — SAMPLE',data:null,markup:null,palette:['#181b21'],aspect:6,vector:false,notes:[]},
    fit:94,offsetX:0,offsetY:0,selectedVariant:'sky',ackNotes:false,customerApproved:false,approvedAt:null,
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
