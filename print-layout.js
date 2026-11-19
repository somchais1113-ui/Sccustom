import {PRINT_PROFILES} from './config/print-profiles.js';

const sides=['left','right','top','bottom'];
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
export const roundMm=n=>Math.round(n*1e6)/1e6;
const clamp=(n,lo,hi)=>Math.min(hi,Math.max(n,lo));
const dims=product=>({width:finite(product.printWidthMm),height:finite(product.printHeightMm)});
export function profilesFor(product,profiles=PRINT_PROFILES){
  return profiles.filter(p=>p.productId===product.id&&p.method===product.printProcess);
}
function fallback(product){
  const {width,height}=dims(product);
  return {locationId:'barrel',locationLabel:'ตัวด้าม',revision:'',verified:false,
    marginsMm:{left:Math.min(width*.1,.5),right:Math.min(width*.1,.5),top:Math.min(height*.1,.25),bottom:Math.min(height*.1,.25)},minGapMm:Math.min(width*.1,.3)};
}
export function getPrintFrame(product,locationId,profiles=PRINT_PROFILES){
  const base=dims(product);
  const list=profilesFor(product,profiles);
  const matches=list.filter(p=>p.locationId===(locationId||'barrel'));
  const match=matches.length===1?matches[0]:null;
  const m=match?.marginsMm;
  const area=match?.areaMm??base;
  const {width,height}=area;
  const valid=Boolean(match && Number.isFinite(width)&&Number.isFinite(height)&&sides.every(k=>Number.isFinite(m?.[k])&&m[k]>=0)
    && m.left+m.right<width && m.top+m.bottom<height
    && Number.isFinite(match.minGapMm)&&match.minGapMm>=0
    && match.minGapMm<(width-m.left-m.right)*.85);
  const p=valid?match:fallback(product);
  const {left,right,top,bottom}=p.marginsMm;
  const outer=valid?area:base;
  return {x:left,y:top,width:roundMm(outer.width-left-right),height:roundMm(outer.height-top-bottom),
    outerWidth:outer.width,outerHeight:outer.height,
    margins:p.marginsMm,locationId:p.locationId,locationLabel:p.locationLabel,
    version:p.revision,minGap:p.minGapMm,verified:valid&&p.verified===true&&Boolean(p.revision),
    invalid:matches.length>0&&!valid};
}
export function artworkMode(job){
  return job.logo?.sourceType==='text'?(job.layoutMode==='both'?'both':'text'):'logo';
}
export function artworkParts(job){
  const mode=artworkMode(job);
  if(mode==='both')return [
    ...(job.savedLogo&&job.savedLogo.sourceType!=='demo'&&job.savedLogo.sourceType!=='text'?[{kind:'logo',asset:job.savedLogo}]:[]),
    ...(job.textArtwork?.text?.trim()?[{kind:'text',asset:job.logo}]:[]),
  ];
  if(mode==='text'&&!job.textArtwork?.text?.trim()&&!job.logo?.vector)return [];
  return job.logo?[{kind:mode,asset:job.logo}]:[];
}
export function layoutFor(job,product,profiles=PRINT_PROFILES){
  const safe=getPrintFrame(product,job.printLocationId,profiles);
  const mode=artworkMode(job);
  let parts=artworkParts(job);
  if(mode==='both'&&job.textSide==='left')parts=[...parts].reverse();
  const maxGap=roundMm(safe.width*.85);
  const minGap=Math.min(safe.minGap,maxGap);
  const gap=parts.length>1?roundMm(clamp(finite(job.gapMm,Math.max(.8,minGap)),minGap,maxGap)):0;
  const fit=clamp(finite(job.fit,94),10,100)/100;
  const relative=parts.map(p=>mode==='both'&&p.kind==='text'?clamp(finite(job.textHeightPct,75),30,150)/100:1);
  const maxRelative=Math.max(1e-6,...relative);
  const ratios=parts.map((p,i)=>clamp(finite(p.asset.aspect,4)||4,.001,1000)*relative[i]/maxRelative);
  const sum=ratios.reduce((a,b)=>a+b,0);
  const h=parts.length?Math.max(0,Math.min(safe.height,(safe.width-gap)/sum)*fit):0;
  const w=parts.length?sum*h+gap:0;
  const roomX=Math.max(0,(safe.width-w)/2),roomY=Math.max(0,(safe.height-h)/2);
  const offsetX=clamp(finite(job.offsetX),-roomX,roomX),offsetY=clamp(finite(job.offsetY),-roomY,roomY);
  const x=safe.x+roomX+offsetX,y=safe.y+roomY+offsetY;
  let nextX=x;
  parts=parts.map((part,i)=>{
    const width=h*ratios[i];
    const height=h*relative[i]/maxRelative;
    const rect={...part,x:roundMm(nextX),y:roundMm(y+(h-height)/2),width:roundMm(width),height:roundMm(height)};
    nextX+=width+gap;
    return rect;
  });
  return {mode,safe,gap,minGap,maxGap,x:roundMm(x),y:roundMm(y),width:roundMm(w),height:roundMm(h),offsetX:roundMm(offsetX),offsetY:roundMm(offsetY),parts};
}
export function layoutFingerprint(job,product,profiles=PRINT_PROFILES){
  const p=layoutFor(job,product,profiles);
  return JSON.stringify([product.id,product.printProcess,product.printWidthMm,product.printHeightMm,
    p.safe.locationId,p.safe.outerWidth,p.safe.outerHeight,p.safe.version,p.safe.verified,p.safe.margins,p.minGap,p.gap,
    p.parts.map(({kind,x,y,width,height})=>[kind,x,y,width,height])]);
}
export function artInkCount(job){
  return Math.max(0,...artworkParts(job).map(p=>p.kind==='text'?1:(p.asset.palette||[]).length));
}
