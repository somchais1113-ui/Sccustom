/* SCCUSTOM / outline text from user-supplied .ttf/.otf. No fonts are distributed.
 * Fontkit is loaded only on demand via a pinned external ESM service. The
 * rendered paths are then stored in the editable project JSON alongside text.
 * Must still be verified by factory prepress, especially Thai mark positioning.
 */
let fontkitPromise;
export async function loadFontEngine(){
  if(!fontkitPromise)fontkitPromise=import('https://esm.sh/fontkit@2.0.4?bundle').catch(err=>{fontkitPromise=null;throw Error('โหลดเครื่องมือแปลงฟอนต์ไม่ได้ (ต้องมี Internet): '+err.message);});
  return fontkitPromise;
}
// Preserve the original shaping run. Tracking shifts entire grapheme clusters,
// not individual marks. Refuse non-zero tracking when source mapping is unclear.
export function glyphTrackingSlots(text,glyphs){
  const input=[];
  let group=-1,joinsNext=false;
  for(const {segment} of new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)){
    if(!joinsNext)group++;
    joinsNext=/[\u0e40-\u0e44]$/u.test(segment);
    for(const char of segment.normalize('NFKD'))input.push({char,group});
  }
  let cursor=0,previous=0,collapsed=0;
  const slots=glyphs.map(glyph=>{
    const chars=[...String.fromCodePoint(...(glyph.codePoints||[])).normalize('NFKD')];
    if(!chars.length){
      if(!cursor)throw Error('ฟอนต์นี้จับกลุ่มตัวอักษรไม่ได้ กรุณาตั้งช่องไฟเป็น 0%');
      return previous;
    }
    const span=input.slice(cursor,cursor+chars.length);
    if(span.length!==chars.length||span.some((item,i)=>item.char!==chars[i])){
      throw Error('ฟอนต์นี้จัดช่องไฟโดยรักษากลุ่มสระหรือวรรณยุกต์ไม่ได้ กรุณาตั้งช่องไฟเป็น 0% หรือส่งให้ Design');
    }
    cursor+=chars.length;
    previous=span[0].group-collapsed;
    collapsed+=span[span.length-1].group-span[0].group;
    return previous;
  });
  if(cursor!==input.length)throw Error('จับกลุ่มตัวอักษรได้ไม่ครบ กรุณาตั้งช่องไฟเป็น 0% หรือส่งให้ Design');
  return slots;
}
export function outlineRun(font,text,trackingEm=0){
  if(!text||!text.trim())throw Error('กรุณาใส่ข้อความก่อนแปลงเวกเตอร์');
  if(/[\r\n\t]/u.test(text))throw Error('รองรับข้อความหนึ่งบรรทัด กรุณาแทนการขึ้นบรรทัดใหม่ด้วยช่องว่าง');
  if([...text].length>120)throw Error('ข้อความต้องไม่เกิน 120 ตัวอักษร');
  if(!Number.isFinite(trackingEm)||trackingEm<0||trackingEm>.35)throw Error('ช่องไฟต้องอยู่ระหว่าง 0–35%');
  const run=font.layout(text);
  if(run.glyphs.some(g=>g.id===0))throw Error('ฟอนต์นี้มีตัวอักษรไม่ครบ กรุณาเปลี่ยนไฟล์ฟอนต์');
  if(trackingEm&&!(font.unitsPerEm>0))throw Error('ฟอนต์นี้ไม่รองรับการกำหนดช่องไฟ');
  const slots=trackingEm?glyphTrackingSlots(text,run.glyphs):null;
  let penX=0,penY=0,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  let shapes=[];
  for(let i=0;i<run.glyphs.length;i++){
    const glyph=run.glyphs[i],pos=run.positions[i],d=glyph.path.toSVG();
    const x=penX+(pos.xOffset||0)+(slots?slots[i]*trackingEm*font.unitsPerEm:0),y=penY+(pos.yOffset||0);
    if(d){
      const bb=glyph.bbox;
      minX=Math.min(minX,x+bb.minX);maxX=Math.max(maxX,x+bb.maxX);
      minY=Math.min(minY,-y-bb.maxY);maxY=Math.max(maxY,-y-bb.minY);
      shapes.push(`<g transform="translate(${+x.toFixed(3)} ${+(-y).toFixed(3)}) scale(1 -1)"><path fill="#000000" d="${d}"/></g>`);
    }
    penX+=pos.xAdvance;penY+=pos.yAdvance;
  }
  if(!shapes.length||!(maxX>minX)||!(maxY>minY))throw Error('ไม่พบเส้นเวกเตอร์จากฟอนต์นี้');
  const width=maxX-minX,height=maxY-minY;
  return {sourceType:'text',name:'Outlined text',text,markup:shapes.join(''),viewBox:[minX,minY,width,height].map(v=>+v.toFixed(3)).join(' '),aspect:width/height,palette:['#000000'],vector:true,notes:['Outlined glyph paths from uploaded font; verify Thai character marks and prepress minimum strokes.'],fontOutlined:true,trackingEm};
}
export async function convertTextToOutlines(fontFile,text,trackingEm=0){
  if(!fontFile||!/\.(ttf|otf)$/i.test(fontFile.name))throw Error('กรุณาอัปโหลดไฟล์ฟอนต์ TTF หรือ OTF ที่ได้รับอนุญาต');
  if(fontFile.size>6_000_000)throw Error('ไฟล์ฟอนต์ต้องมีขนาดไม่เกิน 6 MB');
  const kit=await loadFontEngine();
  const bytes=new Uint8Array(await fontFile.arrayBuffer());
  const font=kit.create(bytes);
  const res=outlineRun(font,text,trackingEm);
  return {...res,fontFamily:font.familyName||font.postscriptName||fontFile.name,fontFileName:fontFile.name};
}
