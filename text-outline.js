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
export function outlineRun(font,text){
  if(!text||!text.trim())throw Error('กรุณาใส่ข้อความก่อนแปลงเวกเตอร์');
  if([...text].length>120)throw Error('ข้อความต้องไม่เกิน 120 ตัวอักษร');
  const run=font.layout(text);
  let penX=0,penY=0,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  let shapes=[];
  for(let i=0;i<run.glyphs.length;i++){
    const glyph=run.glyphs[i],pos=run.positions[i],d=glyph.path.toSVG();
    const x=penX+(pos.xOffset||0),y=penY+(pos.yOffset||0);
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
  return {sourceType:'text',name:'Outlined text',text,markup:shapes.join(''),viewBox:[minX,minY,width,height].map(v=>+v.toFixed(3)).join(' '),aspect:width/height,palette:['#000000'],vector:true,notes:['Outlined glyph paths from uploaded font; verify Thai character marks and prepress minimum strokes.'],fontOutlined:true};
}
export async function convertTextToOutlines(fontFile,text){
  if(!fontFile||!/\.(ttf|otf)$/i.test(fontFile.name))throw Error('กรุณาอัปโหลดไฟล์ฟอนต์ TTF หรือ OTF ที่ได้รับอนุญาต');
  if(fontFile.size>6_000_000)throw Error('ไฟล์ฟอนต์ต้องมีขนาดไม่เกิน 6 MB');
  const kit=await loadFontEngine();
  const bytes=new Uint8Array(await fontFile.arrayBuffer());
  const font=kit.create(bytes);
  const res=outlineRun(font,text);
  return {...res,fontFamily:font.familyName||font.postscriptName||fontFile.name,fontFileName:fontFile.name};
}
