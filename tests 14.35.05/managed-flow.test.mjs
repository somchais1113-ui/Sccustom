import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

test('configured logo is selected for both A4 documents without affecting the uploaded artwork', async t => {
  const dir=await mkdtemp(join(tmpdir(),'sccustom-managed-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const root=fileURLToPath(new URL('../',import.meta.url));
  for(const n of ['package.json','app.js','data.js','brand-logos.js','config','vector.js','exporter.js','text-outline.js','drive-sync.js','print-layout.js','compose-ui.js','studio-status.js']){
    await cp(join(root,n),join(dir,n),{recursive:true});
  }
  const config=join(dir,'config','brand-logos.js');
  await writeFile(config, "export const BRAND_LOGO_FILES = {elfen:'assets/brand-logos/test.svg',quantum:'assets/brand-logos/test-quantum.svg',elephant:'assets/brand-logos/missing.png'};");
  const {newJob}=await import(pathToFileURL(join(dir,'data.js')));
  const j={...newJob(),brandId:'custom',customBrandLogo:'data:image/png;base64,LEGACY_TEST',customer:'Customer Test'};
  j.logo={sourceType:'svg',name:'logo.svg',vector:true,palette:['#000000'],aspect:4,viewBox:'0 0 8 2',markup:'<path fill="#000000" d="M1 0 L8 0 L1 2Z"/>'};
  const artworkBefore=JSON.stringify(j.logo);
  const listeners={};
  const app={innerHTML:'',addEventListener(type,callback){listeners[type]=callback;}};
  let saved=JSON.stringify({jobs:[j],jobIndex:0});
  globalThis.localStorage={getItem:k=>k==='sccustom-artwork-studio-v1'?saved:null,setItem(k,v){if(k==='sccustom-artwork-studio-v1')saved=v;}};
  let focusedId='';
  const currentPicker={focus(){focusedId='template-brand';}};
  globalThis.document={baseURI:'https://example.github.io/Sccustom/',querySelector:sel=>sel==='#app'?app:sel==='#template-brand'?currentPicker:null,querySelectorAll:()=>[]};
  globalThis.Image=class {
    set src(url){
      this.naturalWidth=this.naturalHeight=/\/test(?:-quantum)?\.svg$/.test(url)?50:0;
      queueMicrotask(()=>this.naturalWidth?this.onload():this.onerror());
    }
  };
  const printButton={addEventListener(){}};
  const status={};
  const logo={complete:true,naturalWidth:50,addEventListener(){}};
  let html='';
  globalThis.window={open:()=>({document:{open(){},write(s){html=s;},close(){},querySelector(){return logo;},getElementById:id=>id==='proof-print'?printButton:status},focus(){}})};
  await import(pathToFileURL(join(dir,'app.js')));
  assert.match(app.innerHTML,/งานเดิมใช้โลโก้หัวเอกสารที่อัปโหลดเอง/);
  assert.match(app.innerHTML,/เปิดไฟล์โลโก้ไม่ได้/);
  assert.match(app.innerHTML,/data-action="proof" disabled/);

  const change=async (value,disabled=false)=>{
    const target={matches:s=>s==='[data-brand]',value,disabled};
    document.activeElement=target;
    await listeners.change({target});
  };
  await change('elephant');
  assert.equal(JSON.parse(saved).jobs[0].brandId,'custom');
  assert.match(app.innerHTML,/<option value="elfen">Elfen<\/option>/);
  assert.match(app.innerHTML,/<option value="elephant" disabled>/);
  assert.match(app.innerHTML,/<option value="" disabled selected>/);
  assert.ok(app.innerHTML.indexOf('class="brand-current')<app.innerHTML.indexOf('id="template-brand"'));

  for(const [id, name, asset] of [['elfen','Elfen','test.svg'],['quantum','Quantum','test-quantum.svg']]){
    await change(id);
    assert.equal(focusedId,'template-brand');
    assert.equal(JSON.parse(saved).jobs[0].brandId,id);
    assert.equal(JSON.stringify(JSON.parse(saved).jobs[0].logo),artworkBefore);
    assert.ok(app.innerHTML.includes(`<option value="${id}" selected>${name}</option>`));
    const expectedUrl=`https://example.github.io/Sccustom/assets/brand-logos/${asset}`;
    assert.match(app.innerHTML,/<div class="brand-current has-logo">/);
    assert.ok(app.innerHTML.includes(`<img src="${expectedUrl}" alt=""><strong>${name}</strong>`));
    assert.ok(app.innerHTML.includes(`<div class="paper-brand"><img alt="" src="${expectedUrl}">`));
    assert.doesNotMatch(app.innerHTML,/data-action="proof" disabled/);
    for(const action of ['proof','prod-pdf']){
      await listeners.click({preventDefault(){},target:{closest:()=>({dataset:{action}})}});
      assert.ok(html.includes(`<img src="${expectedUrl}"`));
      assert.match(html,/Customer Test/);
      assert.doesNotMatch(html,/LEGACY_TEST/);
      assert.equal(printButton.disabled,false);
    }
  }
});
