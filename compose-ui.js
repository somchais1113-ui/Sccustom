import {escapeHtml as e,PRODUCT,position} from './data.js';
import {artworkMode, profilesFor} from './print-layout.js';

export function frameSummary(j){
  const {safe:f}=position(j);
  const mm=n=>Number(n).toLocaleString('en',{maximumFractionDigits:3});
  const state=f.verified?'กรอบปลอดภัยตามโปรไฟล์ที่ยืนยันแล้ว':f.invalid?'ตั้งค่าโปรไฟล์ไม่ถูกต้อง · ใช้เพื่อดูตัวอย่าง': 'กรอบตัวอย่าง · ยังไม่ยืนยันเพื่อผลิต';
  return `<div class="frame-summary">
    <strong>${e(state)}</strong>
    <div>กรอบนอก ${mm(f.outerWidth)} × ${mm(f.outerHeight)} มม. · กรอบใน ${mm(f.width)} × ${mm(f.height)} มม.</div>
    <div class="frame-legend"><span>ซ้าย ${mm(f.margins.left)}</span><span>ขวา ${mm(f.margins.right)}</span><span>บน ${mm(f.margins.top)}</span><span>ล่าง ${mm(f.margins.bottom)} มม.</span></div>
  </div>`;
}
export function compositionControls(j, options={}){
  const p=position(j),two=artworkMode(j)==='both';
  const profiles=profilesFor(PRODUCT);
  const choices=[...new Map([['barrel','ตัวด้าม'],...profiles.map(k=>[k.locationId,k.locationLabel])]).entries()];
  return `<div class="control-groups compose-controls">
    <h3>ขนาดและตำแหน่ง</h3>
    ${choices.length>1?`<label>ตำแหน่งพิมพ์ <select data-print-location>${choices.map(([id,name])=>`<option value="${e(id)}"${(j.printLocationId||'barrel')===id?' selected':''}>${e(name)}</option>`).join('')}</select></label>`:''}
    <label>ขนาดรวม <strong class="studio-live-number" data-composition-size>${p.width.toFixed(2)} × ${p.height.toFixed(2)} มม.</strong>
      <input type="range" min="10" max="100" step="1" data-range-fit="1" value="${Number(j.fit)||94}" aria-label="ขนาดแบบเทียบกับกรอบปลอดภัย">
    </label>
    <div class="range-ends"><span>10%</span><span data-fit-value>${Number(j.fit)||94}%</span><span>100%</span></div>
    ${two?`<label class="studio-gap">ระยะระหว่างโลโก้กับข้อความ (มม.)<input type="number" data-part-gap min="${p.minGap}" max="${p.maxGap}" step="any" value="${p.parts.length===2?p.gap:Math.min(p.maxGap,Math.max(.8,p.minGap))}"></label>`:''}
    <button class="outline-btn full" data-action="reset-position">จัดกึ่งกลางกรอบปลอดภัย</button>
    <details class="studio-disclosure" data-studio-disclosure="layout"${options.open?' open':''}>
      <summary>ปรับตำแหน่งเพิ่มเติม</summary>
      <div class="studio-details-body">
        <div class="two-inputs">
          <label>ซ้าย–ขวา (มม.)<input type="number" step="any" data-offset="offsetX" value="${p.offsetX}"></label>
          <label>ขึ้น–ลง (มม.)<input type="number" step="any" data-offset="offsetY" value="${p.offsetY}"></label>
        </div>
        ${two?`<div class="two-inputs">
          <label>ตำแหน่งข้อความ<select data-text-side><option value="right"${j.textSide==='left'?'':' selected'}>หลังโลโก้</option><option value="left"${j.textSide==='left'?' selected':''}>หน้าโลโก้</option></select></label>
          <label>ความสูงเทียบโลโก้ (%)<input type="number" data-text-height min="30" max="150" step="1" value="${Math.max(30,Math.min(150,Number(j.textHeightPct)||75))}"></label>
        </div><p class="small-footnote">ระยะระหว่างชิ้นวัดจากกรอบของไฟล์ ไม่ใช่ขอบหมึก</p>`:''}
      </div>
    </details>
  </div>`;
}

export function designReviewControls(j){
  const pending=j.designReview?.status==='pending';
  return `<div class="design-review">
    <h4>${pending?'รอ Design ตรวจรายละเอียด':'ให้ Design ช่วยตรวจรายละเอียด'}</h4>
    <p>ใช้เมื่อเจอเส้นบาง ช่องว่างในตัวอักษรแคบ หรือรายละเอียดเล็ก ระบบไม่ดัดโลโก้อัตโนมัติ</p>
    <label>จุดที่อยากให้ตรวจ<textarea rows="2" maxlength="500" data-review-note placeholder="เช่น สโลแกนตัวเล็ก ขอแบบที่ตัดสโลแกนออก">${e(j.designReview?.note||'')}</textarea></label>
    <button class="outline-btn full" data-action="download-design-review">บันทึกรอตรวจและดาวน์โหลด ZIP ให้ Design</button>
    ${pending?'<button class="outline-btn full" data-action="record-design-response">บันทึกว่าได้รับผลตรวจแล้ว</button><small>เลือกหลัง Design ตรวจและระบุแบบที่ใช้ได้แล้ว ระบบไม่ได้ส่งไฟล์ให้ทีมอัตโนมัติ</small>':''}
  </div>`;
}
