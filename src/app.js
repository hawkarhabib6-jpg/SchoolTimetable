// ============================================================
// کۆنترۆڵی بەرنامەکە — پەیوەست بە داتای ناوخۆیی (بەبێ سێرڤەر)
// ============================================================

function toast(msg, kind='ok'){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + kind;
  setTimeout(()=>{ t.className = 'toast hidden'; }, 3500);
}
function esc(s){ return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

let currentCell = null;

// --- تابەکان ---
document.querySelectorAll('.tab').forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab==='report') loadReport();
  };
});

// ============ مامۆستایان ============
function loadTeachers(){
  const t = document.getElementById('tTable');
  const rows = [...DB.teachers].sort((a,b)=>a.full_name.localeCompare(b.full_name));
  t.innerHTML = `<tr><th>ناو</th><th>مۆبایل</th><th>میلاک</th><th>دراوە</th><th>ماوە</th><th></th></tr>` +
    rows.map(x=>{
      const load = teacherLoad(x.id);
      return `<tr>
        <td>${esc(x.full_name)}</td>
        <td>${esc(x.phone)}</td>
        <td>${x.max_periods}</td>
        <td>${load.assigned}</td>
        <td>${badge(load.remaining)}</td>
        <td>
          <button class="icon-btn" title="ڕۆژە بەتاڵەکان" onclick="openOffdays(${x.id})">🗓</button>
          <button class="icon-btn" onclick="delTeacher(${x.id})">🗑</button>
        </td>
      </tr>`;
    }).join('');
}
function badge(rem){
  if (rem<0) return `<span class="badge over">${rem}</span>`;
  if (rem===0) return `<span class="badge full">پڕ</span>`;
  return `<span class="badge under">${rem}</span>`;
}
async function addTeacher(){
  const full_name = document.getElementById('tName').value.trim();
  const phone = document.getElementById('tPhone').value.trim();
  const max_periods = parseInt(document.getElementById('tMax').value)||22;
  if (!full_name) return toast('ناوی مامۆستا بنووسە','err');
  DB.teachers.push({ id: nextId(), full_name, phone, max_periods });
  await persist();
  document.getElementById('tName').value='';
  document.getElementById('tPhone').value='';
  loadTeachers();
  toast('مامۆستا زیادکرا');
}
async function delTeacher(id){
  if (!confirm('ئەم مامۆستایە بسڕدرێتەوە؟ (خشتەکەشی دەسڕێتەوە)')) return;
  DB.teachers = DB.teachers.filter(t=>t.id!==id);
  DB.timetable = DB.timetable.filter(t=>t.teacher_id!==id);
  DB.offdays = DB.offdays.filter(o=>o.teacher_id!==id);
  await persist();
  loadTeachers();
  renderTimetable();
}

// ============ ڕۆژە بەتاڵەکان ============
let offTeacherId = null;
function openOffdays(id){
  offTeacherId = id;
  const teacher = DB.teachers.find(t=>t.id===id);
  document.getElementById('offTitle').textContent = `ڕۆژە بەتاڵەکانی: ${teacher.full_name}`;
  document.getElementById('offDay').innerHTML =
    DAYS.map((d,i)=>`<option value="${i}">${d}</option>`).join('');
  let popts = '<option value="">هەموو ڕۆژەکە</option>';
  for(let p=1;p<=PERIODS;p++) popts += `<option value="${p}">بەشە وانەی ${p}</option>`;
  document.getElementById('offPeriod').innerHTML = popts;
  document.getElementById('offdaysPanel').classList.remove('hidden');
  loadOffdays();
}
function closeOffdays(){ document.getElementById('offdaysPanel').classList.add('hidden'); offTeacherId=null; }
function loadOffdays(){
  const list = DB.offdays.filter(o=>o.teacher_id===offTeacherId)
    .sort((a,b)=> a.day_of_week-b.day_of_week || (a.period_no||0)-(b.period_no||0));
  const box = document.getElementById('offList');
  if(!list.length){ box.innerHTML='<span class="hint">هیچ کاتێکی بەتاڵ زیاد نەکراوە.</span>'; return; }
  box.innerHTML = list.map(o=>{
    const label = o.period_no ? `${DAYS[o.day_of_week]} — بەشە وانەی ${o.period_no}`
                              : `${DAYS[o.day_of_week]} — هەموو ڕۆژەکە`;
    return `<span class="off-chip">${label} <b onclick="delOffday(${o.id})">✕</b></span>`;
  }).join('');
}
async function addOffday(){
  const day_of_week = parseInt(document.getElementById('offDay').value);
  const pv = document.getElementById('offPeriod').value;
  const period_no = pv==='' ? null : parseInt(pv);
  DB.offdays.push({ id: nextId(), teacher_id: offTeacherId, day_of_week, period_no });
  await persist();
  loadOffdays();
  renderTimetable();
  toast('کاتی بەتاڵ زیادکرا');
}
async function delOffday(id){
  DB.offdays = DB.offdays.filter(o=>o.id!==id);
  await persist();
  loadOffdays();
  renderTimetable();
}

// ============ بابەتەکان ============
function loadSubjects(){
  const rows = [...DB.subjects].sort((a,b)=>a.name.localeCompare(b.name));
  document.getElementById('sTable').innerHTML =
    `<tr><th>ناوی بابەت</th><th></th></tr>` +
    rows.map(x=>`<tr><td>${esc(x.name)}</td>
      <td><button class="icon-btn" onclick="delSubject(${x.id})">🗑</button></td></tr>`).join('');
}
async function addSubject(){
  const name = document.getElementById('sName').value.trim();
  if (!name) return toast('ناوی بابەت بنووسە','err');
  DB.subjects.push({ id: nextId(), name });
  await persist();
  document.getElementById('sName').value='';
  loadSubjects();
  toast('بابەت زیادکرا');
}
async function delSubject(id){
  if(!confirm('بسڕدرێتەوە؟')) return;
  DB.subjects = DB.subjects.filter(s=>s.id!==id);
  DB.timetable = DB.timetable.filter(t=>t.subject_id!==id);
  await persist();
  loadSubjects();
  renderTimetable();
}

// ============ پۆلەکان ============
function loadClasses(){
  const rows = [...DB.classes].sort((a,b)=>(a.grade_level||0)-(b.grade_level||0) || a.name.localeCompare(b.name));
  document.getElementById('cTable').innerHTML =
    `<tr><th>ناوی پۆل</th><th>ئاست</th><th></th></tr>` +
    rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.grade_level??''}</td>
      <td><button class="icon-btn" onclick="delClass(${x.id})">🗑</button></td></tr>`).join('');
  const sel = document.getElementById('ttClass');
  const prev = sel.value;
  sel.innerHTML = rows.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
  if (prev && rows.some(r=>String(r.id)===prev)) sel.value = prev;
  renderTimetable();
}
async function addClass(){
  const name = document.getElementById('cName').value.trim();
  const grade_level = parseInt(document.getElementById('cGrade').value)||null;
  if (!name) return toast('ناوی پۆل بنووسە','err');
  DB.classes.push({ id: nextId(), name, grade_level });
  await persist();
  document.getElementById('cName').value='';
  document.getElementById('cGrade').value='';
  loadClasses();
  toast('پۆل زیادکرا');
}
async function delClass(id){
  if(!confirm('بسڕدرێتەوە؟ (خشتەکەشی دەسڕێتەوە)')) return;
  DB.classes = DB.classes.filter(c=>c.id!==id);
  DB.timetable = DB.timetable.filter(t=>t.class_id!==id);
  await persist();
  loadClasses();
}

// ============ خشتەی هەفتانە ============
document.getElementById('ttClass').onchange = renderTimetable;

function renderTimetable(){
  const classId = parseInt(document.getElementById('ttClass').value);
  if (!classId){ document.getElementById('ttGridWrap').innerHTML='<p class="hint">سەرەتا پۆلێک زیاد بکە.</p>'; document.getElementById('ttHint').textContent=''; return; }

  const cells = DB.timetable.filter(t=>t.class_id===classId);
  const map = {};
  cells.forEach(x=> map[`${x.day_of_week}-${x.period_no}`] = x);

  let html = '<table class="tt-table"><tr><th>بەشە وانە</th>';
  DAYS.forEach(d=> html += `<th>${d}</th>`);
  html += '</tr>';

  for (let p=1; p<=PERIODS; p++){
    html += `<tr><td class="periodhead">${p}</td>`;
    for (let d=0; d<DAYS.length; d++){
      const cell = map[`${d}-${p}`];
      if (cell){
        const subj = DB.subjects.find(s=>s.id===cell.subject_id);
        const teach = DB.teachers.find(te=>te.id===cell.teacher_id);
        html += `<td><div class="tt-cell filled" onclick="removeCell(${cell.id})">
          <div class="subj">${esc(subj?subj.name:'?')}</div>
          <div class="teach">${esc(teach?teach.full_name:'?')}</div>
          <div class="rm">✕ سڕینەوە</div>
        </div></td>`;
      } else {
        html += `<td><div class="tt-cell empty" onclick="openAssign(${d},${p})">+</div></td>`;
      }
    }
    html += '</tr>';
  }
  html += '</table>';
  document.getElementById('ttGridWrap').innerHTML = html;
  document.getElementById('ttHint').textContent = `پڕکراوە: ${cells.length} / ${PERIODS*DAYS.length} خانە`;
}

function openAssign(day, period){
  if (!DB.subjects.length) return toast('سەرەتا بابەت زیاد بکە','err');
  if (!DB.teachers.length) return toast('سەرەتا مامۆستا زیاد بکە','err');
  currentCell = {day, period};
  document.getElementById('assignTitle').textContent =
    `دانانی وانە — ${DAYS[day]}، بەشە وانەی ${period}`;
  document.getElementById('asSubject').innerHTML =
    DB.subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
  document.getElementById('asTeacher').innerHTML =
    DB.teachers.map(t=>`<option value="${t.id}">${esc(t.full_name)}</option>`).join('');
  document.getElementById('suggestBox').innerHTML='';
  hideError();
  document.getElementById('assignModal').classList.remove('hidden');
}
function closeModal(){ document.getElementById('assignModal').classList.add('hidden'); }
function showError(msg){ const e=document.getElementById('assignError'); e.textContent=msg; e.classList.remove('hidden'); }
function hideError(){ document.getElementById('assignError').classList.add('hidden'); }

function suggestTeachersUI(){
  const classId = parseInt(document.getElementById('ttClass').value);
  const subjectId = parseInt(document.getElementById('asSubject').value);
  const list = suggestTeachers(classId, subjectId, currentCell.day, currentCell.period);
  const box = document.getElementById('suggestBox');
  if (!list.length){ box.innerHTML='<span class="hint">هیچ مامۆستایەکی بەردەست نییە (هەموویان تێکهەڵچوونیان هەیە یان میلاکیان پڕە).</span>'; return; }
  box.innerHTML = list.map(t=>
    `<span class="suggest-chip" onclick="pickTeacher(${t.id})">${esc(t.name)} <span class="rem">(${t.remaining} ماوە)</span></span>`
  ).join('');
}
function pickTeacher(id){ document.getElementById('asTeacher').value = id; hideError(); }

async function doAssign(){
  const classId = parseInt(document.getElementById('ttClass').value);
  const subjectId = parseInt(document.getElementById('asSubject').value);
  const teacherId = parseInt(document.getElementById('asTeacher').value);
  if (!subjectId) return showError('بابەت هەڵبژێرە.');
  if (!teacherId) return showError('مامۆستا هەڵبژێرە.');

  const r = assignLesson(classId, teacherId, subjectId, currentCell.day, currentCell.period);
  if (!r.ok){ showError(r.error); return; }
  await persist();
  closeModal();
  renderTimetable();
  loadTeachers();
  if (r.warning) toast(r.warning,'warn');
  else toast('وانە دانرا');
}

async function removeCell(id){
  if(!confirm('ئەم وانەیە بسڕدرێتەوە؟')) return;
  DB.timetable = DB.timetable.filter(t=>t.id!==id);
  await persist();
  renderTimetable();
  loadTeachers();
}

function printTimetable(){
  if (!document.getElementById('ttClass').value) return toast('سەرەتا پۆلێک هەڵبژێرە','err');
  window.print();
}

// ============ ڕاپۆرت ============
function loadReport(){
  const rows = [...DB.teachers].sort((a,b)=>a.full_name.localeCompare(b.full_name));
  document.getElementById('rTable').innerHTML =
    `<tr><th>مامۆستا</th><th>میلاک</th><th>دراوە</th><th>ماوە</th><th>دۆخ</th></tr>` +
    rows.map(x=>{
      const load = teacherLoad(x.id);
      let st = load.remaining<0 ? '<span class="badge over">میلاک تێپەڕاندووە</span>'
             : load.remaining===0 ? '<span class="badge full">تەواو</span>'
             : '<span class="badge under">وانەی کەمتری هەیە</span>';
      return `<tr><td>${esc(x.full_name)}</td><td>${x.max_periods}</td>
        <td>${load.assigned}</td><td>${load.remaining}</td><td>${st}</td></tr>`;
    }).join('');
}

// --- دەستپێک ---
(async function init(){
  await initDB();
  loadTeachers();
  loadSubjects();
  loadClasses();
})();
