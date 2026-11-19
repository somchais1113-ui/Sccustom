import test from 'node:test';
import assert from 'node:assert/strict';
import { BRANDS, brandLogos, createBrandLogoRegistry, isBrandLogoPath } from '../brand-logos.js';
import { newJob } from '../data.js';
import { openPdfPrint } from '../exporter.js';

test('managed brands have stable IDs and no job-upload entry', () => {
  assert.equal(BRANDS.length, 9);
  assert.equal(new Set(BRANDS.map(x=>x.id)).size, 9);
  assert.ok(!BRANDS.some(x=>x.id==='custom'));
  assert.equal(newJob().brandId, null);
});

test('only configured and loadable logo assets are offered under a GitHub Pages subpath', async () => {
  const attempts = [];
  const registry = createBrandLogoRegistry({
    quantum:'assets/brand-logos/quantum.svg',
    elephant:'assets/brand-logos/elephant.png',
    elfen:'https://example.org/elfen.png',
    sccustom:null,
  }, async url => { attempts.push(url); return url.endsWith('quantum.svg'); });
  await registry.initialize('https://example.github.io/Sccustom/');
  assert.equal(registry.get('quantum').url,'https://example.github.io/Sccustom/assets/brand-logos/quantum.svg');
  assert.equal(registry.status('quantum'),'ready');
  assert.equal(registry.get('elephant'),null);
  assert.equal(registry.status('elephant'),'unavailable');
  assert.equal(registry.status('elfen'),'unavailable');
  assert.equal(registry.status('sccustom'),'unset');
  assert.equal(attempts.length,2);
  assert.ok(!isBrandLogoPath('assets/brand-logos/../elfen.svg'));
});

test('default package does not print placeholder or imported per-job brand marks', async () => {
  await brandLogos.initialize('https://example.github.io/Sccustom/');
  for(const brandId of [null,'quantum','elfen','custom','unknown']){
    const j={...newJob(),brandId,customBrandLogo:'data:image/png;base64,unused'};
    assert.throws(()=>openPdfPrint(j,'proof'),/กรุณาเลือกแบรนด์ที่ตั้งโลโก้แล้ว/);
    assert.throws(()=>openPdfPrint(j,'production'),/กรุณาเลือกแบรนด์ที่ตั้งโลโก้แล้ว/);
  }
});
