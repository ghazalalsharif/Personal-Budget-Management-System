export const categories = ['الأكل','القهوة','التسوق','الفواتير','المواصلات','الصحة','التعليم','الترفيه','غيرها'];
export const category = v => ({'الطعام':'الأكل','النقل':'المواصلات','أخرى':'غيرها'}[v] || v);
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export function cents(value) {
 const text=String(value).trim().replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace('٫','.');
 if(!/^\d+(\.\d{1,2})?$/.test(text)) throw Error('اكتب مبلغ موجب وبرقمين بعد الفاصلة كحد أقصى.');
 const [whole,part='']=text.split('.'); const amount=Number(whole)*100+Number(part.padEnd(2,'0'));
 if(!Number.isSafeInteger(amount)||amount<=0||amount>100000000000) throw Error('المبلغ لازم يكون أكبر من صفر وأقل من أو يساوي مليار.');
 return amount;
}
export function validDate(v) { return typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && v>='1900-01-01' && !isNaN(Date.parse(v+'T00:00:00Z')) && new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v; }
const textValid=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
export function validate(data) {
 if(data?.version!==1||!Array.isArray(data.entries)||!Array.isArray(data.limits)||data.entries.length>100000||data.limits.length>10000) throw Error('صيغة البيانات مو معروفة.');
 const ids=new Set(),keys=new Set();
 for(const e of data.entries){
  if(!textValid(e.id,100)||ids.has(e.id)||!validDate(e.date)||e.date>today()||!textValid(e.category,60)||typeof e.income!=='boolean'||typeof e.note!=='string'||e.note.length>500||!Number.isSafeInteger(e.amount)||e.amount<=0||e.amount>100000000000) throw Error('راجع بيانات المعاملات: التاريخ والفئة والمبلغ والمعرّفات.');
  ids.add(e.id);
 }
 for(const l of data.limits){const key=l.month+'|'+category(l.category);
  if(!validDate(l.month+'-01')||!textValid(l.category,60)||keys.has(key)||!Number.isSafeInteger(l.amount)||l.amount<=0||l.amount>100000000000) throw Error('بيانات الميزانية مو صالحة أو فيها فئات مكررة.'); keys.add(key);
 }
 return {version:1,entries:data.entries.map(e=>({...e,category:category(e.category)})),limits:data.limits.map(l=>({...l,category:category(l.category)}))};
}
export const empty = () => ({version:1,entries:[],limits:[]});
export function summary(data,month) {
 const rows=data.entries.filter(e=>e.date.slice(0,7)===month).sort((a,b)=>b.date.localeCompare(a.date));
 const income=rows.filter(e=>e.income).reduce((s,e)=>s+e.amount,0), spent=rows.filter(e=>!e.income).reduce((s,e)=>s+e.amount,0);
 const limits=data.limits.filter(l=>l.month===month);
 const names=[...new Set([...limits.map(l=>l.category),...rows.filter(e=>!e.income).map(e=>e.category)])];
 const envelopes=names.map(name=>{const allocated=limits.find(l=>l.category===name)?.amount||0, used=rows.filter(e=>!e.income&&e.category===name).reduce((s,e)=>s+e.amount,0);return {name,allocated,spent:used,remaining:allocated-used,percent:allocated?used/allocated*100:null};});
 return {rows,income,spent,remaining:income-spent,allocated:limits.reduce((s,l)=>s+l.amount,0),envelopes};
}
export function filterEntries(data,{from='',to='',type='',query=''}) {
 if(from&&to&&from>to) throw Error('تاريخ البداية لازم ما يتعدّى تاريخ النهاية.');
 return data.entries.filter(e=>(!from||e.date>=from)&&(!to||e.date<=to)&&(!type||e.income===(type==='income'))&&`${e.category} ${e.note}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));
}
export function csv(rows){const safe=v=>'"'+String(v).replace(/^[\s]*([=+@-])/,'\'$1').replaceAll('"','""')+'"';return '\uFEFFDate,Type,Amount,Category,Note\r\n'+rows.map(e=>[e.date,e.income?'Income':'Expense',(e.amount/100).toFixed(2),e.category,e.note].map(safe).join(',')).join('\r\n');}
export function save(storage,key,data){const checked=validate(data);const old=storage.getItem(key);if(old!==null)storage.setItem(key+'.previous',old);storage.setItem(key,JSON.stringify(checked));return checked;}
