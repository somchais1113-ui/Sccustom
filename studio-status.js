import {position} from './data.js';
import {preflight} from './exporter.js';

// Independent checks: visual fit must never be used as permission to export.
export function studioStatus(job){
  const p=position(job);
  const count=p.parts.filter(part=>part.asset.sourceType!=='demo').length;
  const complete=count===(p.mode==='both'?2:1)&&p.width>0&&p.height>0;
  const within=complete&&p.parts.every(r=>r.x>=p.safe.x-1e-6&&r.y>=p.safe.y-1e-6
    &&r.x+r.width<=p.safe.x+p.safe.width+2e-6&&r.y+r.height<=p.safe.y+p.safe.height+2e-6);
  const fit=within?{tone:'ok',label:'แบบอยู่ในกรอบปลอดภัย'}:complete?{tone:'hold',label:'ตรวจตำแหน่งแบบในกรอบ'}:{tone:'muted',label:'ยังใส่แบบพิมพ์ไม่ครบ'};
  const blockers=preflight(job).filter(i=>i.level==='block');
  const priority=['artwork','variants','vector','inks','design','profile','approval'];
  const issue=!complete&&blockers.length?{code:'artwork'}:priority.map(code=>blockers.find(i=>i.code===code)).find(Boolean)||blockers[0];
  const byCode={
    artwork:['ใส่โลโก้หรือข้อความให้ครบ','studio-content','ไปที่องค์ประกอบ'],
    variants:['ยังไม่ได้เลือกสีด้ามที่จะสั่ง','variants','ไปตั้งค่าสีด้าม'],
    vector:['ไฟล์ยังไม่เป็นเวกเตอร์สำหรับส่งผลิต','studio-content','ไปที่องค์ประกอบ'],
    inks:['จำนวนสีของแบบไม่ตรงกับหมึกที่ตั้งไว้','variants','ไปตั้งค่าหมึก'],
    design:['รอทีม Design ตรวจรายละเอียด','studio-design-review','ดูสถานะตรวจ'],
    profile:['รอทีม Design ยืนยันสเปกผลิต','studio-profile','ดูสเปกพื้นที่'],
    approval:['รอตรวจแบบและบันทึกการอนุมัติ','review','ไปหน้าตรวจแบบ'],
  };
  const [label,target,action]=byCode[issue?.code]??[issue?.text||'ส่งออกไฟล์ผลิตเพื่อตรวจต่อได้','review','ไปหน้าตรวจแบบ'];
  return {fit,production:{tone:issue?'hold':'ok',label,target,action,issueCount:blockers.length}};
}
