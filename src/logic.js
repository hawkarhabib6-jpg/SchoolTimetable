// ============================================================
// ناوکی سیستەم — هەموو لۆژیک بەبێ سێرڤەر، ڕاستەوخۆ لەناو بەرنامەکە
// ============================================================
const DAYS = ['یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە'];
const PERIODS = 6;

// داتای هەموو بەرنامەکە لێرە دەمێنێتەوە
let DB = { teachers: [], subjects: [], classes: [], offdays: [], timetable: [], seq: 1 };

async function initDB() {
  DB = await window.store.load();
  // دڵنیابوون لە بوونی هەموو لقەکان (بۆ فایلی کۆن)
  for (const k of ['teachers','subjects','classes','offdays','timetable']) {
    if (!Array.isArray(DB[k])) DB[k] = [];
  }
  if (!DB.seq) DB.seq = 1;
}

async function persist() { await window.store.save(DB); }

function nextId() { return DB.seq++; }

// ---------- مامۆستایان ----------
function teacherLoad(teacherId) {
  const assigned = DB.timetable.filter(t => t.teacher_id === teacherId).length;
  const teacher = DB.teachers.find(t => t.id === teacherId);
  const max = teacher ? teacher.max_periods : 0;
  return { assigned, max, remaining: max - assigned };
}

// ---------- ناوکی ڕێگری تێکهەڵچوون ----------
// ئەگەر کێشە هەبێت، دەقی هەڵە دەگەڕێنێتەوە؛ ئەگەر نا null
function checkConflicts(classId, teacherId, day, period, ignoreId = null) {
  if (day < 0 || day >= DAYS.length) return 'ڕۆژی هەڵە.';
  if (period < 1 || period > PERIODS) return 'بەشە وانەی هەڵە.';

  // (١) ئایا پۆلەکە لەم خانەیەدا وانەی هەیە؟
  const classBusy = DB.timetable.find(t =>
    t.class_id === classId && t.day_of_week === day && t.period_no === period && t.id !== ignoreId);
  if (classBusy) {
    const subj = DB.subjects.find(s => s.id === classBusy.subject_id);
    const teach = DB.teachers.find(te => te.id === classBusy.teacher_id);
    return `ئەم پۆلە لەم کاتەدا وانەی «${subj ? subj.name : '?'}» ی هەیە لەگەڵ مامۆستا ${teach ? teach.full_name : '?'}.`;
  }

  // (٢) ئایا مامۆستاکە لەم خانەیەدا لە پۆلێکی تر وانەی هەیە؟
  const teacherBusy = DB.timetable.find(t =>
    t.teacher_id === teacherId && t.day_of_week === day && t.period_no === period && t.id !== ignoreId);
  if (teacherBusy) {
    const cls = DB.classes.find(c => c.id === teacherBusy.class_id);
    return `ئەم مامۆستایە لەم کاتەدا لە پۆلی «${cls ? cls.name : '?'}» وانەی هەیە — ناتوانێت لە دوو پۆلدا بێت.`;
  }

  // (٣) ئایا ئەم کاتە بۆ مامۆستاکە بەتاڵ کراوە؟
  const off = DB.offdays.find(o =>
    o.teacher_id === teacherId && o.day_of_week === day &&
    (o.period_no == null || o.period_no === period));
  if (off) {
    return 'ئەم مامۆستایە لەم ڕۆژ/کاتەدا بەتاڵە (ناتوانێت دەوام بکات).';
  }

  return null;
}

// ---------- پێشنیاری ئۆتۆماتیکی مامۆستا ----------
function suggestTeachers(classId, subjectId, day, period) {
  const out = [];
  for (const t of DB.teachers) {
    if (checkConflicts(classId, t.id, day, period)) continue;
    const load = teacherLoad(t.id);
    if (load.remaining <= 0) continue;
    out.push({ id: t.id, name: t.full_name, remaining: load.remaining });
  }
  out.sort((a, b) => b.remaining - a.remaining);
  return out;
}

// ---------- دانانی وانە ----------
// دەگەڕێنێتەوە {ok, error?, warning?}
function assignLesson(classId, teacherId, subjectId, day, period) {
  const conflict = checkConflicts(classId, teacherId, day, period);
  if (conflict) return { ok: false, error: conflict };

  const load = teacherLoad(teacherId);
  let warning = null;
  if (load.remaining <= 0) {
    warning = `ئاگاداری: میلاکی ئەم مامۆستایە پڕ بووە (${load.assigned}/${load.max}).`;
  }

  DB.timetable.push({
    id: nextId(),
    class_id: classId,
    teacher_id: teacherId,
    subject_id: subjectId,
    day_of_week: day,
    period_no: period
  });
  return { ok: true, warning };
}
