import test from 'node:test';
import assert from 'node:assert/strict';
import {PRODUCT, CATALOG_BRANDS, proposedFilename, newJob, applyProductToJob, activateJobProduct, productCatalog} from '../data.js';
import {outlineRun} from '../text-outline.js';
import {artworkSvg} from '../vector.js';
import {preflight} from '../exporter.js';

test('all eight product brands are present with unique internal codes',()=>{
  assert.equal(CATALOG_BRANDS.length,8);
  assert.equal(new Set(CATALOG_BRANDS.map(b=>b.code)).size,8);
  assert.equal(CATALOG_BRANDS.find(b=>b.name==='Mitsubishi').code,'MIT');
});
test('file naming convention excludes unsafe characters and preserves stable pattern',()=>{
  assert.equal(proposedFilename('QTM','341224','Sky Blue'),'qtm_341224_sky-blue_side_web_v001.webp');
});
test('product switches keep a job snapshot, preserving old specs when switching',()=>{
  const a=newJob(),p={...structuredClone(PRODUCT),id:'ELP-TEST',brand:'Elephant',model:'TEST',printWidthMm:18,printHeightMm:3,variants:[{id:'a',name:'a',en:'a',photo:'assets/pen-sky.webp',swatch:'#eee'}]};
  applyProductToJob(a,p);
  assert.equal(a.productSpec.brand,'Elephant');assert.equal(PRODUCT.printWidthMm,18);
  const another=newJob();
  assert.equal(another.productSpec.brand,'Elephant');
  activateJobProduct(a);assert.equal(PRODUCT.printHeightMm,3);
  assert.equal(Object.keys(a.variants).length,1);
});
test('text outline builds path data, not editable text elements',()=>{
  const fake={layout(){return {glyphs:[{path:{toSVG:()=> 'M0 0L500 0L500 700Z'},bbox:{minX:0,minY:0,maxX:500,maxY:700}}],positions:[{xAdvance:600,yAdvance:0,xOffset:0,yOffset:0}]};}};
  const out=outlineRun(fake,'A');
  assert.equal(out.sourceType,'text');assert.equal(out.vector,true);
  assert.match(out.markup,/<path /);assert.doesNotMatch(out.markup,/<text[\s>]/);
  assert.equal(out.viewBox,'0 -700 500 700');
  const j=newJob();j.logo=out;
  assert.match(artworkSvg(j,PRODUCT.variants[0].id),/width="18mm" height="3mm"/);
  assert.doesNotMatch(artworkSvg(j,PRODUCT.variants[0].id),/<text[\s>]/);
  j.textArtwork={text:'AB',status:'not-generated'};j.logo.vector=false;
  assert.ok(preflight(j).some(i=>i.level==='block'));
});
