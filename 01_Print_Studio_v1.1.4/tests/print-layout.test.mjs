import test from 'node:test';
import assert from 'node:assert/strict';
import {newJob,PRODUCT,position} from '../data.js';
import {PRINT_PROFILES} from '../config/print-profiles.js';
import {getPrintFrame,layoutFor,layoutFingerprint,artInkCount} from '../print-layout.js';
import {glyphTrackingSlots,outlineRun} from '../text-outline.js';
import {artworkSvg} from '../vector.js';
import {canExportProduction,designReviewEntries,exportSvg,preflight} from '../exporter.js';

const profile={productId:PRODUCT.id,method:PRODUCT.printProcess,locationId:'clip',locationLabel:'คลิป',revision:'TEST-1',verified:true,
  areaMm:{width:18,height:4},marginsMm:{left:1,right:2,top:.75,bottom:.25},minGapMm:.55};
const graphic={name:'logo.svg',sourceType:'svg',vector:true,aspect:3,palette:['#000000','#ff0000'],viewBox:'0 0 6 2',markup:'<path d="M0 0H1V1Z" fill="#000000"/><path d="M2 0H3V1Z" fill="#ff0000"/>'};
const outlined={sourceType:'text',vector:true,text:'AB',trackingEm:.08,aspect:2,palette:['#000000'],viewBox:'0 0 4 2',markup:'<path d="M1 0H4V2Z" fill="#000000"/>'};
const both=()=>({...newJob(),logo:structuredClone(outlined),savedLogo:structuredClone(graphic),textArtwork:{text:'AB',trackingEm:.08},layoutMode:'both',inkCount:2,printLocationId:'clip',fit:100});
const near=(a,b)=>assert.ok(Math.abs(a-b)<.000003,`${a} != ${b}`);

test('verified profile is keyed by model, method and location, rejects invalid or duplicate configuration',()=>{
  const actual=getPrintFrame(PRODUCT,'clip',[profile]);
  assert.deepEqual([actual.x,actual.y,actual.width,actual.height],[1,.75,15,3]);
  assert.equal(actual.verified,true);
  assert.equal(getPrintFrame(PRODUCT,'barrel',[profile]).verified,false);
  assert.equal(getPrintFrame({...PRODUCT,printProcess:'Pad print'},'clip',[profile]).verified,false);
  assert.equal(getPrintFrame(PRODUCT,'clip',[{...profile,marginsMm:{...profile.marginsMm,left:50}}]).invalid,true);
  assert.equal(getPrintFrame(PRODUCT,'clip',[profile,{...profile}]).verified,false);
});

test('both placement respects every asymmetric edge, fixed gap, text-height ratio and unmodified logo geometry',()=>{
  const j=both(),before=structuredClone(j.savedLogo);
  j.textHeightPct=60;
  for(const [offsetX,offsetY,fit,gap] of [[100,100,70,0],[-100,-100,100,100],[0,0,80,1.2]]){
    Object.assign(j,{offsetX,offsetY,fit,gapMm:gap});
    const p=layoutFor(j,PRODUCT,[profile]),[logo,text]=p.parts;
    assert.ok(p.x>=1-1e-6&&p.y>=.75-1e-6);
    assert.ok(p.x+p.width<=16+1e-6&&p.y+p.height<=3.75+1e-6);
    near(text.x-(logo.x+logo.width),p.gap);
    assert.ok(p.gap>=.55);
    near(logo.width,logo.height*3);
    near(text.width,text.height*2);
    near(text.height,logo.height*.6);
  }
  assert.deepEqual(j.savedLogo,before);
  j.textSide='left';
  assert.equal(layoutFor(j,PRODUCT,[profile]).parts[0].kind,'text');
});

test('tracking keeps Thai accents and leading vowels attached and does not split a ligature',()=>{
  const glyphs=t=>[...t].map(char=>({codePoints:[char.codePointAt(0)]}));
  assert.deepEqual(glyphTrackingSlots('เก่บ',glyphs('เก่บ')),[0,0,0,1]);
  assert.deepEqual(glyphTrackingSlots('fix',[{codePoints:[102,105]},{codePoints:[120]}]),[0,1]);
  assert.throws(()=>glyphTrackingSlots('เก่บ',glyphs('กเ่บ')),/ตั้งช่องไฟเป็น 0%/);
  const mockFont={unitsPerEm:1000,layout:text=>({glyphs:glyphs(text).map(g=>({...g,path:{toSVG:()=>'M0 0H100V100Z'},bbox:{minX:0,minY:0,maxX:100,maxY:100}})),positions:[{xAdvance:120,yAdvance:0},{xAdvance:120,yAdvance:0}]})};
  const o=outlineRun(mockFont,'AB',.1);
  assert.match(o.markup,/translate\(220 0\)/);
  assert.equal(o.viewBox,'0 -100 320 100');
  assert.equal(o.trackingEm,.1);
});

test('verified combined artwork exports at location size and text belongs to ink 1',()=>{
  PRINT_PROFILES.push(profile);
  try{
    const j=both();
    j.customerApproved=j.ackNotes=true;
    j.approvalLayoutKey=layoutFingerprint(j,PRODUCT);
    assert.equal(artInkCount(j),2);
    assert.equal(canExportProduction(j),true);
    const composite=artworkSvg(j,'sky'),black=artworkSvg(j,'sky',0),red=artworkSvg(j,'sky',1);
    assert.match(composite,/width="18mm" height="4mm"/);
    assert.doesNotMatch(composite,/<text|data-layout-guides|pen-sky/);
    assert.match(black,/d="M1 0H4V2Z" fill="#181b21"/);
    assert.match(red,/d="M1 0H4V2Z" fill="none"/);
    assert.match(red,/d="M2 0H3V1Z" fill="#ce2445"/);
    assert.match(artworkSvg(j,'sky',-1,{guides:true}),/data-layout-guides/);
    j.gapMm=2;
    assert.equal(canExportProduction(j),false);
    j.approvalLayoutKey=layoutFingerprint(j,PRODUCT);
    j.designReview={status:'pending',note:'ขอเช็กสโลแกน'};
    assert.equal(canExportProduction(j),false);
    assert.throws(()=>exportSvg(j),/ยังส่งออก/);
    const items=new Map(designReviewEntries(j));
    assert.match(items.get('DESIGN-REVIEW.txt'),/ขอเช็กสโลแกน/);
    assert.match(items.get('DESIGN-PREVIEW.svg'),/data-layout-guides/);
    assert.deepEqual(JSON.parse(items.get('PROJECT.json')).project.savedLogo,j.savedLogo);
    j.designReview.status='recorded';
    assert.equal(canExportProduction(j),true);
    j.textArtwork.trackingEm=.15;
    assert.ok(preflight(j).some(i=>i.text.includes('แปลงเป็นเส้นใหม่')));
    j.textArtwork.trackingEm=.08;
    j.savedLogo={...j.savedLogo,vector:false,sourceType:'raster',data:'data:image/png;base64,TEST'};
    assert.equal(canExportProduction(j),false);
    assert.match(artworkSvg(j,'sky'),/<image/);
    assert.doesNotMatch(artworkSvg(j,'sky',0),/<image/);
  }finally{PRINT_PROFILES.pop();}
});
