import test from 'node:test';
import assert from 'node:assert/strict';
import {newJob, PRODUCT} from '../data.js';
import {studioStatus} from '../studio-status.js';
import {PRINT_PROFILES} from '../config/print-profiles.js';
import {layoutFingerprint} from '../print-layout.js';
import {canExportProduction} from '../exporter.js';

const readyLogo={sourceType:'svg',name:'test.svg',vector:true,aspect:3,viewBox:'0 0 3 1',palette:['#000000'],markup:'<path d="M0 0H2V1Z" fill="#000000"/>'};
test('the demo is not displayed as a complete artwork',()=>{
  const status=studioStatus(newJob());
  assert.equal(status.fit.tone,'muted');
  assert.equal(status.production.target,'studio-content');
});
test('fit stays separate from production locks and routes to the relevant panel',()=>{
  const j={...newJob(),logo:{...readyLogo}};
  const initial=studioStatus(j);
  assert.equal(initial.fit.tone,'ok');
  assert.equal(initial.production.tone,'hold');
  assert.equal(initial.production.target,'studio-profile');
  j.designReview={status:'pending'};
  assert.equal(studioStatus(j).production.target,'studio-design-review');
  j.inkCount=2;
  assert.equal(studioStatus(j).production.target,'variants');
  j.logo={...readyLogo,vector:false,sourceType:'raster'};
  assert.equal(studioStatus(j).production.target,'studio-content');
  Object.values(j.variants).forEach(v=>{v.enabled=false;});
  assert.equal(studioStatus(j).production.target,'variants');
});
test('verified profile still requires approval, and positive production status agrees with exporter',()=>{
  const p=PRINT_PROFILES.find(p=>p.productId===PRODUCT.id);
  const original=p.verified;
  try{
    p.verified=true;
    const j={...newJob(),logo:{...readyLogo}};
    assert.equal(studioStatus(j).production.target,'review');
    assert.equal(studioStatus(j).production.tone,'hold');
    j.customerApproved=j.ackNotes=true;
    j.approvalLayoutKey=layoutFingerprint(j,PRODUCT);
    assert.equal(studioStatus(j).production.tone,'ok');
    assert.equal(canExportProduction(j),true);
  }finally{p.verified=original;}
});
