import {PRODUCT,ink,position,escapeHtml,variantInks} from './data.js';

const VECTOR_TAGS=new Set(['svg','g','path','rect','circle','ellipse','polygon','polyline','line']);
const SHAPE_TAGS=new Set(['path','rect','circle','ellipse','polygon','polyline','line']);
const ATTRS=new Set(['d','x','y','x1','y1','x2','y2','width','height','rx','ry','cx','cy','r','points','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','fill-rule','clip-rule','transform','opacity','fill-opacity','stroke-opacity','viewBox','preserveAspectRatio']);
function normColor(c){
  c=String(c||'').trim().toLowerCase();
  if(!c||c==='none') return c||'none';
  if(c==='black') return '#000000'; if(c==='white')return '#ffffff';
  const m=c.match(/^#([a-f0-9]{3}|[a-f0-9]{6})$/i);
  if(m) return c.length===4?'#'+[...c.slice(1)].map(x=>x+x).join(''):c;
  const rgb=c.match(/^rgb\(\s*(\d{1,3})[, ]+\s*(\d{1,3})[, ]+\s*(\d{1,3})\s*\)$/);
  if(rgb)return '#'+rgb.slice(1).map(n=>Math.max(0,Math.min(255,+n)).toString(16).padStart(2,'0')).join('');
  throw Error('พบสีหรือเอฟเฟกต์ที่ยังไม่รองรับ: '+c+' กรุณาแปลงเป็นสีทึบ RGB/HEX และ Vector Paths');
}
export function parseSafeSvg(svgText){
  const doc=new DOMParser().parseFromString(svgText,'image/svg+xml');
  if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw Error('ไฟล์ SVG ไม่ถูกต้อง');
  const root=doc.documentElement;
  for(const el of root.querySelectorAll('*')){
    if(!VECTOR_TAGS.has(el.localName))throw Error('SVG นี้มี '+el.localName+' ซึ่งยังไม่รองรับ กรุณา Expand Appearance / Convert Fonts to Outlines ก่อน');
  }
  // A strict allowlist prevents script, links, external references and unsupported paint servers.
  let shapeCount=0;
  const palette=[];
  const clean=(source,inheritedFill='#000000',inheritedStroke='none')=>{
    const tag=source.localName;
    if(!VECTOR_TAGS.has(tag))throw Error('พบองค์ประกอบ SVG ที่ไม่รองรับ');
    let attrs='';
    const styles={};
    const style=source.getAttribute('style')||'';
    if(style)for(const rule of style.split(';')){const [k,...vals]=rule.split(':');if(['fill','stroke','stroke-width','fill-rule','stroke-linecap','stroke-linejoin','opacity'].includes((k||'').trim()))styles[k.trim()]=vals.join(':').trim();}
    for(const [k,v] of Object.entries(styles))if(!source.hasAttribute(k))source.setAttribute(k,v);
    if([...source.attributes].some(a=>['clip-path','mask','filter','href','xlink:href','stroke-dasharray','class','id'].includes(a.name)))throw Error('SVG มี clipping/mask/filter หรือ reference ที่ยังไม่รองรับ กรุณา Expand/Flatten เป็น Vector Paths');
    const fill=normColor(source.getAttribute('fill')||inheritedFill);
    const stroke=normColor(source.getAttribute('stroke')||inheritedStroke);
    for(const attr of [...source.attributes]){
      let name=attr.name,val=attr.value.trim();
      if(!ATTRS.has(name)||name==='fill'||name==='stroke')continue;
      if(/url\s*\(|javascript:|data:|http:|https:|[<>]/i.test(val))throw Error('SVG อ้างอิงแหล่งข้อมูลหรือเอฟเฟกต์ภายนอกที่ยังไม่รองรับ');
      attrs+=' '+name+'="'+escapeHtml(val)+'"';
    }
    if(SHAPE_TAGS.has(tag)){
      shapeCount++;
      const effectiveFill=tag==='line'&&!source.hasAttribute('fill')?'none':fill;
      attrs+=' fill="'+effectiveFill+'" stroke="'+stroke+'"';
      for(const color of [effectiveFill,stroke])if(color!=='none'&&!palette.includes(color))palette.push(color);
    }
    return '<'+tag+attrs+'>'+[...source.children].map(child=>clean(child,fill,stroke)).join('')+'</'+tag+'>';
  };
  const vb=(root.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
  const width=vb.length===4&&vb[2]>0?vb[2]:parseFloat(root.getAttribute('width'));
  const height=vb.length===4&&vb[3]>0?vb[3]:parseFloat(root.getAttribute('height'));
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('SVG ต้องมี viewBox หรือ width/height ที่อ่านค่าได้');
  const viewBox=vb.length===4&&vb[2]>0&&vb[3]>0?vb.join(' '):`0 0 ${width} ${height}`;
  const markup=[...root.children].map(el=>clean(el,root.getAttribute('fill')||'#000000',root.getAttribute('stroke')||'none')).join('');
  if(!shapeCount)throw Error('SVG ไม่มี Vector Paths ที่ใช้งานได้');
  if(palette.length>3)throw Error('SVG มีสีทึบมากกว่า 3 สี กรุณาจัดกลุ่มหรือแยกสีใน Illustrator ก่อน');
  return {sourceType:'svg',name:'',markup,viewBox,aspect:width/height,palette,vector:true,notes:[]};
}
function coloredMarkup(asset,inks,layer,kind){
  // parseSafeSvg and text outlines produce explicit solid fills and strokes.
  const palette=asset.palette||[];
  return (asset.markup||'').replace(/<(path|rect|circle|ellipse|polygon|polyline|line)\b([^>]*)>/g,(full,tag,attrs)=>{
    const next=attrs.replace(/\b(fill|stroke)="(#[a-fA-F0-9]{6}|none)"/g,(part,attr,color)=>{
      if(color==='none')return part;
      const slot=kind==='text'?0:Math.max(0,palette.indexOf(color.toLowerCase()));
      const nextColor=layer>=0&&slot!==layer?'none':inks[Math.min(slot,inks.length-1)]?.hex||'#111111';
      return attr+'="'+nextColor+'"';
    });
    return '<'+tag+next+'>';
  });
}
function partSvg(part,job,inks,layer){
  const {asset,kind,x,y,width,height}=part;
  if(width<=0||height<=0)return '';
  const bounds=`x="${x}" y="${y}" width="${width}" height="${height}"`;
  if(asset.vector&&['svg','text'].includes(asset.sourceType)){
    return `<svg ${bounds} viewBox="${escapeHtml(asset.viewBox)}" preserveAspectRatio="xMidYMid meet" overflow="hidden">${coloredMarkup(asset,inks,layer,kind)}</svg>`;
  }
  if(layer>=0)return '';
  if(kind==='text'){
    const content=escapeHtml(job.textArtwork?.text||'');
    const family=escapeHtml(job.textArtwork?.family||'sans-serif');
    const weight=[400,500,700].includes(+job.textArtwork?.weight)?+job.textArtwork.weight:700;
    const tracking=Math.max(0,Math.min(.35,Number(job.textArtwork?.trackingEm)||0));
    return `<svg ${bounds} overflow="hidden"><text x="50%" y="72%" text-anchor="middle" font-size="${height*.70}" font-family="${family},sans-serif" font-weight="${weight}" letter-spacing="${tracking}em" fill="${inks[0]?.hex||'#111111'}">${content}</text></svg>`;
  }
  if(asset.data)return `<image ${bounds} href="${escapeHtml(asset.data)}" preserveAspectRatio="xMidYMid meet"/>`;
  return `<svg ${bounds} viewBox="0 0 50 10"><text x="25" y="7.8" text-anchor="middle" font-family="Arial, sans-serif" font-size="8.3" font-weight="800" fill="${inks[0]?.hex||'#111111'}">MARDOZIA</text></svg>`;
}
export function artworkSvg(job,variantId,layer=-1,opts={}){
  const p=position(job);
  const w=p.safe.outerWidth,h=p.safe.outerHeight;
  const inks=variantInks(job,variantId).map(ink);
  const content=p.parts.map(part=>partSvg(part,job,inks,layer)).join('');
  const {x,y,width,height}=p.safe;
  const guides=opts.guides?`<g data-layout-guides="true">
    <rect x="0.025" y="0.025" width="${Math.max(0,w-.05)}" height="${Math.max(0,h-.05)}" fill="none" stroke="#64748b" stroke-width=".05"/>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="#087bb7" stroke-width=".07" stroke-dasharray=".35 .2"/>
    </g>`:'';
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><title>${escapeHtml(job.id)} / ${escapeHtml(variantId)} / ${layer>=0?'Separation '+(layer+1):'Composite'}</title><desc>Actual size 1:1 (mm). Spot color names documented in accompanying job file. Verify size, ink and separations before manufacturing.</desc>${content}${guides}</svg>`;
}
export function svgDataUri(s){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);}
export function fileFromInput(file){
  return new Promise((resolve,reject)=>{
    if(!file)return reject(Error('ไม่พบไฟล์'));
    if(file.size>2_500_000)return reject(Error('ไฟล์ต้องมีขนาดไม่เกิน 2.5 MB เพื่อรองรับการบันทึกบนเบราว์เซอร์'));
    const reader=new FileReader(); reader.onerror=()=>reject(Error('อ่านไฟล์ไม่ได้'));
    reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file);
  });
}
export async function processLogo(file){
  if(/\.svg$/i.test(file.name)||file.type==='image/svg+xml'){
    const raw=await file.text();return {...parseSafeSvg(raw),name:file.name};
  }
  if(!/image\/(png|jpeg|webp)/.test(file.type))throw Error('รองรับโลโก้ SVG, PNG, JPEG หรือ WEBP เท่านั้น');
  const data=await fileFromInput(file);
  const dimensions=await new Promise((res,rej)=>{const img=new Image();img.onload=()=>res([img.naturalWidth,img.naturalHeight]);img.onerror=()=>rej(Error('เปิดรูปไม่ได้'));img.src=data;});
  return {sourceType:'raster',name:file.name,data,markup:null,aspect:dimensions[0]/dimensions[1],palette:['#181b21'],vector:false,notes:[`Raster ${dimensions[0]} × ${dimensions[1]} px — ใช้ทำ Proof เท่านั้น ไม่สามารถส่งผลิตแบบเวกเตอร์ได้`]};
}
