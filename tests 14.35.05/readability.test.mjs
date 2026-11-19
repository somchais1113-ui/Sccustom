import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('screen text styles use readable, scalable sizes and the brand select has a touch-sized target',async()=>{
  const css=await readFile(new URL('../styles.css',import.meta.url),'utf8');
  const sizes=[...css.matchAll(/font-size:([\d.]+)rem/g)].map(([,size])=>Number(size));
  assert.ok(sizes.length>30);
  assert.ok(sizes.every(size=>size>=.875));
  assert.match(css,/:root\{[^}]+font-size:100%/);
  assert.match(css,/\.brand-select\{[^}]+min-height:44px[^}]+font-size:1rem/);
  assert.doesNotMatch(css,/font-size:0(?:[;}]|px)/);
});
