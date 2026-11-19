const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8');
const sales = 'sale@example.com', other = 'other@example.com', design = 'design@example.com';
const intake = 'intake_folder_01', archive = 'archive_folder_01';
const one = 'zip_file_id_001', two = 'zip_file_id_002', three = 'zip_file_id_003';

function fixture() {
  const props = {
    SHEET_ID: 'spreadsheet_id_01', INTAKE_FOLDER_ID: intake, ARCHIVE_FOLDER_ID: archive,
    WORKSPACE_DOMAIN: 'example.com', SALES_EMAILS: sales + ',' + other, DESIGN_EMAILS: design,
  };
  const files = new Map(), rows = [], copyCalls = [];
  let actor = sales, busy = false, held = false, maxRows = 2, format = null, counter = 0, tab;
  const storeRow = (index, values) => {
    rows[index] = Array.from(values, value =>
      typeof value === 'string' && value.startsWith("'") ? value.slice(1) : value);
  };
  const sheet = {
    getLastRow: () => rows.length,
    getMaxRows: () => maxRows,
    insertRowsAfter: (index,n) => { assert.equal(index,maxRows); maxRows += n; },
    appendRow: (v) => storeRow(rows.length,v),
    setFrozenRows: (n) => assert.equal(n,1),
    getRange(row,col,n,width) {
      assert.ok(row+n-1<=maxRows);
      assert.equal(col,1);
      const select = () => rows.slice(row-1,row+n-1).map(r=>r.slice(0,width));
      return {
        getValues: select,
        getDisplayValues: () => select().map(r=>r.map(String)),
        setBackground() { return this; },
        setFontColor() { return this; },
        setFontWeight() { return this; },
        setNumberFormat(f) { format=f; return this; },
        setValues(v) {
          assert.ok(held); assert.equal(format,'@');
          assert.equal(v.length,n); assert.equal(v[0].length,width);
          v.forEach((r,i)=>storeRow(row-1+i,r));
        },
      };
    },
  };
  const ctx = vm.createContext({
    Session: {getActiveUser:()=>({getEmail:()=>actor})},
    PropertiesService: {getScriptProperties:()=>({getProperties:()=>props})},
    SpreadsheetApp: {
      openById: id => {
        assert.equal(id,props.SHEET_ID);
        return {getSheetByName:()=>tab,insertSheet:()=>tab=sheet};
      },
      flush: () => assert.ok(held),
    },
    Drive: {Files: {
      get: (id,opt) => {
        assert.equal(opt.supportsAllDrives,true);
        const f=files.get(id); if(!f)throw Error('Drive file missing'); return structuredClone(f);
      },
      copy: (meta,id,opt) => {
        assert.equal(opt.supportsAllDrives,true); assert.ok(held);
        assert.equal(meta.parents[0],archive);
        const dest='snapshot_file_'+(copyCalls.length+1);
        const file={...files.get(id),id:dest,name:meta.name,parents:[archive]};
        copyCalls.push({meta,id,dest}); files.set(dest,file);
        return structuredClone(file);
      },
    }},
    LockService: {getScriptLock:()=>({
      tryLock:()=>busy||held?false:held=true,
      releaseLock:()=>{assert.ok(held);held=false;},
    })},
    Utilities: {
      DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},
      computeDigest: (alg,value,enc) => Array.from(crypto.createHash(alg).update(value,enc).digest()),
      getUuid: () => 'event-'+(++counter),
    },
    Logger: {log(){}}, console:{error(){}},
  });
  vm.runInContext(code,ctx);
  [intake,archive].forEach(id=>files.set(id,{id,mimeType:'application/vnd.google-apps.folder',capabilities:{canAddChildren:true}}));
  ['1','2','3'].forEach((n,i)=>files.set([one,two,three][i],{
    id:[one,two,three][i],name:'design-'+n+'.zip',mimeType:'application/zip',
    parents:[intake],md5Checksum:n.repeat(32),size:'1000',capabilities:{canCopy:true},
  }));
  ctx.setup_(); ctx.setup_();
  assert.equal(rows.length,1);
  return {api:ctx,files,rows,copyCalls,actor:(a)=>{actor=a;},busy:(v)=>{busy=v;}};
}
function form(id=one, extra={}) {
  return {jobCode:'ART-2026-001000',product:'Q-01',studioRev:'001',note:'ส่งตรวจช่องไฟ',
    link:'https://drive.google.com/file/d/'+id+'/view?usp=sharing',...extra};
}
function ok(r){ assert.equal(r.ok,true,r.message);return r.data; }
function denied(r,re){ assert.equal(r.ok,false);assert.match(r.message,re); }

test('แยกบัญชีบริษัท, Sale เจ้าของงาน และ Design ตามสิทธิ์', () => {
  const f=fixture();
  f.actor(''); denied(f.api.getQueue({}),/ยืนยันบัญชี/);
  f.actor('person@ext.example.com'); denied(f.api.getQueue({}),/ยืนยันบัญชี/);
  f.actor('guest@example.com'); denied(f.api.getQueue({}),/ไม่ได้รับสิทธิ์/);
  f.actor(sales); const row=ok(f.api.submitRevision(form())).row;
  assert.equal(row.fileUrl,'');
  denied(f.api.recordDecision({submissionId:row.submissionId,decision:'APPROVED'}),/เฉพาะ Design/);
  f.actor(other); assert.equal(ok(f.api.getQueue({})).count,0);
  denied(f.api.getHistory(row.queueId),/ไม่พบงาน/);
  f.actor(design);
  assert.match(ok(f.api.getHistory(row.queueId))[0].fileUrl,/snapshot_file_1/);
  denied(f.api.submitRevision(form(two)),/ไม่มีสิทธิ์ส่งแบบ/);
});

test('ส่ง ZIP ซ้ำรายการเดิมได้แบบไม่เพิ่มแถวหรือสำเนา และห้ามทับข้อมูลเดิม', () => {
  const f=fixture();
  const saved=ok(f.api.submitRevision(form()));
  const retry=ok(f.api.submitRevision(form()));
  assert.equal(retry.duplicate,true);
  assert.equal(saved.row.submissionId,retry.row.submissionId);
  assert.equal(retry.row.studioRev,'001');
  assert.equal(f.copyCalls.length,1);
  assert.equal(f.rows.length,2);
  denied(f.api.submitRevision(form(one,{note:'แก้ข้อความย้อนหลัง'})),/ย้อนหลัง/);
  f.actor(other); denied(f.api.submitRevision(form(one)),/มีรายการในคิวแล้ว/);
  f.actor(sales); f.files.get(one).md5Checksum='a'.repeat(32);
  denied(f.api.submitRevision(form()),/ถูกเปลี่ยนหลังส่งตรวจ/);
  assert.equal(f.rows.length,2);
});

test('ตรวจลิงก์ กรองไฟล์รับงาน และปฏิเสธ ZIP ที่เนื้อหาตรงฉบับล่าสุด', () => {
  const f=fixture();
  denied(f.api.submitRevision(form(one,{link:'https://drive.google.com.evil/file/d/'+one+'/view'})),/วางลิงก์/);
  f.files.get(one).parents=[archive]; denied(f.api.submitRevision(form()),/ต้องเป็นไฟล์ ZIP/);
  f.files.get(one).parents=[intake]; f.files.get(one).mimeType='text/html';
  denied(f.api.submitRevision(form()),/ต้องเป็นไฟล์ ZIP/);
  f.files.get(one).mimeType='application/zip'; f.files.get(one).size=undefined;
  denied(f.api.submitRevision(form()),/ต้องเป็นไฟล์ ZIP/);
  f.files.get(one).size='800'; ok(f.api.submitRevision(form()));
  f.files.get(two).md5Checksum=f.files.get(one).md5Checksum;
  denied(f.api.submitRevision(form(two)),/เนื้อหาเหมือน/);
  assert.equal(f.copyCalls.length,1);
});

test('R01 ขอแก้ → R02 ตรวจผ่าน → R03 รอตรวจ โดยไม่ทับประวัติผลและผู้ตรวจ', () => {
  const f=fixture(), r1=ok(f.api.submitRevision(form())).row;
  f.actor(design);
  denied(f.api.recordDecision({submissionId:r1.submissionId,decision:'CHANGES',note:' '}),/ระบุสิ่งที่ต้องแก้/);
  const changes=ok(f.api.recordDecision({submissionId:r1.submissionId,decision:'CHANGES',note:'เพิ่มช่องไฟระหว่างโลโก้กับชื่อ'}));
  assert.equal(changes.reviewer,design); assert.ok(changes.reviewedAt);
  f.actor(sales);
  const r2=ok(f.api.submitRevision(form(two,{studioRev:'002'}))).row;
  assert.equal(r2.rev,2);
  f.actor(design);
  denied(f.api.recordDecision({submissionId:r1.submissionId,decision:'APPROVED'}),/ไม่ใช่ฉบับล่าสุด/);
  ok(f.api.recordDecision({submissionId:r2.submissionId,decision:'APPROVED'}));
  denied(f.api.recordDecision({submissionId:r2.submissionId,decision:'CHANGES',note:'ลองทับ'}),/มีผลตรวจแล้ว/);
  f.actor(sales); ok(f.api.submitRevision(form(three)));
  f.actor(design);
  const h=ok(f.api.getHistory(r1.queueId));
  assert.equal(Array.from(h,r=>r.state).join(','),'PENDING,APPROVED,CHANGES');
  assert.match(h[1].fileUrl,/snapshot_file_2/);
  assert.equal(h[2].resultNote,'เพิ่มช่องไฟระหว่างโลโก้กับชื่อ');
  assert.equal(h[1].reviewer,design);
  const q=ok(f.api.getQueue({text:'q-01',state:'PENDING'}));
  assert.equal(q.rows.length,1); assert.equal(q.rows[0].rev,3);
  assert.equal(ok(f.api.getQueue({state:'APPROVED'})).count,0);
  assert.equal(f.rows.length,6);
});

test('ล็อกไม่ว่าง ฉบับรอตรวจเก่า และสำเนาที่ถูกแก้ ไม่สามารถบันทึกผลได้', () => {
  const f=fixture();
  f.busy(true); denied(f.api.submitRevision(form()),/กำลังประมวลผล/);
  f.busy(false); const r1=ok(f.api.submitRevision(form())).row;
  const r2=ok(f.api.submitRevision(form(two))).row;
  f.actor(design);
  denied(f.api.recordDecision({submissionId:r1.submissionId,decision:'APPROVED'}),/ไม่ใช่ฉบับล่าสุด/);
  f.files.get(f.copyCalls[1].dest).md5Checksum='a'.repeat(32);
  denied(f.api.recordDecision({submissionId:r2.submissionId,decision:'APPROVED'}),/สำเนาตรวจแบบถูกเปลี่ยน/);
  assert.equal(f.rows.length,3);
});

test('เปลี่ยนไฟล์ต้นทางภายหลังไม่เปลี่ยนสำเนาที่ Design ตรวจ', () => {
  const f=fixture(), row=ok(f.api.submitRevision(form())).row;
  f.files.get(one).md5Checksum='f'.repeat(32);
  f.actor(design);
  assert.equal(ok(f.api.recordDecision({submissionId:row.submissionId,decision:'APPROVED'})).state,'APPROVED');
});

test('ช่องข้อความที่คล้ายสูตรและข้อมูลเลขศูนย์นำหน้าถูกเก็บเป็นข้อความ', () => {
  const f=fixture(), payload='=HYPERLINK("https://example.com")';
  const row=ok(f.api.submitRevision(form(one,{product:'0008',studioRev:'0003',note:payload}))).row;
  const h=ok(f.api.getHistory(row.queueId))[0];
  assert.equal(h.product,'0008'); assert.equal(h.studioRev,'0003');
  assert.equal(h.note,payload);
});
