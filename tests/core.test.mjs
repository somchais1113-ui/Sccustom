import test from 'node:test';
import assert from 'node:assert/strict';
import {PRODUCT,newJob,position,activeVariants,variantInks} from '../data.js';
import {artworkSvg} from '../vector.js';
import {preflight,canExportProduction,zipFile} from '../exporter.js';

test('reference model and dimensions are fixed in millimeters',()=>{
  assert.equal(PRODUCT.model,'341224');
  assert.equal(PRODUCT.printWidthMm,28.3);
  assert.equal(PRODUCT.printHeightMm,4.5);
  assert.equal(PRODUCT.variants.length,6);
});
test('auto-fit and offsets always remain within print area',()=>{
  const j=newJob();j.offsetX=100;j.offsetY=-100;j.fit=100;
  const p=position(j);
  assert.ok(p.x>=0&&p.y>=0);
  assert.ok(p.x+p.width<=PRODUCT.printWidthMm+0.001);
  assert.ok(p.y+p.height<=PRODUCT.printHeightMm+0.001);
});
test('single ink is shared across six enabled variants',()=>{
  const j=newJob();assert.equal(activeVariants(j).length,6);
  assert.deepEqual(variantInks(j,'sky'),variantInks(j,'black'));
});
test('SVG physical width/height use mm, not screen pixels',()=>{
  const j=newJob();const s=artworkSvg(j,'sky');
  assert.match(s,/width="28\.3mm"/);assert.match(s,/height="4\.5mm"/);
  assert.doesNotMatch(s,/pen-sky/);
});
test('production locked until approved, acknowledged and vector supplied',()=>{
  const j=newJob();assert.equal(canExportProduction(j),false);
  j.logo={sourceType:'svg',name:'test.svg',vector:true,viewBox:'0 0 100 20',aspect:5,palette:['#000000'],markup:'<rect x="0" y="0" width="100" height="20" fill="#000000" stroke="none"></rect>'};
  j.customerApproved=true;j.ackNotes=true;
  assert.equal(canExportProduction(j),true);
  j.inkCount=3;
  assert.ok(preflight(j).some(x=>x.level==='warn'));
});
test('ZIP archives are valid store-mode ZIP with central directory',async()=>{
  const blob=zipFile([['a.txt','hello'],['group/item.svg','<svg/>']]);
  const a=new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual([...a.slice(0,4)],[0x50,0x4b,0x03,0x04]);
  assert.deepEqual([...a.slice(-22,-18)],[0x50,0x4b,0x05,0x06]);
});
