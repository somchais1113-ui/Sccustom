/* Optional user-granted Drive sync: token in memory, client ID in localStorage.
 * Uses drive.file scope; files are owned/accessed under the signed-in account.
 * Does not provide organization-wide access control or a central database.
 */
const KEY='sccustom-drive-oauth-client-id';
const SCOPE='https://www.googleapis.com/auth/drive.file';
let accessToken='',client=null;
export const getClientId=()=>localStorage.getItem(KEY)||'';
export const setClientId=(value)=>{const v=String(value||'').trim();if(v&&!/^[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com$/.test(v))throw Error('OAuth Client ID ไม่ถูกต้อง');localStorage.setItem(KEY,v);accessToken='';client=null;};
export const driveConnected=()=>Boolean(accessToken);
async function gis(){
  if(window.google?.accounts?.oauth2)return;
  await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=resolve;s.onerror=()=>reject(Error('โหลด Google Identity Services ไม่ได้'));document.head.appendChild(s);});
}
export async function connectDrive(){
  const id=getClientId();if(!id)throw Error('กรุณากรอก Google OAuth Client ID ก่อน');await gis();
  return new Promise((resolve,reject)=>{
    client=google.accounts.oauth2.initTokenClient({client_id:id,scope:SCOPE,callback:r=>{
      if(r.error||!r.access_token)reject(Error('Google Login ไม่สำเร็จ: '+(r.error||'no token')));
      else{accessToken=r.access_token;resolve(true);}
    },error_callback:()=>reject(Error('การเชื่อมต่อ Google Drive ถูกยกเลิก'))});
    client.requestAccessToken({prompt:'consent'});
  });
}
export function disconnectDrive(){if(accessToken&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(accessToken,()=>{});accessToken='';}
async function api(url,options={}){
  if(!accessToken)throw Error('กรุณาเชื่อม Google Drive ก่อน');
  const r=await fetch(url,{...options,headers:{Authorization:'Bearer '+accessToken,...options.headers}});
  if(!r.ok){const body=await r.text();if(r.status===401)accessToken='';throw Error('Google Drive HTTP '+r.status+': '+body.slice(0,250));}
  return r.status===204?null:await r.json();
}
const apiBase='https://www.googleapis.com/drive/v3/files';
const uploadBase='https://www.googleapis.com/upload/drive/v3/files';
const fields='files(id,name,mimeType,parents,modifiedTime,appProperties),nextPageToken';
async function list(q,pageToken=''){
  const search=new URLSearchParams({q,fields,pageSize:'100',spaces:'drive'});if(pageToken)search.set('pageToken',pageToken);
  return await api(apiBase+'?'+search);
}
async function createFolder(name,parent){
  const q=`name = '${name.replace(/'/g,"\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`+(parent?` and '${parent}' in parents`:''),found=await list(q);
  if(found.files?.length)return found.files[0].id;
  return (await api(apiBase+'?fields=id',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder',...(parent?{parents:[parent]}:{})})})).id;
}
async function multipart(meta,content,mime='application/json',fileId=null){
  const boundary='sccustom-'+crypto.randomUUID();
  const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',JSON.stringify(meta),'\r\n--'+boundary+'\r\nContent-Type: '+mime+'\r\n\r\n',content,'\r\n--'+boundary+'--'],{type:'multipart/related; boundary='+boundary});
  return api(uploadBase+(fileId?'/'+fileId:'')+'?uploadType=multipart&fields=id,name,modifiedTime',{method:fileId?'PATCH':'POST',headers:{'Content-Type':body.type},body});
}
export async function saveJobToDrive(job){
  const root=await createFolder('SCCUSTOM_DATA');
  const customers=await createFolder('02_CUSTOMER_JOBS',root);
  const year=await createFolder(String(new Date(job.createdAt||Date.now()).getFullYear()),customers);
  const jobfolder=await createFolder(job.id,year);
  const revs=await createFolder('revisions',jobfolder);
  const revfolder=await createFolder('REV-'+String(job.revision).padStart(3,'0'),revs);
  const payload=JSON.stringify({app:'SCCUSTOM',version:2,savedAt:new Date().toISOString(),project:job},null,2);
  const q=`name = 'project.json' and '${jobfolder}' in parents and trashed = false`,existing=await list(q);
  // revision snapshot: immutable per revision after first save, latest project.json is updated
  const snap=await list(`name = 'project.json' and '${revfolder}' in parents and trashed = false`);
  if(!snap.files?.length)await multipart({name:'project.json',parents:[revfolder]},payload);
  const file=await multipart(existing.files?.length?{name:'project.json'}:{name:'project.json',parents:[jobfolder]},payload,'application/json',existing.files?.[0]?.id);
  return {id:file.id,folderId:jobfolder,modifiedTime:file.modifiedTime};
}
export async function listDriveJobs(){
  // Under drive.file, the app can list only files it created or accessed via the app.
  const all=[];let page='';do{const r=await list("name = 'project.json' and trashed = false",page);all.push(...(r.files||[]));page=r.nextPageToken||'';}while(page);
  // Results include snapshots: only include project.json not stored inside a REV-* folder.
  const folders=await Promise.all(all.map(async f=>{if(!f.parents?.[0])return null;const parent=await api(apiBase+'/'+f.parents[0]+'?fields=id,name');return parent?.name?.startsWith('ART-')?f:null;}));
  return folders.filter(Boolean).sort((a,b)=>String(b.modifiedTime).localeCompare(String(a.modifiedTime)));
}
export async function fetchDriveJob(fileId){
  const r=await api(apiBase+'/'+encodeURIComponent(fileId)+'?alt=media');
  if(r.app!=='SCCUSTOM'||!r.project?.id)throw Error('ไม่ใช่ไฟล์งาน SCCUSTOM');return r;
}
