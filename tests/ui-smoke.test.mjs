import test from 'node:test';
import assert from 'node:assert/strict';

test('initial UI renders and text-editor step is interactive with event bindings',async()=>{
  const listeners={};const app={innerHTML:'',addEventListener(type,callback){listeners[type]=callback;}};
  const storage=new Map();
  globalThis.document={baseURI:'https://example.github.io/sccustom/',querySelector:(sel)=>sel==='#app'?app:null};
  globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  globalThis.window={};
  await import('../app.js');
  assert.match(app.innerHTML,/SCCUSTOM/);
  assert.match(app.innerHTML,/Quantum/);
  assert.match(app.innerHTML,/Colour Variants/);
  const click=async(action,dataset={})=>{
    const btn={dataset:{action,...dataset}};await listeners.click({preventDefault(){},target:{closest(){return btn;}}});
  };
  await click('goto-step',{step:'3'});
  assert.match(app.innerHTML,/Upload & Configure Artwork/);
  await click('artwork-mode',{value:'text'});
  assert.match(app.innerHTML,/data-text-value/);
  assert.match(app.innerHTML,/แปลงข้อความเป็น Vector Paths/);
  await click('go-view',{view:'library'});
  assert.match(app.innerHTML,/Product Master/);
  assert.match(app.innerHTML,/Master Art/);
  assert.match(app.innerHTML,/Add New Product|เพิ่ม Product Master/);
  await click('go-view',{view:'dashboard'});
  assert.match(app.innerHTML,/Google Drive Workspace/);
  assert.match(app.innerHTML,/Import Project JSON/);
});
