const TAB_='SCCUSTOM_ReviewLog';
const HEADERS_=['Event ID','Event','Queue ID','Job code','Queue revision','Studio revision','Product',
  'Actor email','Time UTC','State','Note','Intake file ID','Original filename','Snapshot ID','MD5'];
const FILE_FIELDS_='id,name,mimeType,parents,trashed,md5Checksum,size,capabilities(canCopy,canAddChildren)';

function doGet(){
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('SCCUSTOM · คิวตรวจแบบ')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}
function getQueue(query){return rpc_(()=>{
  const cfg=config_(), who=actor_(cfg), sheet=sheet_(cfg);
  const index=load_(sheet);
  const search=plain_(query?.text,120).toUpperCase();
  const state=plain_(query?.state,30);
  const matches=[...index.jobs.values()]
    .map(versions=>versions[versions.length-1])
    .filter(row=>canSee_(row,who))
    .filter(row=>(!search||[row.jobCode,row.product,row.owner].some(v=>v.toUpperCase().includes(search)))&&(!state||row.state===state))
    .sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));
  const limit=40,pages=Math.max(1,Math.ceil(matches.length/limit));
  const page=Math.min(pages,Math.max(1,Number.isInteger(query?.page)?query.page:1));
  return {actor:who,rows:matches.slice((page-1)*limit,page*limit).map(r=>publicRow_(r,who)),count:matches.length,page,pages};
});}
function getHistory(queueId){return rpc_(()=>{
  const cfg=config_(),who=actor_(cfg),index=load_(sheet_(cfg));
  const versions=index.jobs.get(String(queueId||''));
  if(!versions||!canSee_(versions[0],who))stop_('ไม่พบงานที่คุณมีสิทธิ์ดู');
  return versions.slice().reverse().map((r,i)=>({...publicRow_(r,who),latest:i===0}));
});}
function submitRevision(input){return rpc_(()=>{
  const cfg=config_(),who=actor_(cfg);
  if(!who.sales)stop_('บัญชีนี้ไม่มีสิทธิ์ส่งแบบ');
  const jobCode=jobCode_(input?.jobCode);
  const product=required_(input?.product,120,'ระบุรุ่นปากกา');
  const notes=plain_(input?.note,800);
  const studioRev=plain_(input?.studioRev,30);
  const sourceId=parseDriveLink_(input?.link);
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))stop_('คิวกำลังประมวลผล กรุณารอสักครู่แล้วลองใหม่');
  try{
    const sheet=sheet_(cfg), index=load_(sheet), existing=index.intake.get(sourceId);
    const queueId=queueKey_(who.email,jobCode);
    if(existing&&existing.queueId!==queueId)stop_('ลิงก์นี้มีรายการในคิวแล้ว กรุณาใช้ไฟล์ ZIP ใหม่');
    const file=Drive.Files.get(sourceId,{supportsAllDrives:true,fields:FILE_FIELDS_});
    const size=Number(file.size);
    if(file.trashed||!file.parents?.includes(cfg.intake)||!file.capabilities?.canCopy||
       !['application/zip','application/x-zip-compressed','application/octet-stream'].includes(file.mimeType)||
       !/\.zip$/i.test(file.name||'')||!/^([a-f0-9]{32})$/i.test(file.md5Checksum||'')||!Number.isFinite(size)||size<=0)
      stop_('ต้องเป็นไฟล์ ZIP ที่คัดลอกได้และอยู่ในโฟลเดอร์รับงานที่กำหนด');
    if(existing){
      if(existing.md5!==file.md5Checksum)stop_('ไฟล์เดิมถูกเปลี่ยนหลังส่งตรวจ กรุณาอัปโหลด ZIP เป็นไฟล์ใหม่และใช้ลิงก์ใหม่');
      if(existing.product!==product||existing.studioRev!==studioRev||existing.note!==notes)
        stop_('ไฟล์นี้ถูกส่งตรวจแล้วและไม่สามารถแก้รายการย้อนหลังได้ หากจะส่งข้อมูลหรือไฟล์แก้ ให้สร้างรายการด้วย ZIP ไฟล์ใหม่');
      return {duplicate:true,row:publicRow_(existing,who)};
    }
    const versions=index.jobs.get(queueId)||[];
    const latest=versions[versions.length-1];
    if(latest?.md5===file.md5Checksum)stop_('ไฟล์นี้มีเนื้อหาเหมือน Revision ล่าสุด กรุณาส่ง ZIP ฉบับแก้ไข');
    const rev=(latest?.rev||0)+1;
    const copy=Drive.Files.copy({name:jobCode+'-R'+String(rev).padStart(2,'0')+'-'+queueId+'.zip',parents:[cfg.archive]},sourceId,
      {supportsAllDrives:true,fields:'id,parents,md5Checksum'});
    if(!idOK_(copy?.id)||!copy.parents?.includes(cfg.archive)||copy.md5Checksum!==file.md5Checksum)
      stop_('สำเนาตรวจสอบไม่ผ่าน กรุณาติดต่อผู้ดูแลก่อนส่งอีกครั้ง');
    const row=[Utilities.getUuid(),'SUBMIT',queueId,jobCode,rev,studioRev,product,who.email,new Date().toISOString(),
      'PENDING',notes,sourceId,file.name,copy.id,copy.md5Checksum];
    append_(sheet,row);
    return {duplicate:false,row:publicRow_(fromSubmit_(row),who)};
  }finally{lock.releaseLock();}
});}
function recordDecision(input){return rpc_(()=>{
  const cfg=config_(),who=actor_(cfg);
  if(!who.design)stop_('เฉพาะ Design ที่ได้รับสิทธิ์เท่านั้นที่บันทึกผลตรวจได้');
  const decision=String(input?.decision||'');
  if(!['APPROVED','CHANGES'].includes(decision))stop_('เลือกผลตรวจให้ถูกต้อง');
  const note=decision==='CHANGES'?required_(input?.note,800,'ระบุสิ่งที่ต้องแก้'):plain_(input?.note,800);
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))stop_('คิวกำลังประมวลผล กรุณารอสักครู่แล้วลองใหม่');
  try{
    const sheet=sheet_(cfg),index=load_(sheet),row=index.events.get(String(input?.submissionId||''));
    if(!row)stop_('ไม่พบ Revision ที่ระบุ');
    const versions=index.jobs.get(row.queueId);
    // Refuse decisions from an out-of-date browser, even if its form was already open.
    if(versions[versions.length-1]!==row||row.state!=='PENDING')stop_('Revision นี้ไม่ใช่ฉบับล่าสุด หรือมีผลตรวจแล้ว กรุณาโหลดคิวใหม่');
    const snapshot=Drive.Files.get(row.snapshotId,{supportsAllDrives:true,fields:'id,parents,trashed,md5Checksum'});
    if(snapshot.trashed||!snapshot.parents?.includes(cfg.archive)||snapshot.md5Checksum!==row.md5)
      stop_('ไฟล์สำเนาตรวจแบบถูกเปลี่ยน ย้าย หรือลบ ไม่สามารถบันทึกผลตรวจได้');
    const at=new Date().toISOString();
    append_(sheet,[Utilities.getUuid(),'DECIDE',row.queueId,row.jobCode,row.rev,row.studioRev,row.product,who.email,at,
      decision,note,'','','','']);
    return publicRow_({...row,state:decision,reviewer:who.email,reviewedAt:at,resultNote:note},who);
  }finally{lock.releaseLock();}
});}

function setup_(){
  const cfg=config_();
  for(const id of [cfg.intake,cfg.archive]){
    const folder=Drive.Files.get(id,{supportsAllDrives:true,fields:'id,mimeType,trashed,capabilities(canAddChildren)'});
    if(folder.trashed||folder.mimeType!=='application/vnd.google-apps.folder')stop_('ตั้งค่าโฟลเดอร์รับงานหรือโฟลเดอร์สำเนาไม่ถูกต้อง');
    if(id===cfg.archive&&!folder.capabilities?.canAddChildren)stop_('บัญชีที่ Deploy ต้องสร้างสำเนาในโฟลเดอร์สำเนาได้');
  }
  const db=SpreadsheetApp.openById(cfg.sheet);
  const tab=db.getSheetByName(TAB_)||db.insertSheet(TAB_);
  if(tab.getLastRow()===0){tab.appendRow(HEADERS_);tab.setFrozenRows(1);tab.getRange(1,1,1,HEADERS_.length).setBackground('#112e48').setFontColor('#ffffff').setFontWeight('bold');}
  sheet_(cfg);
  Logger.log('พร้อมตั้งค่า Deploy · '+TAB_);
}
function config_(){
  const p=PropertiesService.getScriptProperties().getProperties();
  if(!idOK_(p.SHEET_ID)||!idOK_(p.INTAKE_FOLDER_ID)||!idOK_(p.ARCHIVE_FOLDER_ID)||p.ARCHIVE_FOLDER_ID===p.INTAKE_FOLDER_ID)
    stop_('ยังตั้งค่า Sheets/Drive ไม่ครบ กรุณาติดต่อผู้ดูแล');
  const domain=String(p.WORKSPACE_DOMAIN||'').trim().toLowerCase();
  const emails=k=>new Set(String(p[k]||'').split(/[\s,;]+/).map(x=>x.trim().toLowerCase()).filter(Boolean));
  const sales=emails('SALES_EMAILS'),design=emails('DESIGN_EMAILS');
  if(!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain)||!sales.size||!design.size||
    [...sales,...design].some(e=>e.split('@').length!==2||!e.endsWith('@'+domain)))
    stop_('ยังตั้งค่าโดเมนหรืออีเมล Sales/Design ไม่ครบ กรุณาติดต่อผู้ดูแล');
  return {sheet:p.SHEET_ID,intake:p.INTAKE_FOLDER_ID,archive:p.ARCHIVE_FOLDER_ID,domain,sales,design};
}
function actor_(cfg){
  const email=String(Session.getActiveUser().getEmail()||'').trim().toLowerCase();
  if(!email||!email.endsWith('@'+cfg.domain))stop_('ระบบยืนยันบัญชี Workspace ไม่ได้ กรุณาใช้บัญชีบริษัทที่ได้รับสิทธิ์');
  const sales=cfg.sales.has(email),design=cfg.design.has(email);
  if(!sales&&!design)stop_('บัญชีนี้ยังไม่ได้รับสิทธิ์เข้าคิวตรวจ');
  return {email,sales,design};
}
function sheet_(cfg){
  const tab=SpreadsheetApp.openById(cfg.sheet).getSheetByName(TAB_);
  if(!tab||tab.getRange(1,1,1,HEADERS_.length).getDisplayValues()[0].join('|')!==HEADERS_.join('|'))
    stop_('ทะเบียนยังไม่พร้อม กรุณาให้ผู้ดูแลรัน setup_');
  return tab;
}
function load_(tab){
  const jobs=new Map(), events=new Map(), intake=new Map();
  const n=tab.getLastRow();
  const rows=n>1?tab.getRange(2,1,n-1,HEADERS_.length).getValues():[];
  for(const x of rows){
    if(x[1]==='SUBMIT'){
      const row=fromSubmit_(x),versions=jobs.get(row.queueId)||[];
      versions.push(row);jobs.set(row.queueId,versions);events.set(row.submissionId,row);intake.set(row.sourceId,row);
    }else if(x[1]==='DECIDE'){
      const versions=jobs.get(String(x[2]));
      const row=versions?.find(r=>r.rev===Number(x[4]));
      if(row&&row.state==='PENDING'){
        row.state=String(x[9]);row.reviewer=String(x[7]);row.reviewedAt=iso_(x[8]);row.resultNote=String(x[10]||'');
      }
    }
  }
  return {jobs,events,intake};
}
function fromSubmit_(x){return {submissionId:String(x[0]),queueId:String(x[2]),jobCode:String(x[3]),rev:Number(x[4]),
  studioRev:String(x[5]||''),product:String(x[6]),owner:String(x[7]),submittedAt:iso_(x[8]),state:String(x[9]),
  note:String(x[10]||''),sourceId:String(x[11]),fileName:String(x[12]),snapshotId:String(x[13]),md5:String(x[14])};}
function canSee_(row,who){return who.design||row.owner===who.email;}
function publicRow_(row,who){
  const {snapshotId,sourceId,md5,...data}=row;
  return {...data,fileUrl:who.design?'https://drive.google.com/open?id='+encodeURIComponent(snapshotId):''};
}
function append_(sheet,row){
  // Keep leading zeroes and avoid interpreting user text as a formula.
  const next=sheet.getLastRow()+1;
  if(next>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),100);
  sheet.getRange(next,1,1,HEADERS_.length).setNumberFormat('@').setValues([
    row.map(x=>typeof x==='string'&&/^(?:'|[\s]*[=+\-@])/.test(x)?"'"+x:x)
  ]);
  SpreadsheetApp.flush();
}
function queueKey_(email,code){
  const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,email+'\n'+code,Utilities.Charset.UTF_8);
  return bytes.slice(0,16).map(n=>((n+256)%256).toString(16).padStart(2,'0')).join('');
}
function iso_(v){return v instanceof Date?v.toISOString():String(v||'');}
function idOK_(v){return /^[\w-]{10,120}$/.test(String(v||''));}
function parseDriveLink_(v){
  const s=String(v||'').trim();
  const hit=/^https:\/\/drive\.google\.com\/(?:file\/d\/([\w-]+)(?:\/view)?(?:[?#].*)?|open\?id=([\w-]+)(?:[&#].*)?)$/.exec(s);
  const id=hit&&(hit[1]||hit[2]);
  if(!idOK_(id))stop_('วางลิงก์ไฟล์ ZIP จาก Google Drive ไม่ใช่ลิงก์โฟลเดอร์');
  return id;
}
function jobCode_(v){
  const s=String(v||'').trim().toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(s))stop_('ใช้เลขงานจาก SCCUSTOM เช่น ART-2026-001000');
  return s;
}
function plain_(v,max){
  const s=String(v??'').trim();
  if(s.length>max)stop_('ข้อความยาวเกิน '+max+' ตัวอักษร');
  return s;
}
function required_(v,max,msg){const s=plain_(v,max);if(!s)stop_(msg);return s;}
function stop_(msg){const e=new Error(msg);e.expected=true;throw e;}
function rpc_(fn){
  try{return {ok:true,data:fn()};}
  catch(e){if(e?.expected)return {ok:false,message:e.message};console.error(e);return {ok:false,message:'ทำรายการไม่สำเร็จ กรุณาตรวจสิทธิ์ Drive/Sheets หรือติดต่อผู้ดูแล'};}
}
