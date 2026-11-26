(() => {
'use strict';

/* ============================================================
   Hằng số & tiện ích
   ============================================================ */
const STORE_KEY = 'crck2.kk2027.v1';
const WHATS_NEW_KEY = 'crck2.kk2027.whatsnew.v1';
const SYNC_KEY = 'crck2.kk2027.sync.v1';
const DEFAULT_SYNC_URL = 'https://script.google.com/macros/s/AKfycbw4IYI3JHEnmt3GdwFp_sdr4obTpT6HCOxoLS4a3SQI_9DWWWKd_2cuWYygu6rgQcYR/exec';
const QUICK_LANG_KEY = 'crck2.kk2027.quicklang.v1';
const LANG_KEY = 'crck2.kk2027.lang.v1';
const DRAFT_KEY = 'crck2.kk2027.qdraft.v1';
const GAUTO_KEY = 'crck2.kk2027.gauto.v1';
const REMOTE_KEY = 'crck2.kk2027.remote.v1';
const FIELDS = ['dt', 'g', 'plus', 'c', 'k1', 'k2', 'o'];
const CATS = [
  ['g', 'catG'],
  ['plus', 'catPlus'],
  ['c', 'catC'],
  ['k1', 'catK1'],
  ['k2', 'catK2'],
  ['o', 'catO'],
];
const BASELINE = (window.KK_BASELINE && window.KK_BASELINE.lots) || [];
const BASE_BY_LOT = new Map(BASELINE.map(l => [l.lot, l]));
const BASE_ORDER = new Map(BASELINE.map((l, i) => [l.lot, i]));
const PHUC_TRA = (window.KK_PHUCTRA && window.KK_PHUCTRA.lots) || {};
const PHUC_TRA_SUMS = (window.KK_PHUCTRA && window.KK_PHUCTRA.sums) || {};
const PHUC_TRA_COMPS = (window.KK_PHUCTRA && window.KK_PHUCTRA.comps) || {};
const PHUC_TRA_MIN = (window.KK_PHUCTRA && window.KK_PHUCTRA.minDiff) || 2;
/* Lô chia hướng: nhập và kiểm tra riêng từng hướng, tổng chung so với 2026. */
const LOT_DIRECTIONS = {
  '46-13': ['A', 'B'],
  '47-13': ['A', 'B'],
  '13-13': ['A', 'B'],
  '12-13': ['A', 'B'],
  '117': ['A', 'B'],
  '351': ['A', 'B', 'C'],
  '354': ['A', 'B'],
};
/* Hướng C của 117 là cách gọi cũ của hướng B trong file phân hướng mới. */
const LEGACY_DIRS = { '117': { C: 'B' } };
function lotDirs(key) {
  return LOT_DIRECTIONS[String(key)] || null;
}
function rowDir(key, row) {
  const dirs = lotDirs(key);
  if (!dirs) return '';
  if (dirs.includes(row.dir)) return row.dir;
  const legacy = LEGACY_DIRS[key] && LEGACY_DIRS[key][row.dir];
  return legacy && dirs.includes(legacy) ? legacy : dirs[0];
}
const GEO = (window.KK_GEO && window.KK_GEO.features) || [];
const GEO_BY_LOT = new Map(GEO.map(f => [f.properties.ma_lo, f]));
const ZONE_ORDER = ['KV1', 'KV2', 'KV3', 'KV4', 'KV5', 'KV6', 'KV7', 'KV8'];
const STATUS_COLORS = { empty: '#9a9487', doing: '#d97757', done: '#3f7d58', warn: '#b3402f' };
const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

const nf = new Intl.NumberFormat('vi-VN');
const nf2 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function fmt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? nf.format(Math.round(n)) : '—';
}
function fmt2(v) {
  const n = Number(v);
  return Number.isFinite(n) ? nf2.format(n) : '—';
}
function signed(v) {
  const n = Number(v) || 0;
  return (n > 0 ? '+' : '') + fmt(n);
}
function pct(v, base) {
  if (!base) return '—';
  return (v / base * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%';
}
function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function parseNum(value) {
  if (value == null || String(value).trim() === '') return null;
  const n = parseInt(String(value).replace(/[^\d-]/g, ''), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
function parseHang(value) {
  const n = parseInt(String(value).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function dateVN(iso) {
  if (!iso) return '…';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
function dateTimeVN(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function todayVNText() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
function naturalSortKeys(keys) {
  return keys.slice().sort((a, b) => {
    const ba = BASE_BY_LOT.get(a);
    const bb = BASE_BY_LOT.get(b);
    if (ba && bb) return BASE_ORDER.get(a) - BASE_ORDER.get(b);
    if (ba) return -1;
    if (bb) return 1;
    return collator.compare(a, b);
  });
}

/* ============================================================
   Lưu trữ
   ============================================================ */
function emptyDB() {
  return { version: 1, lots: {}, updatedAt: null };
}
function loadDB() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return emptyDB();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !data.lots) return emptyDB();
    return { version: 1, lots: data.lots, updatedAt: data.updatedAt || null };
  } catch (err) {
    return emptyDB();
  }
}
let DB = loadDB();

function loadSyncCfg() {
  try {
    const d = JSON.parse(localStorage.getItem(SYNC_KEY) || '{}');
    return {
      url: typeof d.url === 'string' ? d.url : DEFAULT_SYNC_URL,
      enabled: d.enabled !== false,
      device: typeof d.device === 'string' ? d.device : '',
      lastSyncAt: d.lastSyncAt || null,
      lastResult: d.lastResult || '',
    };
  } catch (err) {
    return { url: DEFAULT_SYNC_URL, enabled: true, device: '', lastSyncAt: null, lastResult: '' };
  }
}
let syncCfg = loadSyncCfg();
let syncBusy = false;
let syncTimer = null;

function saveSyncCfg(patch) {
  Object.assign(syncCfg, patch);
  try { localStorage.setItem(SYNC_KEY, JSON.stringify(syncCfg)); } catch (err) {}
  updateSyncUi();
}
function userName() {
  return (syncCfg.device || '').trim();
}

function persist(opts) {
  if (!opts || !opts.quiet) {
    DB.updatedAt = new Date().toISOString();
    scheduleSync();
  }
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(DB));
  } catch (err) {
    toast('Không lưu được dữ liệu. Bộ nhớ trình duyệt có thể đã đầy.', 'bad');
  }
}
function touchLot(key) {
  const lot = key && DB.lots[key];
  if (lot) {
    lot.updatedAt = new Date().toISOString();
    markEnteredBy(lot);
  }
}
// Người nhập lô đầu tiên: chỉ ghi một lần, khi lô có số liệu lần đầu.
const UNKNOWN_ENTRANT = '?';
const FIRST_ENTRY_KEY = 'crck2.kk2027.firstentry.v1';
function markEnteredBy(lot) {
  const meta = lot && lot.meta;
  if (!meta || meta.firstBy) return;
  if (!(lot.rows || []).some(rowHasData)) return;
  const who = userName() || (meta.nguoi || '').trim();
  meta.firstBy = who || UNKNOWN_ENTRANT;
  meta.firstAt = lot.updatedAt || new Date().toISOString();
}
// Dữ liệu trước bản 69 chưa có người nhập đầu tiên: khoá theo "Người KK" của lô,
// lô nào cũng không rõ thì đánh dấu "?" để người sửa sau không bị tính nhầm.
function migrateFirstEntry(force) {
  try {
    if (!force && localStorage.getItem(FIRST_ENTRY_KEY)) return;
  } catch (err) {}
  let changed = false;
  Object.keys(DB.lots).forEach(key => {
    const lot = DB.lots[key];
    const meta = lot && lot.meta;
    if (!meta || meta.firstBy) return;
    if (!(lot.rows || []).some(rowHasData)) return;
    meta.firstBy = (meta.nguoi || '').trim() || UNKNOWN_ENTRANT;
    meta.firstAt = meta.firstAt || lot.updatedAt || meta.doneAt || null;
    changed = true;
  });
  try { localStorage.setItem(FIRST_ENTRY_KEY, '1'); } catch (err) {}
  if (changed) persist({ quiet: true });
}
function lotsKeys() {
  const set = new Set(BASELINE.map(l => l.lot));
  Object.keys(DB.lots).forEach(k => set.add(k));
  return naturalSortKeys([...set]);
}
function lotMeta(key) {
  return (DB.lots[key] && DB.lots[key].meta) || {
    huong: '', ngay: '', nguoi: '', ghiChu: '', done: false, doneAt: null, doneBy: '', reportAt: null, custom: !BASE_BY_LOT.has(key), firstBy: '', firstAt: null,
  };
}
function lotRows(key) {
  return (DB.lots[key] && DB.lots[key].rows) || [];
}
function ensureLot(key) {
  if (!DB.lots[key]) {
    DB.lots[key] = {
      meta: { huong: '', ngay: '', nguoi: '', ghiChu: '', done: false, doneAt: null, doneBy: '', reportAt: null, custom: !BASE_BY_LOT.has(key), firstBy: '', firstAt: null },
      rows: [],
    };
  }
  return DB.lots[key];
}

/* ============================================================
   Tính toán & kiểm tra
   ============================================================ */
function rowHasData(row) {
  return FIELDS.some(k => row[k] != null && row[k] !== '');
}
function rowSum(row) {
  return FIELDS.filter(k => k !== 'dt').reduce((sum, k) => sum + (Number(row[k]) || 0), 0);
}
function rowIssue(row) {
  if (!rowHasData(row)) return null;
  const sum = rowSum(row);
  if (row.dt == null) {
    return { level: 'bad', diff: sum, text: t('issueMissing', { sum: fmt(sum) }) };
  }
  const dt = Number(row.dt) || 0;
  if (dt !== sum) {
    return { level: 'bad', diff: dt - sum, text: t('issueDiff', { dt: fmt(dt), sum: fmt(sum), d: signed(dt - sum) }) };
  }
  return null;
}
function issueTextVN(row) {
  const sum = rowSum(row);
  if (row.dt == null) return `thiếu Tổng ĐT (tổng 6 cột = ${fmt(sum)})`;
  const dt = Number(row.dt) || 0;
  return `Tổng ĐT ${fmt(dt)} ≠ tổng 6 cột ${fmt(sum)} (lệch ${signed(dt - sum)})`;
}
/* Hàng có Tổng ĐT khác mức chung (giá trị xuất hiện nhiều nhất) của lô. */
function rowOutliers(rows) {
  const vals = rows
    .filter(r => rowHasData(r) && r.dt != null && Number(r.dt) > 0)
    .map(r => ({ uid: r.uid, v: Number(r.dt) }));
  if (vals.length < 4) return new Map();
  const freq = new Map();
  vals.forEach(o => freq.set(o.v, (freq.get(o.v) || 0) + 1));
  let ref = null;
  let best = 0;
  let tie = false;
  freq.forEach((count, v) => {
    if (count > best) { best = count; ref = v; tie = false; }
    else if (count === best) tie = true;
  });
  if (ref == null || best < 2 || tie) return new Map();
  const flags = new Map();
  vals.forEach(({ uid, v }) => {
    if (v !== ref) flags.set(uid, { diff: v - ref, ref });
  });
  return flags;
}
function aggregate(rows) {
  const a = { dt: 0, g: 0, plus: 0, c: 0, k1: 0, k2: 0, o: 0, count: 0 };
  rows.forEach(row => {
    if (!rowHasData(row)) return;
    a.count += 1;
    FIELDS.forEach(k => { a[k] += Number(row[k]) || 0; });
  });
  return a;
}
function findDuplicates(rows) {
  const seen = new Map();
  const dup = new Set();
  rows.forEach(row => {
    if (!rowHasData(row) || row.hang == null) return;
    if (seen.has(row.hang)) dup.add(row.hang);
    seen.set(row.hang, (seen.get(row.hang) || 0) + 1);
  });
  return [...dup].sort((a, b) => a - b);
}
function entryMap(key, dir) {
  const lot = PHUC_TRA[key];
  if (!lot) return null;
  if (lot.dirs) return dir ? (lot.dirs[dir] || null) : (lot.ref || null);
  // Lô có chia hướng nhưng 2026 chưa tách hướng: không lấy cả bảng gán cho một hướng.
  if (dir && lotDirs(key)) return null;
  return lot;
}
function expectedHangs(key, dir) {
  const map = entryMap(key, dir);
  if (!map) return null;
  return Object.keys(map).map(Number).filter(Number.isInteger).sort((a, b) => a - b);
}
function coverageInfo(key, dir, rows) {
  const scoped = rows || (dir ? rowsInDir(key, dir) : lotRows(key));
  const filled = [...new Set(scoped.filter(rowHasData).map(r => r.hang).filter(Number.isInteger))]
    .sort((a, b) => a - b);
  const filledSet = new Set(filled);
  const expected = expectedHangs(key, dir);
  const known = !!(expected && expected.length);
  const all = known ? [...new Set([...expected, ...filled])].sort((a, b) => a - b) : filled.slice();
  const first = all.length ? all[0] : 1;
  // Một số lô/hướng đánh số tiếp từ hàng 5, 50, 53… thay vì 1, 2, 3.
  const start = first >= 4 ? first : 1;
  const max = all.length ? Math.max(...all) : start - 1;
  const rowsToShow = known
    ? all.filter(h => h >= start)
    : Array.from({ length: Math.max(0, max - start + 1) }, (_, i) => start + i);
  const gaps = known
    ? expected.filter(h => h >= start && !filledSet.has(h))
    : (filled.length ? rowsToShow.filter(h => !filledSet.has(h)) : []);
  const continuous = !!filled.length && !gaps.length
    && Array.from({ length: Math.max(0, max - start + 1) }, (_, i) => start + i).every(h => filledSet.has(h));
  return { filled, gaps, start, max, expected, rows: rowsToShow, known, continuous };
}
function missingHangs(rows, key, dir) {
  const has = new Set(rows.filter(rowHasData).map(r => r.hang).filter(Number.isInteger));
  if (!has.size) return [];
  const expected = key ? expectedHangs(key, dir) : null;
  if (expected && expected.length) return expected.filter(h => !has.has(h));
  const max = Math.max(...has);
  const missing = [];
  for (let h = 1; h <= max; h++) if (!has.has(h)) missing.push(h);
  return missing;
}
function rowsInDir(key, dir) {
  return lotRows(key).filter(r => rowDir(key, r) === dir);
}
function quickRowsInfo(key, dir) {
  return coverageInfo(key, dir);
}
function hangRangeText(list) {
  if (!list || !list.length) return '';
  const parts = [];
  let a = list[0], b = a;
  const push = () => parts.push(a === b ? String(a) : `${a}–${b}`);
  for (let i = 1; i < list.length; i++) {
    if (list[i] === b + 1) b = list[i];
    else { push(); a = b = list[i]; }
  }
  push();
  return parts.join(', ');
}
function resumeHang(key, dir) {
  return quickHangPair(key, null, dir)[0];
}
function quickHangPair(key, seed, dir) {
  const { gaps, start, max } = quickRowsInfo(key, dir);
  const secondFrom = first => {
    const gap = gaps.find(h => h > first);
    return gap != null ? gap : Math.max(max, first) + 1;
  };
  if (Number.isInteger(seed) && seed > 0) return [seed, secondFrom(seed)];
  if (gaps.length) return [gaps[0], secondFrom(gaps[0])];
  const next = Math.max(max + 1, start);
  return [next, next + 1];
}
function rowIssuesOf(rows) {
  return rows
    .filter(rowHasData)
    .map(row => ({ row, issue: rowIssue(row) }))
    .filter(x => x.issue);
}
function mergedRefMap(key) {
  const lot = PHUC_TRA[key];
  if (!lot) return null;
  if (lot.ref) return lot.ref;
  // Lô tách hướng trên app nhưng 2026 chưa tách hướng (vd 354): đối chiếu
  // tổng gộp từng hàng với số 2026 của cả lô.
  if (!lot.dirs && lotDirs(key)) {
    const map = {};
    Object.keys(lot).forEach(h => {
      const v = Number(lot[h]);
      if (Number.isInteger(Number(h)) && Number.isFinite(v)) map[h] = v;
    });
    return Object.keys(map).length ? map : null;
  }
  return null;
}
function phucTraRef(key, hang, dir, merged) {
  if (!Number.isInteger(hang)) return null;
  const lot = PHUC_TRA[key];
  if (!lot) return null;
  let map;
  if (lot.dirs) {
    map = lot.dirs[dir] || null;
  } else if (lot.ref) {
    if (!merged) return null;
    map = lot.ref;
  } else {
    // Không có bảng riêng theo hướng thì đối chiếu hàng chỉ dùng cho tổng lô.
    map = dir && lotDirs(key) ? null : lot;
  }
  if (!map) return null;
  const ref = map[String(hang)];
  return Number.isFinite(ref) ? ref : null;
}
// 2026 từng chỉ tiêu của hàng, thứ tự [g, plus, c, k1, k2, o].
function phucTraComps(key, hang, dir) {
  if (!Number.isInteger(hang)) return null;
  const all = PHUC_TRA_COMPS[key];
  if (!all) return null;
  let block = all;
  if (dir && lotDirs(key)) {
    if (!all[dir]) return null;
    block = all[dir];
  }
  const arr = block[String(hang)];
  return Array.isArray(arr) ? arr : null;
}
function hasPhucTra(key) {
  return !!PHUC_TRA[key];
}
// Tổng 2026 đối chiếu: ưu tiên bảng chi tiết (phúc tra), thiếu mới dùng file tổng hợp.
function ref2026(key) {
  const base = BASE_BY_LOT.get(key);
  const s = PHUC_TRA_SUMS[key];
  if (s && Number.isFinite(Number(s.dt))) {
    const g = Number(s.g) || 0;
    const plus = Number(s.plus) || 0;
    const c = Number(s.c) || 0;
    const k1 = Number(s.k1) || 0;
    const k2 = Number(s.k2) || 0;
    const o = Number(s.o) || 0;
    const sum = g + plus + c + k1 + k2 + o;
    const total = Number(s.dt);
    return {
      total,
      g, plus, c, k1, k2, o,
      mismatch: total - sum,
      sum,
      detail: true,
      base,
    };
  }
  return base ? { ...base, detail: false, base } : null;
}
function phucTraOf(key, row) {
  if (!rowHasData(row) || row.dt == null) return null;
  const ref = phucTraRef(key, row.hang, rowDir(key, row), !!row._merged);
  if (ref == null) return null;
  const diff = (Number(row.dt) || 0) - ref;
  return { ref, diff, warn: Math.abs(diff) >= PHUC_TRA_MIN };
}
function phucTraIssues(key, rows) {
  return (rows || lotRows(key))
    .filter(rowHasData)
    .map(row => ({ row, pt: phucTraOf(key, row) }))
    .filter(x => x.pt && x.pt.warn);
}
function mergedPhucTraIssues(key) {
  if (!mergedRefMap(key)) return [];
  return mergeDirRows(lotRows(key))
    .map(row => ({ row, pt: phucTraOf(key, row), merged: true }))
    .filter(x => x.pt && x.pt.warn);
}
function lotDirStates(key) {
  const dirs = lotDirs(key);
  if (!dirs) return null;
  const mergedRef = !!mergedRefMap(key);
  return dirs.map(dir => {
    const rows = rowsInDir(key, dir);
    const entered = rows.filter(rowHasData);
    return {
      dir, rows, entered,
      agg: aggregate(rows),
      issues: rowIssuesOf(rows),
      dups: findDuplicates(rows),
      ptIssues: mergedRef ? [] : phucTraIssues(key, rows),
    };
  });
}
function lotState(key) {
  const base = BASE_BY_LOT.get(key);
  const ref = ref2026(key);
  const meta = lotMeta(key);
  const rows = lotRows(key);
  const entered = rows.filter(rowHasData);
  const agg = aggregate(rows);
  const dirStates = lotDirStates(key);
  const issues = dirStates
    ? dirStates.flatMap(d => d.issues.map(x => ({ ...x, dir: d.dir })))
    : rowIssuesOf(rows);
  const dups = dirStates
    ? dirStates.flatMap(d => d.dups.map(h => ({ dir: d.dir, hang: h })))
    : findDuplicates(rows);
  const ptIssues = dirStates
    ? (mergedRefMap(key) ? mergedPhucTraIssues(key)
      : dirStates.flatMap(d => d.ptIssues.map(x => ({ ...x, dir: d.dir }))))
    : phucTraIssues(key);
  const delta = ref && entered.length ? agg.dt - ref.total : null;
  const hasError = issues.length > 0 || dups.length > 0;
  const hasPt = ptIssues.length > 0;
  let level = 'empty';
  if (entered.length) {
    if (hasError || hasPt) level = 'warn';
    else if (meta.done) level = delta == null || delta === 0 ? 'done' : 'warn';
    else level = 'doing';
  }
  return { key, base, ref, meta, rows, entered, agg, dirStates, issues, dups, ptIssues, hasPt, delta, level, hasError };
}

function progressLevel(st) {
  // "Tiến độ": lô đã hoàn tất luôn tính là done (xanh), kể cả khi lệch/cảnh báo;
  // chi tiết lệch vẫn xem ở pill trạng thái và màn hình lô.
  return st.meta.done && st.level !== 'empty' ? 'done' : st.level;
}
function remoteLot(key) {
  const r = state.remote && state.remote.lots ? state.remote.lots[key] : null;
  return r && (r.entered > 0 || r.done) ? r : null;
}
function viewLevel(key) {
  const st = lotState(key);
  const lv = progressLevel(st);
  if (lv !== 'empty') return { st, level: lv, remote: null };
  const r = remoteLot(key);
  if (!r) return { st, level: 'empty', remote: null };
  const level = r.done ? 'done'
    : r.status === 'done' || r.status === 'doing' || r.status === 'warn'
      ? r.status
      : 'doing';
  return { st, level, remote: r };
}
function remoteStatusInfo(level) {
  const label = level === 'done' ? t('remoteDone') : level === 'warn' ? t('remoteWarn') : t('remoteDoing');
  return { cls: level, label, dot: level };
}

/* ============================================================
   Toast
   ============================================================ */
let toastTimer = null;
function toast(message, type) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200);
}

/* ============================================================
   Điều hướng
   ============================================================ */
function readLang() {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'vi' || v === 'km') return v;
    if (localStorage.getItem(QUICK_LANG_KEY) === 'km') return 'km';
  } catch (err) {}
  return null;
}
function readLangChosen() {
  try { return !!localStorage.getItem(LANG_KEY); } catch (err) { return false; }
}
function readGAuto() {
  try { return localStorage.getItem(GAUTO_KEY) !== '0'; } catch (err) { return true; }
}
function readRemote() {
  try {
    const d = JSON.parse(localStorage.getItem(REMOTE_KEY) || '{}');
    if (!d || typeof d !== 'object' || !d.lots || typeof d.lots !== 'object') return { at: null, lots: {} };
    return { at: d.at || null, lots: d.lots };
  } catch (err) {
    return { at: null, lots: {} };
  }
}
/* uid hàng → Tổng ĐT trước lần bấm "=" đầu tiên, để hoàn lại khi xem lô. */
const rowUndo = new Map();
const state = {
  view: 'home', homeView: 'list', zone: null, lot: null, filter: 'all', q: '',
  quickLot: null, quickFrom: 'home', quickZone: '', quickSeed: null, quickDir: 'A',
  quickReview: null, quickFocus: null,
  lotDir: 'ALL',
  recentLot: null, gAuto: readGAuto(), remote: readRemote(),
  lang: readLang() || 'vi', langChosen: readLangChosen(),
  detailLot: null, remoteDetail: null,
  lotRemoteNote: null, lotRemoteSeq: 0,
};
const QUICK_I18N = {
  vi: {
    eyebrow: 'Nhập nhanh theo tờ', title: 'Nhập nhanh', zone: 'Khu vực', zoneAll: 'Tất cả khu vực', zoneItem: 'Khu vực {z}',
    lot: 'Lô', lotOther: 'lô khác', lotDone: 'hoàn tất',
    date: 'Ngày KK', person: 'Người KK', personPh: 'Tên người kiểm kê',
    dirLabel: 'Hướng nhập', dirSwitch: 'Đang nhập hướng {dir} — lưu riêng từng hướng.', dirRange: 'Hàng cần kiểm: {range}.',
    hangNo: 'Hàng số', totalDT: 'Tổng ĐT',
    checkIdle: 'Chưa nhập', checkMissing: 'Thiếu Tổng ĐT', checkDiff: 'Lệch', checkSum6: 'tổng 6 cột',
    checkOk: 'Khớp', unitTree: 'cây', sheetThis: 'Tờ này', lotAfter: 'Lô sau lưu', diffLabel: 'Lệch',
    gAuto: 'G tự tính', gManual: 'Đủ 7 số', autoPh: 'tự tính',
    gNote: 'G = Tổng ĐT − (+, C, K1, K2, O)', gManualNote: 'Nhập đủ 7 số — tool dò khớp/lệch.',
    rowsWithData: 'hàng có số liệu', saveNext: 'Lưu & tờ tiếp', save: 'Tạm lưu', hint: '<kbd>Enter</kbd> qua ô, qua hàng <span class="qh-sep">·</span> <kbd>↑</kbd>/<kbd>↓</kbd> lùi/tới ô <span class="qh-sep">·</span> <kbd>Space</kbd> lưu &amp; sang tờ tiếp',
    pausedSaved: 'Đã tạm lưu lô {lot} · lần sau nhập tiếp từ hàng {h}.',
    draftRestored: 'Đã khôi phục bản nháp đang nhập lúc {time}.',
    progressNone: 'Lô chưa có hàng nào', progressStart: 'Bắt đầu từ hàng {h}',
    progressEntered: 'Đã nhập {n} hàng', progressMissing: 'Còn thiếu hàng {list}',
    progressContinuous: 'Đã nhập liên tục {a}–{b}', progressComplete: 'Đã nhập đủ {n} hàng cần kiểm', progressEntering: 'Đang vào hàng {list}',
    errEmptySheet: 'Chưa nhập số liệu cho tờ này.', errNoHang: 'Tờ {n}: chưa nhập số hàng.',
    warnMissing: 'Hàng {h}: thiếu Tổng ĐT (tổng 6 cột {sum})',
    warnDiff: 'Hàng {h}: Tổng ĐT {dt} lệch {diff} so với tổng 6 cột',
    warnDup: 'Hai hàng trong tờ bị trùng số. Sửa lại số hàng.',
    confirmOverwrite: 'Hàng {h} đã có dữ liệu. Ghi đè?',
    confirmMismatch: 'Có hàng lệch tổng:\n\n{list}\n\nVẫn lưu và đánh dấu cảnh báo?',
    savedRows: 'Đã lưu hàng {h}.',
    navLabel: 'Điều hướng tờ nhập', previous: 'Lui', next: 'Tới', returnCurrent: 'Về tờ đang nhập',
    reviewing: 'Đang xem hàng {list}', currentSheet: 'Tờ đang nhập · hàng {list}',
    navHint: 'Lui để kiểm tra hàng đã lưu. Bản nháp tờ đang nhập được giữ nguyên.',
    reviewHint: 'Sửa tờ này sẽ được lưu khi chuyển tờ. Tờ đang nhập vẫn được giữ riêng.',
    saveReviewNext: 'Lưu sửa & nhập tiếp',
  },
  km: {
    eyebrow: 'បញ្ចូលរហ័សតាមសន្លឹក', title: 'បញ្ចូលរហ័ស', zone: 'តំបន់', zoneAll: 'គ្រប់តំបន់', zoneItem: 'តំបន់ {z}',
    lot: 'ដីឡូតិ៍', lotOther: 'ដីឡូតិ៍ផ្សេង', lotDone: 'រួចរាល់',
    date: 'កាលបរិច្ឆេទពិនិត្យ', person: 'អ្នកពិនិត្យ', personPh: 'ឈ្មោះអ្នកពិនិត្យ',
    dirLabel: 'ទិសបញ្ចូល', dirSwitch: 'កំពុងបញ្ចូលទិស {dir} — រក្សាទុកដោយឡែកតាមទិស។', dirRange: 'ជួរត្រូវពិនិត្យ: {range}។',
    hangNo: 'លេខជួរ', totalDT: 'សរុប',
    checkIdle: 'មិនទាន់បញ្ចូល', checkMissing: 'ខ្វះសរុប', checkDiff: 'ខុសគ្នា', checkSum6: 'សរុប 6 ជួរឈរ',
    checkOk: 'ត្រូវគ្នា', unitTree: 'ដើម', sheetThis: 'សន្លឹកនេះ', lotAfter: 'ដីឡូតិ៍ក្រោយរក្សាទុក', diffLabel: 'ខុសគ្នា',
    gAuto: 'G គណនាស្វ័យប្រវត្តិ', gManual: '7 លេខ', autoPh: 'ស្វ័យប្រវត្តិ',
    gNote: 'G = សរុប − (+, C, K1, K2, O)', gManualNote: 'បញ្ចូល 7 លេខ — ពិនិត្យត្រូវ/ខុស។',
    rowsWithData: 'ជួរមានទិន្នន័យ', saveNext: 'រក្សាទុក & សន្លឹកបន្ទាប់', save: 'រក្សាទុកបណ្ដោះអាសន្ន', hint: '<kbd>Enter</kbd> ទៅប្រអប់ ឬជួរបន្ទាប់ <span class="qh-sep">·</span> <kbd>↑</kbd>/<kbd>↓</kbd> ថយ/ទៅមុខ <span class="qh-sep">·</span> <kbd>Space</kbd> រក្សាទុក &amp; សន្លឹកបន្ទាប់',
    pausedSaved: 'បានរក្សាទុកបណ្ដោះអាសន្ន ដីឡូតិ៍ {lot} · បន្តពីជួរ {h}។',
    draftRestored: 'បានស្ដារសេចក្ដីព្រាងដែលកំពុងបញ្ចូល ម៉ោង {time}។',
    progressNone: 'ដីឡូតិ៍មិនទាន់មានជួរ', progressStart: 'ចាប់ពីជួរ {h}',
    progressEntered: 'បានបញ្ចូល {n} ជួរ', progressMissing: 'នៅខ្វះជួរ {list}',
    progressContinuous: 'បញ្ចូលជាប់គ្នា {a}–{b}', progressComplete: 'បានបញ្ចូលគ្រប់ {n} ជួរត្រូវពិនិត្យ', progressEntering: 'កំពុងបញ្ចូលជួរ {list}',
    errEmptySheet: 'មិនទាន់បញ្ចូលទិន្នន័យសម្រាប់សន្លឹកនេះទេ។', errNoHang: 'សន្លឹក {n}: មិនទាន់បញ្ចូលលេខជួរ។',
    warnMissing: 'ជួរ {h}: ខ្វះសរុប (សរុប 6 ជួរឈរ {sum})',
    warnDiff: 'ជួរ {h}: សរុប {dt} ខុសគ្នា {diff} ពីសរុប 6 ជួរឈរ',
    warnDup: 'ជួរពីរក្នុងសន្លឹកមានលេខដូចគ្នា។ សូមកែលេខជួរ។',
    confirmOverwrite: 'ជួរ {h} មានទិន្នន័យរួចហើយ។ សរសេរជាន់?',
    confirmMismatch: 'មានជួរខុសសរុប:\n\n{list}\n\nនៅតែរក្សាទុក និងសម្គាល់ថាមានបញ្ហា?',
    savedRows: 'បានរក្សាទុកជួរ {h}។',
    navLabel: 'ប្ដូរសន្លឹកបញ្ចូល', previous: 'ថយក្រោយ', next: 'ទៅមុខ', returnCurrent: 'ត្រឡប់ទៅសន្លឹកកំពុងបញ្ចូល',
    reviewing: 'កំពុងពិនិត្យជួរ {list}', currentSheet: 'សន្លឹកកំពុងបញ្ចូល · ជួរ {list}',
    navHint: 'ថយក្រោយដើម្បីពិនិត្យជួរដែលបានរក្សាទុក។ សេចក្ដីព្រាងកំពុងបញ្ចូលនៅដដែល។',
    reviewHint: 'ការកែសន្លឹកនេះនឹងត្រូវរក្សាទុកពេលប្ដូរសន្លឹក។ សន្លឹកកំពុងបញ្ចូលត្រូវបានរក្សាទុកដោយឡែក។',
    saveReviewNext: 'រក្សាទុកការកែ & បន្តបញ្ចូល',
  },
};
const APP_I18N = {
  vi: {
    appTitle: 'Kiểm kê 2027 · Đội 2 CRCK2',
    brandTitle: 'Kiểm kê vườn cây 2027',
    brandSub: 'Đội 2 · CRCK2 Aphivath',
    quickEntry: 'Nhập nhanh',
    menu: 'Menu',
    close: 'Đóng',
    language: 'Ngôn ngữ',
    langVi: 'Tiếng Việt',
    langKm: 'ខ្មែរ',
    langTitle: 'Chọn ngôn ngữ',
    langToVi: 'Tiếng Việt',
    langToKm: 'ខ្មែរ',
    langToggleAriaVi: 'Chuyển sang tiếng Việt',
    langToggleAriaKm: 'Chuyển sang tiếng Khmer',
    langLead: 'Ngôn ngữ áp dụng cho toàn bộ ứng dụng. Có thể đổi lại trong Menu.',
    langFoot: 'Số, số lô và ký hiệu G, +, C, K1, K2, O giữ nguyên ở cả hai ngôn ngữ.',
    nameEyebrow: 'Trước khi bắt đầu',
    nameTitle: 'Nhập tên người dùng',
    nameLead: 'Tên này dùng để ghi rõ ai nhập dữ liệu từng lô trên Google Sheets. Chỉ cần điền một lần trên máy này.',
    nameLabel: 'Tên người dùng',
    namePh: 'VD: Lan – Đội 2',
    nameHint: 'Có thể điền sau. Tối đa 40 ký tự. Đổi lại trong ☰ → Đồng bộ Google.',
    nameContinue: 'Lưu tên',
    nameLater: 'Để sau',
    nameRequired: 'Vui lòng nhập tên trước khi lưu.',
    nameSaved: 'Đã lưu tên người dùng: {name}',
    nameLaterToast: 'Chưa có tên người dùng. Có thể điền sau trong ☰ → Đồng bộ Google.',
    heroEyebrow: 'Kiểm kê 0h · 01/01/2027',
    heroTitle: 'Nhập kết quả theo dòng tổng từng hàng',
    heroLead: 'Mỗi tờ phiếu có 2 hàng. Chỉ cần nhập 7 số ở dòng cuối. Tool tự kiểm tra <span class="nowrap">Tổng ĐT = G + (+) + C + K1 + K2 + O</span>, chặn trùng hàng và đối chiếu với kiểm kê 2026.',
    quickBySheet: 'Nhập nhanh theo tờ',
    exportAll: 'Xuất Excel tổng hợp',
    exportSummary: 'Xuất biểu tổng hợp',
    whatsNewTitle: 'Cập nhật ứng dụng',
    whatsNewNew: 'Mới',
    whatsNewOpen: 'Xem chi tiết',
    chartTitle: 'Tiến độ % toàn Đội',
    chartDone: 'Hoàn tất',
    chartDoing: 'Đang nhập',
    chartEmpty: 'Chưa nhập',
    chartLots: '{a}/{b} lô',
    statEnteredLots: 'Lô đã nhập',
    statEnteredSub: '{n} lô đã đánh dấu hoàn tất',
    statTrees: 'Tổng điểm trồng 2027',
    statTreesSub: '2026: {base} cây · lệch tạm {delta}',
    statTreesSubNo: '2026: {base} cây',
    statRows: 'Hàng đã nhập',
    statRowsSub: 'Tổng cộng dồn trên {n} lô',
    statWarn: 'Lô có cảnh báo',
    statWarnSub: '{done} khớp 2026 · {warn} cần kiểm tra',
    tabList: 'Danh sách lô',
    tabMap: 'Bản đồ tiến độ',
    filterAll: 'Tất cả',
    filterEmpty: 'Chưa nhập',
    filterDoing: 'Đang nhập',
    filterDone: 'Hoàn tất',
    filterWarn: 'Cảnh báo',
    searchPh: 'Tìm số lô, ID lô, giống…',
    addLot: '+ Lô khác',
    backup: 'Sao lưu',
    restore: 'Phục hồi',
    thLot: 'Lô',
    th2026: '2026',
    th2027: '2027',
    thDelta: 'Lệch',
    thRows: 'Số hàng',
    thStatus: 'Trạng thái',
    emptyTitle: 'Không có lô phù hợp',
    emptySub: 'Thử xoá từ khoá tìm kiếm hoặc đổi bộ lọc.',
    guideTitle: 'Hướng dẫn nhanh',
    guide1: 'Bấm <b>Nhập nhanh</b>, chọn <b>Khu vực</b> rồi chọn <b>Lô</b>, nhập <b>Hàng số</b>, <b>Tổng ĐT</b> và các số còn lại ở dòng cuối phiếu; mặc định ô <b>G tự tính</b> = Tổng ĐT − (+, C, K1, K2, O). Muốn nhập tay đủ 7 số và dò khớp/lệch thì bấm <b>Đủ 7 số</b>. Nút <b>VI / ខ្មែរ</b> đổi ngôn ngữ toàn app; số và ký hiệu G, +, C, K1, K2, O vẫn giữ nguyên.',
    guide2: 'Tool báo đỏ nếu <b>Tổng ĐT không bằng tổng 6 cột</b>. Sửa lại theo phiếu trước khi lưu.',
    guide3: 'Bấm <b>Lưu &amp; tờ tiếp</b> (hoặc nhấn <b>Space</b>) để nhập liên tục; số hàng tự tăng.',
    guide4: 'Có sự cố (thiếu phiếu…) thì bấm <b>Tạm lưu</b>. Lô sẽ hiện <b>Sơ đồ hàng</b>: ô xanh bấm để sửa, ô viền đứt bấm để nhập hàng còn thiếu; nút <b>Nhập tiếp h.N</b> mở lại đúng hàng đang dở.',
    guide5: 'Khi nhập xong một lô, bấm <b>Đánh dấu hoàn tất</b>. Mọi chênh lệch tổng so với 2026 sẽ hiện cảnh báo đỏ.',
    guide6: 'Mở tab <b>Bản đồ tiến độ</b> để biết khu vực nào còn lô chưa nhập. Bấm khu vực để phóng to, bấm ranh lô để xem nhanh hoặc mở lô.',
    guide7: 'Dữ liệu lưu trong trình duyệt trên máy này. Định kỳ bấm <b>Sao lưu</b> để tải file JSON dự phòng. Vào menu <b>Đồng bộ Google</b> để tự lưu lên Google Sheets và nhận mail khi lô hoàn tất.',
    guide8: 'Bấm <b>Xuất Excel</b> để lấy file từng lô (theo Mẫu nhập KK) hoặc file tổng hợp 0h 01/01/2027.',
    mapZonesTitle: 'Tiến độ theo khu vực',
    all: 'Tất cả',
    mapTitle: 'Bản đồ 95 lô',
    legendEmpty: 'Chưa nhập',
    legendDoing: 'Đang nhập',
    legendDone: 'Hoàn tất',
    legendWarn: 'Cảnh báo',
    mapLoading: 'Đang tải bản đồ…',
    mapFoot: 'Phóng to hoặc chọn khu vực để xem rõ số lô. Bấm vào ranh lô để xem nhanh và bấm <b>Mở lô</b> để nhập. Nền vệ tinh cần internet; khi offline ranh lô vẫn hiển thị. Lô thêm ngoài danh mục (+ Lô khác) không có ranh trên bản đồ.',
    mapLibError: 'Không tải được thư viện bản đồ.',
    mapNoGeo: 'Chưa có dữ liệu ranh lô.',
    zoneDone: '{a}/{b} xong',
    zoneDoing: '{n} đang nhập',
    zoneWarn: '{n} cảnh báo',
    zoneMissing: 'Chưa nhập {n}: <b>{list}</b>',
    zoneAllDone: 'Đã nhập đủ {a}/{b} lô',
    zoneWarnList: 'Cảnh báo: <b>{list}</b>',
    mapBadge: '{done}/{total} lô hoàn tất',
    openLot: 'Mở lô',
    backList: 'Danh sách lô',
    exportLot: 'Xuất Excel lô',
    check2Btn: 'Kiểm tra vòng 2',
    check2Eyebrow: 'Kiểm tra vòng 2',
    check2Lead: 'Dùng cho vòng kiểm tra thứ 2: so từng chỉ tiêu với 2026 và đối chiếu tổng 6 cột.',
    check2DirsTitle: 'Theo hướng (2027)',
    check2DirsNote: '2026 chỉ tách được tổng theo hướng ở lô phúc tra tách hướng; lô ghép A/B đối chiếu theo tổng lô gốc. 6 chỉ tiêu thành phần so sánh ở toàn lô.',
    check2DirCol: 'Hướng',
    check2NoData: 'Chưa nhập số liệu',
    check2NoRef: 'Chưa có số 2026',
    check2AllMatch: 'Khớp 2026',
    check2DiffCount: 'Lệch {n}/{total} chỉ tiêu',
    check2Sum27Ok: 'Tổng 6 cột khớp tổng ĐT của lô.',
    check2Sum27Diff: 'Tổng 6 cột lệch {n} so với tổng ĐT của lô.',
    check2Sum26Diff: 'Số 2026 tự lệch {n} giữa tổng và 6 cột (theo bảng gốc).',
    check2RowsTitle: 'Đối chiếu từng hàng · từng chỉ tiêu 2026 | 2027',
    check2OverviewTitle: 'Tổng quan 6 chỉ tiêu · 2026 | 2027',
    check2ColNote: 'Ghi chú',
    check2RowOk: 'Khớp',
    check2RowSmall: 'Lệch nhỏ',
    check2RowDiff: 'Cần phúc tra',
    check2RowNoRef: 'Không có 2026',
    check2RowNoDirRef: 'Chưa có 2026 theo hướng',
    check2RowMissing27: 'Thiếu 2027',
    check2RowSumBad: 'Tổng ≠ 6 cột ({d})',
    check2ColODiff: 'Lệch O',
    check2OdiffTitle: 'Chênh lệch hố trống 2027 − 2026; từ 3 trở lên tô vàng cam',
    check2RowsEditNote: 'Sửa số 2027 ngay trong bảng, bấm ra ngoài ô để lưu.',
    check2RowsMergedNote: '2026 theo hàng là số ghép A/B của tổng lô gốc; hàng chưa nhập 2027 hiện “—”. Lô ghép A/B sửa số ở màn hình lô.',
    check2RowsDirSumNote: 'Lô tách hướng A/B nhưng 2026 chưa tách hướng: số 2027 cộng A+B theo từng hàng để so tổng hàng của 2026. Sửa số ở màn hình lô.',
    check2RowsDirsNote: '2026 đối chiếu theo từng hướng; hàng có trong 2026 mà chưa nhập sẽ hiện “—”.',
    check2RowsPlainNote: '2026 đối chiếu theo số phúc tra từng hàng; hàng chưa nhập sẽ hiện “—”.',
    check2RowsNoRefNote: 'Lô này chưa có bảng phúc tra từng hàng để so 2026.',
    check2RowsNoDirRefNote: 'Lô chưa có số 2026 tách theo hướng: phần theo hướng để trống, tổng lô vẫn đối chiếu ở bảng trên.',
    check2RowsPairNote: 'Mỗi chỉ tiêu xếp 2026 cạnh 2027 để so trực tiếp.',
    check2RowsSummary: 'Có {n} hàng · {d} lệch · {m} thiếu 2027.',
    markDone: 'Đánh dấu hoàn tất',
    reopenLot: 'Mở lại lô',
    compareTitle: 'Đối chiếu 2026 → 2027',
    metric: 'Chỉ tiêu',
    metricTotal: 'Tổng ĐT',
    catG: 'Cây cạo (G)',
    catPlus: 'Cây +',
    catC: 'Cây C',
    catK1: 'Cây K1',
    catK2: 'Cây K2',
    catO: 'Hố trống (O)',
    infoCard: 'Thông tin phiếu',
    huongLot: 'Hướng lô',
    huongPh: 'VD: Đông Tây',
    thDir: 'Hướng',
    dirAll: 'Tất cả',
    dirTitle: 'Hướng lô',
    dirChipTitle: 'Xem và nhập hướng {dir}',
    dirNote: 'Lô này chia {n} hướng {list}. Nhập lần lượt từng hướng — kiểm tra và phúc tra tính riêng từng hướng; khi xuất Excel app ghép và cộng các hướng thành 1 lô hoàn chỉnh.',
    dirNoteMerged: 'Lô này chia {n} hướng {list}. Nhập lần lượt từng hướng; phúc tra tính trên tổng ghép theo file 2026 gốc, từng hướng chỉ tham khảo. Khi xuất Excel app ghép và cộng các hướng thành 1 lô hoàn chỉnh.',
    dirSummary: 'Cả lô: {dt} cây · 2026: {base} · lệch {d}',
    dirSummaryNoBase: 'Cả lô: {dt} cây',
    dirTotal: 'Tổng hướng {dir}',
    dirTotalAll: 'Tổng cả lô',
    dirMissing: 'Hướng {list} chưa nhập hàng nào.',
    dirConfirmDone: 'Còn hướng {list} chưa có dữ liệu. Vẫn đánh dấu hoàn tất lô?',
    dirChecksTotal: 'Hướng {dir}: {n} hàng · {dt} cây',
    dirAlertPrefix: 'Hướng {dir}',
    dirLotMeta: 'Hướng {list}',
    dirQuickNote: 'Đang nhập hướng {dir}',
    ngayKK: 'Ngày KK',
    nguoiKK: 'Người KK',
    personPh: 'Tên người kiểm kê',
    ghiChu: 'Ghi chú',
    ghiChuPh: 'Ghi chú riêng của lô…',
    rowsTitle: 'Chi tiết theo hàng',
    addRow: '+ Thêm hàng',
    thHang: 'Hàng',
    thTotal: 'Tổng ĐT',
    thCheck: 'Kiểm tra',
    thPhucTra: 'Phúc tra',
    thPhucTraTip: 'So sánh Tổng ĐT từng hàng với bảng chi tiết kiểm kê 2026 · lệch từ 2 cây được tô sáng',
    phucTraTip: 'Kiểm kê 2026: {ref} cây · 2027 lệch {d}',
    phucTraTipMerged: 'Ghép A+B · 2026 gốc {ref} cây · hiện tại {dt} cây · lệch {d}',
    phucTraRefMerged: 'Ghép 2026 · {ref}',
    phucTraNoRef: 'Không có số 2026 cho hàng này',
    phucTraDirRef: 'Hướng A/B chỉ tham khảo — phúc tra tính trên tổng ghép',
    rowsPtNote: 'Phúc tra theo bảng chi tiết 2026. Hàng lệch từ 2 cây được tô sáng để Giám sát kiểm tra lại.',
    rowsPtMergedNote: 'Phúc tra tính trên tổng ghép A/B theo bảng lô 2026 gốc; số trên mỗi hàng là tổng A+B của hàng đó.',
    rowsPtNoData: 'Lô này chưa có bảng chi tiết 2026 theo từng hàng (lô chia nhiều hướng A/B/C hoặc lô mới) nên chưa phúc tra từng hàng.',
    ptSumWarn: '{n} hàng lệch',
    ptSumWarnTip: '{n} hàng lệch từ 2 cây so với 2026 — cần kiểm tra lại',
    ptSumMergedTip: 'Tính trên tổng ghép A/B theo file 2026 gốc',
    ptSumOk: 'Khớp 2026',
    dirMergedTag: 'Ghép A/B',
    hangMapMerged: 'Sơ đồ hàng · Ghép A/B',
    checksPhucTra: '<b>Phúc tra 2026:</b> {n} hàng lệch từ 2 cây: {list}. Đề nghị Giám sát kiểm tra lại.',
    checksPhucTraOk: 'Phúc tra 2026: các hàng đã nhập khớp bảng chi tiết (lệch dưới 2 cây).',
    checksPhucTraMergedRef: 'A/B chỉ tham khảo; phúc tra tính trên tổng ghép theo file 2026 gốc.',
    checksPhucTraNoData: 'Lô chia nhiều hướng (A/B/C): chưa có bảng chi tiết 2026 để phúc tra từng hàng.',
    alertPhucTra: '<b>Phúc tra 2026:</b> {n} hàng lệch từ 2 cây trở lên so với bảng chi tiết 2026: {list}. Đề nghị Giám sát kiểm tra lại các hàng này.',
    hangChipPt: 'phúc tra lệch {d}',
    total: 'Tổng',
    rowsFoot: 'Nhập số âm? Không. Ô trống được tính là 0. Nút <b>=</b> cạnh Tổng ĐT để tự điền tổng 6 cột.',
    rowMissing: 'Thiếu ĐT',
    rowDiff: 'Lệch {n}',
    rowOk: 'Khớp',
    rowsOddNote: 'Có {n} hàng có Tổng ĐT khác mức chung {med}: hàng {list}. Xem lại trước khi chốt lô.',
    rowOddTip: 'Tổng ĐT lệch {n} cây so với mức chung {med} của lô',
    treeUnit: 'cây',
    emptyRows: 'Chưa có hàng nào. Bấm <b>Nhập nhanh</b> để nhập 2 hàng mỗi tờ, hoặc <b>+ Thêm hàng</b> để nhập thủ công.',
    sumIssues: '{n} hàng lệch tổng',
    sumOk: 'Đã khớp {n} hàng',
    rowCount: '{n} hàng đã nhập',
    calcTitle: 'Điền Tổng ĐT = tổng 6 cột',
    undoCalcTitle: 'Trả lại Tổng ĐT trước khi bấm =',
    undoEditTitle: 'Hoàn tác lần sửa trước của hàng này',
    delRowTitle: 'Xoá hàng',
    confirmDelRow: 'Xoá hàng {h}? Dữ liệu của hàng này sẽ mất.',
    toastDone: 'Đã đánh dấu hoàn tất lô {lot} lúc {time}',
    toastDoneEmpty: 'Lô chưa nhập hàng nào — không thể đánh dấu hoàn tất.',
    issueMissing: 'thiếu Tổng ĐT (tổng 6 cột = {sum})',
    issueDiff: 'Tổng ĐT {dt} ≠ tổng 6 cột {sum} (lệch {d})',
    hangMapTitle: 'Sơ đồ hàng',
    hangBadge: '{n} hàng',
    hangBadgeMissing: ' · thiếu {n}',
    hangBadgeIssues: ' · {n} lệch',
    hangMissing: 'Còn thiếu <b>{n}</b> hàng: <b>{list}</b>.',
    hangContinuous: 'Đã nhập liên tục hàng 1–{max}.',
    hangCompleteList: 'Đã nhập đủ {n} hàng cần kiểm.',
    hangHint: ' Ô xanh bấm để sửa hàng; ô viền đứt bấm để nhập hàng thiếu.',
    hangBtnFill: 'Nhập hàng {h}',
    hangBtnResume: 'Nhập tiếp hàng {h}',
    hangChipEdit: 'Hàng {h} {st} — bấm để sửa',
    hangChipFill: 'Hàng {h} chưa nhập — bấm để nhập',
    hangChipMatched: 'đã khớp',
    hangChipDiff: 'lệch tổng',
    checksTitle: 'Kiểm tra dữ liệu',
    checksNoData: 'Chưa có dữ liệu để kiểm tra.',
    checksIssueCount: '{n} hàng lệch tổng:',
    checksRow: 'hàng {h}',
    checksAllOk: 'Tất cả hàng đã khớp: Tổng ĐT = G + (+) + C + K1 + K2 + O.',
    checksNoDup: 'Không có hàng trùng số.',
    checksDup: '<b>Hàng trùng:</b> {list}.',
    checksTotalLine: 'Đã nhập <b>{n}</b> hàng · lũy kế <b>{dt}</b> cây.',
    baselineEqual: 'Tổng so 2026: khớp <b>{n}</b> cây.',
    baselineDiff: 'Tổng so 2026: 2027 <b>{a}</b> / 2026 <b>{b}</b> · lệch <b>{d}</b> ({p}).',
    baselineMismatch: 'Baseline 2026 tự lệch <b>{n}</b> cây (tổng 6 cột {sum}).',
    detailMismatch: 'Bảng chi tiết 2026 tự lệch {n} cây giữa tổng và 6 cột (tổng 6 cột {sum}).',
    checksNoBaseline: 'Lô ngoài danh mục, không có baseline 2026.',
    checksDone: 'Lô đã được đánh dấu hoàn tất.',
    checksNotDone: 'Lô chưa đánh dấu hoàn tất.',
    statusEmpty: 'Chưa nhập',
    statusDoing: 'Đang nhập',
    statusPaused: 'Tạm lưu',
    statusDone: 'Hoàn tất',
    statusMatch2026: 'Khớp 2026',
    statusError: 'Lỗi dữ liệu',
    statusPhucTra: 'Cần phúc tra',
    statusWarn: 'Có cảnh báo',
    statusDiff: 'Lệch {n}',
    lotOutside: 'Lô ngoài danh mục',
    metaPlantYear: 'trồng {year}',
    metaPaused: 'tạm lưu · tiếp h.{h}',
    compareBadgeNoBase: 'Không baseline',
    compareBadgeEmpty: 'Chưa nhập',
    compareBadgeMatch: 'Khớp 2026',
    compareBadgeWarn: 'Có cảnh báo',
    compareBadgeDiff: 'Lệch {n}',
    noBaseNote: 'Lô ngoài danh mục nên không có baseline 2026. Tool vẫn kiểm tra tổng hàng và xuất Excel bình thường.',
    baselineNote: 'Baseline: kiểm kê 0h 01/01/2026 · {id} · {total} cây. Nguồn: TỔNG HỢP KIỂM KÊ 2025-2026.xlsx.',
    baselineNotePhucTra: 'Đối chiếu 2026 theo bảng chi tiết (phúc tra) · {id} · {total} cây.',
    baselineNoteSummaryDiff: 'Bảng tổng hợp 2026 ghi {total} cây.',
    alertNoRows: '<b>Chưa nhập hàng nào.</b> Bấm <b>Nhập nhanh</b> để nhập 2 hàng mỗi tờ từ dòng cuối phiếu.',
    alertIssues: '<b>{n} hàng lệch tổng.</b><br>{first}',
    alertIssuesMore: '<br>… và {n} hàng khác.',
    alertDup: '<b>Hàng bị trùng số:</b> {list}. Mỗi hàng chỉ được nhập một lần.',
    alertNoBase: 'Lô ngoài danh mục: không có baseline 2026 để đối chiếu tổng.',
    alertAllOk: 'Dữ liệu đang khớp. Nếu đã nhập đủ, bấm <b>Đánh dấu hoàn tất</b> để chốt lô.',
    alertMsgDiff: 'Tổng 2027 <b>{dt}</b> so với 2026 <b>{base}</b> · lệch <b>{d}</b> ({p}).',
    alertDoneDiff: '<b>Lô đã hoàn tất nhưng còn lệch.</b> {msg}<br>Kiểm tra lại các hàng đã nhập hoặc phiếu giấy.',
    alertTempDiff: '<b>Lệch tạm tính.</b> {msg}<br>Nếu lô chưa nhập đủ hàng thì bỏ qua cảnh báo này. Khi nhập xong, <b>đánh dấu hoàn tất</b> để chốt lô — hệ thống sẽ tự động gửi file báo cáo cho Trợ lý tổng hợp.',
    alertMatch: '<b>Tổng 2027 khớp 2026:</b> {n}',
    alertBaseMismatch: '<b>Baseline 2026 có nội bộ lệch {n}.</b> Tổng số cây KK là {total}, nhưng cộng 6 cột chỉ {sum}. Nên kiểm tra lại file 2026 gốc.',
    checksMissingRow: 'Còn thiếu <b>{n}</b> hàng so với danh sách phúc tra: {list}.',
    checksMatchTotal: 'Tổng so 2026: khớp <b>{n}</b> cây.',
    lotEyebrow: 'Đội {doi} · {id}',
    lotNoId: 'chưa có ID',
    noBaselineSub: 'Không có dữ liệu baseline 2026 để đối chiếu tự động.',
    doneSuffix: ' · Hoàn tất {time}',
    pauseSuffix: ' · Tạm lưu {time}',
    resumeHangBtn: 'Nhập tiếp h.{h}',
    resumeDirBtn: 'Nhập tiếp {dir} · h.{h}',
    menuTitle: 'Menu',
    menuExport: 'Xuất Excel tổng hợp',
    menuExportSub: '95 lô + sheet cảnh báo',
    menuBackup: 'Sao lưu dữ liệu (JSON)',
    menuBackupSub: 'Tải file dự phòng về máy',
    menuRestore: 'Phục hồi từ JSON',
    menuRestoreSub: 'Ghi đè dữ liệu đang có',
    menuSync: 'Đồng bộ Google & báo cáo mail',
    menuSyncSub: 'Chưa kết nối',
    menuDetail: 'Chi tiết đồng bộ (Google)',
    menuDetailSub: 'Xem từng hàng máy khác đã nhập',
    menuInstall: 'Cài ứng dụng lên Desktop',
    menuInstallSub: 'Chạy như app, dùng offline',
    menuDemo: 'Điền thử lô 250',
    menuDemoSub: 'Hàng 01 + 02 từ ảnh phiếu mẫu',
    menuReset: 'Xoá toàn bộ dữ liệu',
    menuResetSub: 'Không thể hoàn tác',
    menuLang: 'Ngôn ngữ',
    menuFootnote: 'Dữ liệu nằm trong trình duyệt của máy này (localStorage). Đổi máy hoặc xoá dữ liệu trình duyệt sẽ mất, nên hãy sao lưu JSON định kỳ.',
    syncEyebrow: 'Google Sheets + Gmail',
    syncTitle: 'Đồng bộ & báo cáo mail',
    syncLead: 'Dán URL Web App của Apps Script. App tự ghi dữ liệu vào Google Sheets; khi một lô được đánh dấu <b>hoàn tất</b>, Google gửi mail kèm file Excel báo cáo cho anh.',
    syncUrlLabel: 'URL Web App (Apps Script)',
    syncDeviceLabel: 'Tên máy / người nhập',
    syncDeviceHint: 'Điền một lần trên máy này (VD: Lan – Đội 2) để tab Chi tiết và Nhật ký ghi rõ ai nhập.',
    syncDevicePh: 'VD: Lan – Đội 2',
    syncEnabled: 'Tự đồng bộ sau khi lưu dữ liệu',
    syncStatusInit: 'Chưa kết nối.',
    syncSave: 'Lưu cấu hình',
    syncTest: 'Gửi thử',
    syncNow: 'Đồng bộ ngay',
    syncGuideTitle: 'Hướng dẫn cài đặt (5 phút)',
    syncStep1: 'Mở <a href="https://script.google.com/" target="_blank" rel="noopener">script.google.com</a> → <b>Dự án mới</b>.',
    syncStep2: 'Xoá nội dung mặc định, dán toàn bộ mã <code>Code.gs</code> (bấm <b>Sao chép mã Code.gs</b> bên dưới).',
    syncStep3: 'Sửa <code>EMAIL_NHAN</code> ở đầu file nếu muốn nhận mail ở địa chỉ khác (mặc định: Gmail đang đăng nhập).',
    syncStep4: 'Bấm <b>Triển khai → Triển khai mới → Ứng dụng web</b>; chọn <b>Thực thi với tư cách: Tôi</b>; <b>Ai có quyền truy cập: Mọi người</b>. Cấp quyền khi Google hỏi.',
    syncStep5: 'Sao chép URL dạng <code>…/exec</code> dán vào ô trên, bấm <b>Gửi thử</b>.',
    copyScript: 'Sao chép mã Code.gs',
    downloadScript: 'Tải Code.gs',
    syncFootnote: 'Lần chạy đầu Google sẽ yêu cầu quyền đọc/ghi Google Sheets và gửi mail. Dữ liệu chỉ nằm trong Drive của anh, không gửi cho bên thứ ba. Mỗi lần bấm “Gửi thử” sẽ gửi 1 mail thử.',
    toastNoStore: 'Không lưu được dữ liệu. Bộ nhớ trình duyệt có thể đã đầy.',
    toastAddedLot: 'Đã thêm lô ngoài danh mục: {lot}',
    toastLotExists: 'Lô này đã có trong danh sách.',
    toastReopened: 'Đã mở lại lô {lot}',
    updSumTitle: 'Lô đã sửa sau khi hoàn tất',
    updSumHint: 'Bấm cập nhật để gửi lại số liệu mới cho Trợ lý tổng hợp; không bấm thì bản đã gửi giữ nguyên.',
    updSumBtn: 'Cập nhật biểu tổng hợp',
    toastExportOk: 'Đã xuất: {file}',
    toastExportFail: 'Không xuất được file Excel: {err}',
    toastNoExportData: 'Lô chưa có dữ liệu để xuất.',
    toastNoExportAll: 'Chưa có lô nào được nhập dữ liệu.',
    toastNoDoneLots: 'Chưa có lô nào được đánh dấu hoàn tất.',
    exportConfirm: 'Lô chưa được đánh dấu hoàn tất. Vẫn xuất file?',
    addLotPrompt: 'Nhập số lô / tên lô mới (ví dụ: 950):',
    backupOk: 'Đã tải file sao lưu JSON.',
    restoreBadFile: 'File không đúng cấu trúc.',
    restoreConfirm: 'Phục hồi sẽ ghi đè toàn bộ dữ liệu đang có. Tiếp tục?',
    restoreOk: 'Đã phục hồi dữ liệu từ file.',
    restoreFail: 'Không đọc được file: {err}',
    demoConfirm: 'Lô 250 đã có dữ liệu. Ghi đè hàng 1 và 2 bằng dữ liệu mẫu từ ảnh phiếu?',
    demoDone: 'Đã điền thử 2 hàng lô 250 từ ảnh phiếu mẫu.',
    resetConfirm: 'Xoá TOÀN BỘ dữ liệu đã nhập trên máy này? Không thể hoàn tác.',
    resetPrompt: 'Gõ XOA để xác nhận xoá toàn bộ:',
    resetCancel: 'Đã huỷ xoá.',
    resetDone: 'Đã xoá toàn bộ dữ liệu.',
    syncUrlMissing: 'Chưa cấu hình URL Apps Script.',
    syncHttpError: 'Máy chủ trả về HTTP {code}',
    syncAppError: 'Apps Script báo lỗi: {err}',
    syncStatusNone: 'Chưa kết nối',
    syncStatusConnected: 'Đã kết nối · {time}',
    syncStatusConfigured: 'Đã cấu hình URL',
    syncStatusHelp: 'Chưa kết nối. Dán URL Web App bên dưới để bật đồng bộ.',
    syncStatusNotSynced: 'Đã cấu hình URL, chưa đồng bộ lần nào.',
    syncNoUrl: 'Chưa cấu hình URL Apps Script trong menu Đồng bộ Google.',
    syncSending: 'Đang gửi dữ liệu lên Google…',
    syncNoResponse: 'Đã gửi (không đọc được phản hồi)',
    syncNoResponseToast: 'Đã gửi tới Google nhưng không đọc được phản hồi. Kiểm tra Google Sheets hoặc hộp thư.',
    syncTestOkMail: 'Kết nối tốt. Đã gửi mail thử, kiểm tra hộp thư.',
    syncTestOkSheet: 'Kết nối tốt. Đã ghi dữ liệu lên Google Sheets.',
    syncOkUrl: 'Đã đồng bộ. Mở Google Sheets trong menu.',
    syncOk: 'Đã đồng bộ Google Sheets.',
    syncErrorPrefix: 'Lỗi',
    syncErrorToast: 'Đồng bộ lỗi: {err}',
    syncPasteFirst: 'Dán URL Web App trước đã.',
    syncUrlFormat: 'URL phải có dạng https://script.google.com/macros/s/…/exec',
    syncSaved: 'Đã lưu cấu hình đồng bộ.',
    syncDisabled: 'Đã tắt đồng bộ (chưa có URL).',
    syncLast: 'Lần cuối: {time}',
    syncLotMail: 'Đã gửi mail báo cáo lô {lot}.',
    syncLotSheet: 'Đã đồng bộ lô {lot} lên Google Sheets.',
    copyOk: 'Đã sao chép Code.gs. Dán vào script.google.com.',
    copyFail: 'Không sao chép được. Bấm "Tải Code.gs" để tải file.',
    langChange: 'Đổi ngôn ngữ',
    syncPull: 'Tải tiến độ đội về máy',
    syncPullHint: 'Bấm “Tải tiến độ đội về máy” để xem lô máy khác đã nhập/hoàn tất trên bản đồ. Chỉ đọc, không ghi vào dữ liệu máy này.',
    legendRemote: 'Từ máy khác',
    remoteDoing: 'Máy khác đang nhập',
    remoteDone: 'Máy khác đã hoàn tất',
    remoteWarn: 'Máy khác: cảnh báo',
    remotePopNote: 'Số liệu từ máy khác · cập nhật {time}',
    remoteNone: 'Chưa có tiến độ từ máy khác.',
    remoteEmpty: 'Đã kết nối Google · hiện chưa có lô nào từ máy khác.',
    remotePulling: 'Đang tải tiến độ đội…',
    remotePulled: 'Đã tải tiến độ đội: {n} lô.',
    remotePullFail: 'Không tải được tiến độ: {err}',
    remoteOldScript: 'Code.gs trên Google chưa cập nhật. Dán lại Code.gs mới và Triển khai phiên bản mới.',
    remoteSummary: 'Đội: {doing} đang nhập · {done} hoàn tất · cập nhật {time}',
    btnDetailLot: 'Chi tiết đồng bộ',
    detailEyebrow: 'Google Sheets',
    detailTitle: 'Chi tiết đồng bộ',
    detailLead: 'Dữ liệu đọc từ tab Chi tiết trên Google Sheets. Chỉ xem, không sửa dữ liệu trên máy này.',
    detailLotLabel: 'Lô',
    detailRefresh: 'Tải lại',
    detailDiff: 'Lệch phúc tra',
    detailLoading: 'Đang tải chi tiết từ Google…',
    detailError: 'Không tải được chi tiết: {err}',
    detailEmpty: 'Chưa có dữ liệu chi tiết trên Google Sheets. Hãy đồng bộ từ máy đã nhập dữ liệu.',
    detailFoot: 'Dòng tô vàng: phúc tra lệch từ 2 cây. Dòng tô hồng: thiếu/lệch tổng, thiếu hoặc trùng số hàng. Dữ liệu này chỉ để xem, mọi chỉnh sửa phải thực hiện trên máy đã nhập lô.',
    detailUpdated: 'Cập nhật {time}',
    lotRemoteLoading: 'Đang tải bản mới nhất từ Google Sheet…',
    lotRemoteUpdated: 'Đã tải bản mới nhất do {device} lưu lúc {time}.',
    lotRemoteUpdatedNoDev: 'Đã tải bản mới nhất từ Google Sheet lúc {time}.',
    lotRemoteConflict: 'Lô này vừa được {device} sửa lúc {time} — đã tải bản mới nhất về máy.',
    lotRemoteLocalNewer: 'Máy này có bản mới hơn chưa đồng bộ — giữ bản trên máy, không tải bản Google.',
    lotRemoteDraft: 'Còn bản nháp đang nhập trên máy — không tự tải bản Google. Lưu xong rồi mở lại lô.',
    lotRemoteEditing: 'Đang nhập trên máy — không tự tải bản Google để tránh ghi đè.',
    lotRemoteError: 'Không tải được bản mới nhất từ Google: {err}',
    lotRemoteDiscard: 'Bỏ nháp, tải bản Google',
    lotRemoteDiscardConfirm: 'Bỏ bản nháp chưa lưu của lô này trên máy và tải bản mới nhất từ Google Sheet?',
    detailRowsCount: '{n} hàng',
    detailLocalOnly: 'Chưa thấy trên Google (chỉ có trên máy này): {list} · bấm Đồng bộ ngay để gửi.',
    detailLocalOnlyItem: '{lot} ({n} hàng)',
    detailWarnCount: '{n} cảnh báo',
    detailNoWarn: 'Không có cảnh báo',
    detailDevice: 'Máy / người nhập: {device}',
    detailNguoi: 'Người KK: {nguoi}',
    detailOption: '{lot} · {n} hàng',
    detailOptionKv: '{lot} · {kv} · {n} hàng',
    notiAria: 'Thông báo lô nhập hôm nay',
    notiTitle: 'Lô nhập hôm nay',
    notiEyebrow: 'Tiến độ đội',
    notiLead: 'Các lô máy khác đã nhập hôm nay. Bấm một lô để xem chi tiết từ Google Sheets.',
    notiEmpty: 'Hôm nay chưa có lô nào từ máy khác.',
    notiNotSynced: 'Chưa tải được tiến độ đội. Kiểm tra kết nối rồi bấm Tải lại.',
    notiRefresh: 'Tải lại',
    notiFoot: 'Thông báo tính riêng trên máy này — máy khác chưa xem vẫn thấy thông báo của họ.',
    notiNew: 'Mới',
    notiStatusDone: 'Hoàn tất',
    notiStatusWarn: 'Cảnh báo',
    notiStatusDoing: 'Đang nhập',
    notiLot: 'Lô {lot}',
    notiRows: '{n} hàng',
    notiTree: 'cây',
    notiTabToday: 'Hôm nay',
    notiTabHistory: 'Lịch sử',
    historyLead: 'Lịch sử đồng bộ trên Google Sheets: theo ngày, máy nhập và lô thay đổi.',
    historyRangeAria: 'Khoảng thời gian',
    historyDeviceAria: 'Máy nhập',
    historyDays7: '7 ngày',
    historyDays30: '30 ngày',
    historyDays90: '90 ngày',
    historyDays365: '1 năm',
    historyAllDevices: 'Tất cả máy',
    historyEmpty: 'Chưa có lần đồng bộ nào trong khoảng này.',
    historyLoading: 'Đang tải lịch sử…',
    historyTitle: 'Nhật ký nhập',
    historyEyebrow: 'Lịch sử đồng bộ',
    historyFoot: 'Lịch sử lấy từ tab Nhật ký trên Google Sheets, giữ lại để xem sau.',
    historyError: 'Chưa tải được lịch sử: {err}',
    historyNoDevice: 'Không rõ máy',
    historyChanged: 'Lô: {list}',
    historySync: 'Đổi {n} lô',
    historyRuns: '{n} lần',
    historyLot: 'Lô {lot}',
    historyDelta: 'Lệch',
    historyEdits: 'Sửa {n} hàng',
    historyFromImport: 'theo Nhật ký nhập',
    historySparse: 'Bản ghi cũ, không có chi tiết',
    historyNoChanges: 'Không có thay đổi',
    statsBtn: 'Thống kê nhập',
    statsTitle: 'Thống kê người nhập',
    statsEyebrow: 'Danh sách nhập theo người',
    statsLead: 'Lô tính theo người nhập đầu tiên. Người sửa lô sau đó không được tính. Số lô gồm lô trên máy này và lô đã tải từ Google.',
    statsFoot: 'Lô nhập trước bản 69 lấy tên máy ghi lô sớm nhất trong Nhật ký; máy chưa đặt tên thì theo “Người KK” của lô.',
    statsRefresh: 'Tải lại từ Google',
    statsTotalPeople: '{n} người',
    statsTotalLots: '{n} lô',
    statsTotalTrees: '{n} cây',
    statsLotUnit: 'lô',
    statsUnknown: 'Chưa rõ người nhập',
    statsFromSheet: 'Máy khác',
    statsEmpty: 'Chưa có lô nào được nhập.',
    statsLoadingHistory: 'Đang tải Nhật ký để lấy tên người nhập…',
    statsHistoryError: 'Chưa tải được Nhật ký: {err}',
  },
  km: {
    appTitle: 'ការរាប់ដើមឈើ 2027 · ក្រុមទី 2 CRCK2',
    brandTitle: 'ការរាប់ដើមឈើកៅស៊ូ 2027',
    brandSub: 'ក្រុមទី 2 · CRCK2 Aphivath',
    quickEntry: 'បញ្ចូលរហ័ស',
    menu: 'ម៉ឺនុយ',
    close: 'បិទ',
    language: 'ភាសា',
    langVi: 'ភាសាវៀតណាម',
    langKm: 'ខ្មែរ',
    langTitle: 'ជ្រើសរើសភាសា',
    langToVi: 'Tiếng Việt',
    langToKm: 'ខ្មែរ',
    langToggleAriaVi: 'ប្តូរទៅភាសាវៀតណាម',
    langToggleAriaKm: 'ប្តូរទៅភាសាខ្មែរ',
    langLead: 'ភាសានឹងប្រើសម្រាប់កម្មវិធីទាំងមូល។ អាចប្តូរវិញនៅក្នុងម៉ឺនុយ។',
    langFoot: 'លេខ លេខដីឡូតិ៍ និងសញ្ញា G, +, C, K1, K2, O រក្សាដូចដើមទាំងពីរភាសា។',
    nameEyebrow: 'មុនពេលចាប់ផ្តើម',
    nameTitle: 'បញ្ចូលឈ្មោះអ្នកប្រើ',
    nameLead: 'ឈ្មោះនេះប្រើដើម្បីកត់ត្រាថាអ្នកណាបញ្ចូលទិន្នន័យដីឡូតិ៍នីមួយៗក្នុង Google Sheets។ បំពេញតែម្តងលើឧបករណ៍នេះ។',
    nameLabel: 'ឈ្មោះអ្នកប្រើ',
    namePh: 'ឧ. Lan – Team 2',
    nameHint: 'មិនចាំបាច់បំពេញភ្លាមក៏បាន។ អតិបរមា 40 តួអក្សរ។ សូមសរសេរឈ្មោះជាអក្សរឡាតាំង (English)។ អាចប្តូរពេលក្រោយក្នុង ☰ → ធ្វើសមកាល Google។',
    nameContinue: 'រក្សាទុកឈ្មោះ',
    nameLater: 'ពេលក្រោយ',
    nameRequired: 'សូមបញ្ចូលឈ្មោះមុននឹងរក្សាទុក។',
    nameSaved: 'បានរក្សាទុកឈ្មោះអ្នកប្រើ៖ {name}',
    nameLaterToast: 'មិនទាន់មានឈ្មោះអ្នកប្រើ។ អាចបំពេញពេលក្រោយក្នុង ☰ → ធ្វើសមកាល Google។',
    heroEyebrow: 'ការរាប់ពេល 0 ម៉ោង · 01/01/2027',
    heroTitle: 'បញ្ចូលលទ្ធផលតាមជួរសរុបនៃជួរនីមួយៗ',
    heroLead: 'សន្លឹកមួយមាន 2 ជួរ។ បញ្ចូលតែ 7 លេខនៅជួរចុងក្រោយ។ កម្មវិធីពិនិត្យស្វ័យប្រវត្តិ <span class="nowrap">សរុប = G + (+) + C + K1 + K2 + O</span> ហាមជួរស្ទួន និងប្រៀបធៀបនឹងការរាប់ឆ្នាំ 2026។',
    quickBySheet: 'បញ្ចូលរហ័សតាមសន្លឹក',
    exportAll: 'នាំចេញ Excel សរុប',
    exportSummary: 'នាំចេញតារាងសង្ខេប',
    whatsNewTitle: 'ការធ្វើបច្ចុប្បន្នភាពកម្មវិធី',
    whatsNewNew: 'ថ្មី',
    whatsNewOpen: 'មើលលម្អិត',
    chartTitle: 'វឌ្ឍនភាព % ទូទាំងក្រុម',
    chartDone: 'រួចរាល់',
    chartDoing: 'កំពុងបញ្ចូល',
    chartEmpty: 'មិនទាន់បញ្ចូល',
    chartLots: '{a}/{b} ដីឡូតិ៍',
    statEnteredLots: 'ដីឡូតិ៍បានបញ្ចូល',
    statEnteredSub: 'ដីឡូតិ៍ {n} បានសម្គាល់រួចរាល់',
    statTrees: 'សរុបចំណុចដាំ 2027',
    statTreesSub: '2026: {base} ដើម · ខុសគ្នាបណ្ដោះអាសន្ន {delta}',
    statTreesSubNo: '2026: {base} ដើម',
    statRows: 'ជួរបានបញ្ចូល',
    statRowsSub: 'សរុបលើដីឡូតិ៍ {n}',
    statWarn: 'ដីឡូតិ៍មានការព្រមាន',
    statWarnSub: '{done} ត្រូវនឹង 2026 · {warn} ត្រូវពិនិត្យ',
    tabList: 'បញ្ជីដីឡូតិ៍',
    tabMap: 'ផែនទីវឌ្ឍនភាព',
    filterAll: 'ទាំងអស់',
    filterEmpty: 'មិនទាន់បញ្ចូល',
    filterDoing: 'កំពុងបញ្ចូល',
    filterDone: 'រួចរាល់',
    filterWarn: 'ការព្រមាន',
    searchPh: 'ស្វែងរកលេខដីឡូតិ៍, ID, ពូជ…',
    addLot: '+ ដីឡូតិ៍ផ្សេង',
    backup: 'បម្រុងទុក',
    restore: 'ស្ដារឡើងវិញ',
    thLot: 'ដីឡូតិ៍',
    th2026: '2026',
    th2027: '2027',
    thDelta: 'ខុសគ្នា',
    thRows: 'ចំនួនជួរ',
    thStatus: 'ស្ថានភាព',
    emptyTitle: 'គ្មានដីឡូតិ៍ត្រូវគ្នា',
    emptySub: 'សូមលុបពាក្យស្វែងរក ឬប្តូរតម្រង។',
    guideTitle: 'ការណែនាំខ្លី',
    guide1: 'ចុច <b>បញ្ចូលរហ័ស</b> ជ្រើស <b>តំបន់</b> រួចជ្រើស <b>ដីឡូតិ៍</b> បញ្ចូល <b>លេខជួរ</b>, <b>សរុប</b> និងលេខផ្សេងទៀតនៅជួរចុងក្រោយនៃសន្លឹក; តាមលំនាំដើម <b>G គណនាស្វ័យប្រវត្តិ</b> = សរុប − (+, C, K1, K2, O)។ បើចង់បញ្ចូល 7 លេខដោយដៃ និងពិនិត្យត្រូវ/ខុស សូមចុច <b>7 លេខ</b>។ ប៊ូតុង <b>VI / ខ្មែរ</b> ប្តូរភាសាទាំងកម្មវិធី; លេខ និងសញ្ញា G, +, C, K1, K2, O នៅដដែល។',
    guide2: 'កម្មវិធីព្រមានពណ៌ក្រហម បើ <b>សរុបមិនស្មើនឹងសរុប 6 ជួរឈរ</b>។ កែតាមសន្លឹកមុនរក្សាទុក។',
    guide3: 'ចុច <b>រក្សាទុក &amp; សន្លឹកបន្ទាប់</b> (ឬចុច <b>Space</b>) ដើម្បីបញ្ចូលបន្ត; លេខជួរកើនដោយស្វ័យប្រវត្តិ។',
    guide4: 'បើមានបញ្ហា (ខ្វះសន្លឹក…) ចុច <b>រក្សាទុកបណ្ដោះអាសន្ន</b>។ ដីឡូតិ៍នឹងបង្ហាញ <b>តារាងជួរ</b>៖ ប្រអប់ពណ៌បៃតងចុចដើម្បីកែ, ប្រអប់ជួរដេកដាច់ៗចុចដើម្បីបញ្ចូលជួរខ្វះ; ប៊ូតុង <b>បន្ត ជួរ N</b> បើកត្រង់ជួរដែលកំពុងធ្វើ។',
    guide5: 'ពេលបញ្ចូលដីឡូតិ៍រួច ចុច <b>សម្គាល់ថារួចរាល់</b>។ រាល់ភាពខុសគ្នាធៀប 2026 នឹងបង្ហាញការព្រមានក្រហម។',
    guide6: 'បើកផ្ទាំង <b>ផែនទីវឌ្ឍនភាព</b> ដើម្បីដឹងតំបន់ណាមិនទាន់បញ្ចូល។ ចុចតំបន់ដើម្បីពង្រីក, ចុចព្រំដីឡូតិ៍ដើម្បីមើលឬបើក។',
    guide7: 'ទិន្នន័យរក្សាទុកក្នុងកម្មវិធីរុករកលើម៉ាស៊ីននេះ។ ម្ដងម្កាលចុច <b>បម្រុងទុក</b> ដើម្បីទាញឯកសារ JSON។ ចូលម៉ឺនុយ <b>ធ្វើសមកាល Google</b> ដើម្បីរក្សាទុកលើ Google Sheets និងទទួលអ៊ីមែលពេលដីឡូតិ៍រួចរាល់។',
    guide8: 'ចុច <b>នាំចេញ Excel</b> ដើម្បីទាញឯកសារតាមដីឡូតិ៍ (តាមទម្រង់ Mẫu nhập KK) ឬឯកសារសរុប 0h 01/01/2027។',
    mapZonesTitle: 'វឌ្ឍនភាពតាមតំបន់',
    all: 'ទាំងអស់',
    mapTitle: 'ផែនទីដីឡូតិ៍ 95',
    legendEmpty: 'មិនទាន់បញ្ចូល',
    legendDoing: 'កំពុងបញ្ចូល',
    legendDone: 'រួចរាល់',
    legendWarn: 'ការព្រមាន',
    mapLoading: 'កំពុងផ្ទុកផែនទី…',
    mapFoot: 'ពង្រីកផែនទី ឬជ្រើសរើសតំបន់ ដើម្បីមើលលេខដីឡូតិ៍ឱ្យច្បាស់។ ចុចព្រំដីឡូតិ៍ដើម្បីមើលរហ័ស រួចចុច <b>បើកដីឡូតិ៍</b> ដើម្បីបញ្ចូល។ ផ្ទៃខាងក្រោយផ្កាយរណបត្រូវការអ៊ីនធឺណិត; ពេលក្រៅបណ្ដាញព្រំដីឡូតិ៍នៅបង្ហាញ។ ដីឡូតិ៍បន្ថែមក្រៅបញ្ជី (+ ដីឡូតិ៍ផ្សេង) គ្មានព្រំលើផែនទី។',
    mapLibError: 'មិនអាចផ្ទុកបណ្ណាល័យផែនទី។',
    mapNoGeo: 'មិនទាន់មានទិន្នន័យព្រំដីឡូតិ៍។',
    zoneDone: '{a}/{b} រួចរាល់',
    zoneDoing: '{n} កំពុងបញ្ចូល',
    zoneWarn: '{n} ការព្រមាន',
    zoneMissing: 'មិនទាន់បញ្ចូល {n}: <b>{list}</b>',
    zoneAllDone: 'បានបញ្ចូលគ្រប់ {a}/{b} ដីឡូតិ៍',
    zoneWarnList: 'ការព្រមាន: <b>{list}</b>',
    mapBadge: '{done}/{total} ដីឡូតិ៍រួចរាល់',
    openLot: 'បើកដីឡូតិ៍',
    backList: 'បញ្ជីដីឡូតិ៍',
    exportLot: 'នាំចេញ Excel ដីឡូតិ៍',
    check2Btn: 'ត្រួតពិនិត្យជុំទី 2',
    check2Eyebrow: 'ត្រួតពិនិត្យជុំទី 2',
    check2Lead: 'សម្រាប់ជុំត្រួតពិនិត្យទី 2៖ ប្រៀបធៀបគ្រប់ចំណុចជាមួយ 2026 និងផ្ទៀងផ្ទាត់ផលបូក 6 ជួរ។',
    check2DirsTitle: 'តាមទិសដៅ (2027)',
    check2DirsNote: '2026 អាចបំបែកសរុបតាមទិសដៅបានតែនៅដីឡូតិ៍ផ្ទៀងផ្ទាត់ដែលបំបែកតាមទិសដៅ។ ដីឡូតិ៍ផ្គុំ A/B ប្រៀបធៀបតាមសរុបដើម។ ចំណុច 6 ផ្នែកប្រៀបធៀបនៅកម្រិតដីឡូតិ៍ទាំងមូល។',
    check2DirCol: 'ទិសដៅ',
    check2NoData: 'មិនទាន់បញ្ចូលទិន្នន័យ',
    check2NoRef: 'មិនមានលេខ 2026',
    check2AllMatch: 'ត្រូវនឹង 2026',
    check2DiffCount: 'ខុស {n}/{total} ចំណុច',
    check2Sum27Ok: 'ផលបូក 6 ជួរត្រូវនឹងផលបូកផ្ទៃដីសរុបរបស់ដីឡូតិ៍។',
    check2Sum27Diff: 'ផលបូក 6 ជួរខុស {n} ពីផលបូកផ្ទៃដីសរុបរបស់ដីឡូតិ៍។',
    check2Sum26Diff: 'លេខ 2026 ខ្លួនឯងខុស {n} រវាងផលបូក និង 6 ជួរ (តាមតារាងដើម)។',
    check2RowsTitle: 'ប្រៀបធៀបជួរនីមួយៗ · ចំណុចនីមួយៗ 2026 | 2027',
    check2OverviewTitle: 'សង្ខេប 6 ចំណុច · 2026 | 2027',
    check2ColNote: 'កំណត់សម្គាល់',
    check2RowOk: 'ត្រូវ',
    check2RowSmall: 'ខុសតិច',
    check2RowDiff: 'ត្រូវផ្ទៀងផ្ទាត់',
    check2RowNoRef: 'គ្មាន 2026',
    check2RowNoDirRef: 'មិនទាន់មាន 2026 តាមទិស',
    check2RowMissing27: 'ខ្វះ 2027',
    check2RowSumBad: 'សរុប ≠ 6 ជួរ ({d})',
    check2ColODiff: 'លំអៀង O',
    check2OdiffTitle: 'ភាពខុសគ្នារណ្ដៅទទេ 2027 − 2026; ចាប់ពី 3 ឡើងទៅ ដាក់ពណ៌លឿងទុំ',
    check2RowsEditNote: 'កែលេខ 2027 នៅក្នុងតារាង; ចុចចេញក្រៅប្រអប់ដើម្បីរក្សាទុក។',
    check2RowsMergedNote: '2026 តាមជួរ គឺជាលេខបញ្ជូល A/B នៃសរុបដើម។ ជួរដែលមិនទាន់បញ្ចូល 2027 នឹងបង្ហាញ “—”។ ដីឡូតិ៍បញ្ជូល A/B សូមកែលេខនៅអេក្រង់ដីឡូតិ៍។',
    check2RowsDirSumNote: 'ដីឡូតិ៍បែងចែកទិស A/B ប៉ុន្តែ 2026 មិនទាន់បែកតាមទិស៖ លេខ 2027 បូក A+B តាមជួរនីមួយៗ ដើម្បីប្រៀបធៀបសរុបជួររបស់ 2026។ សូមកែលេខនៅអេក្រង់ដីឡូតិ៍។',
    check2RowsDirsNote: '2026 ប្រៀបធៀបតាមទិសដៅនីមួយៗ។ ជួរដែលមានក្នុង 2026 តែមិនទាន់បញ្ចូល នឹងបង្ហាញ “—”។',
    check2RowsPlainNote: '2026 ប្រៀបធៀបតាមលេខផ្ទៀងផ្ទាត់ជួរនីមួយៗ។ ជួរដែលមិនទាន់បញ្ចូល នឹងបង្ហាញ “—”។',
    check2RowsNoRefNote: 'ដីឡូតិ៍នេះមិនមានតារាងផ្ទៀងផ្ទាត់ជួរនីមួយៗសម្រាប់ប្រៀបធៀប 2026 ទេ។',
    check2RowsNoDirRefNote: 'ដីឡូតិ៍មិនទាន់មានលេខ 2026 បំបែកតាមទិស៖ ផ្នែកតាមទិសទុកទទេ សរុបដីឡូតិ៍នៅតែប្រៀបធៀបនៅតារាងខាងលើ។',
    check2RowsPairNote: 'ចំណុចនីមួយៗ ដាក់ 2026 ជាប់នឹង 2027 ដើម្បីប្រៀបធៀបផ្ទាល់។',
    check2RowsSummary: 'មាន {n} ជួរ · ខុស {d} · ខ្វះ 2027 {m}។',
    markDone: 'សម្គាល់ថារួចរាល់',
    reopenLot: 'បើកដីឡូតិ៍ឡើងវិញ',
    compareTitle: 'ប្រៀបធៀប 2026 → 2027',
    metric: 'ចំណុច',
    metricTotal: 'សរុប',
    catG: 'ដើមកៅស៊ូ (G)',
    catPlus: 'ដើម +',
    catC: 'ដើម C',
    catK1: 'ដើម K1',
    catK2: 'ដើម K2',
    catO: 'រណ្ដៅទទេ (O)',
    infoCard: 'ព័ត៌មានសន្លឹក',
    huongLot: 'ទិសដីឡូតិ៍',
    huongPh: 'ឧ. ខាងកើត-ខាងលិច',
    thDir: 'ទិស',
    dirAll: 'ទាំងអស់',
    dirTitle: 'ទិសដីឡូតិ៍',
    dirChipTitle: 'មើល និងបញ្ចូលទិស {dir}',
    dirNote: 'ដីឡូតិ៍នេះបែងចែកជា {n} ទិស {list}។ សូមបញ្ចូលម្តងមួយទិស — ការត្រួតពិនិត្យ និងផ្ទៀងផ្ទាត់គិតដោយឡែកតាមទិស; ពេលនាំចេញ Excel កម្មវិធីនឹងបញ្ជូល និងបូកទិសទាំងអស់ជាដីឡូតិ៍ពេញលេញមួយ។',
    dirNoteMerged: 'ដីឡូតិ៍នេះបែងចែកជា {n} ទិស {list}។ សូមបញ្ចូលម្តងមួយទិស; ការផ្ទៀងផ្ទាត់គិតលើផលបូកបញ្ជូលតាមឯកសារ 2026 ដើម ហើយទិសនីមួយៗគ្រាន់តែជាឯកសារយោង។ ពេលនាំចេញ Excel កម្មវិធីនឹងបញ្ជូល និងបូកទិសទាំងអស់ជាដីឡូតិ៍ពេញលេញមួយ។',
    dirSummary: 'ទាំងដីឡូតិ៍: {dt} ដើម · 2026: {base} · ខុសគ្នា {d}',
    dirSummaryNoBase: 'ទាំងដីឡូតិ៍: {dt} ដើម',
    dirTotal: 'សរុបទិស {dir}',
    dirTotalAll: 'សរុបទាំងដីឡូតិ៍',
    dirMissing: 'ទិស {list} មិនទាន់បញ្ចូលជួរទេ។',
    dirConfirmDone: 'ទិស {list} មិនទាន់មានទិន្នន័យ។ នៅតែសម្គាល់ថាបានបញ្ចប់ដែរឬទេ?',
    dirChecksTotal: 'ទិស {dir}: {n} ជួរ · {dt} ដើម',
    dirAlertPrefix: 'ទិស {dir}',
    dirLotMeta: 'ទិស {list}',
    dirQuickNote: 'កំពុងបញ្ចូលទិស {dir}',
    ngayKK: 'កាលបរិច្ឆេទពិនិត្យ',
    nguoiKK: 'អ្នកពិនិត្យ',
    personPh: 'ឈ្មោះអ្នកពិនិត្យ',
    ghiChu: 'កំណត់សម្គាល់',
    ghiChuPh: 'កំណត់សម្គាល់ដីឡូតិ៍…',
    rowsTitle: 'ព័ត៌មានលម្អិតតាមជួរ',
    addRow: '+ បន្ថែមជួរ',
    thHang: 'ជួរ',
    thTotal: 'សរុប',
    thCheck: 'ត្រួតពិនិត្យ',
    thPhucTra: 'ផ្ទៀងផ្ទាត់',
    thPhucTraTip: 'ប្រៀបធៀបសរុបដាំជួរនីមួយៗជាមួយតារាងលម្អិត 2026 · ខុសគ្នាចាប់ពី 2 ដើម នឹងត្រូវបន្លិច',
    phucTraTip: 'រាប់ 2026: {ref} ដើម · 2027 ខុស {d}',
    phucTraTipMerged: 'បញ្ជូល A+B · 2026 ដើម {ref} ដើម · បច្ចុប្បន្ន {dt} ដើម · ខុស {d}',
    phucTraRefMerged: 'បញ្ជូល 2026 · {ref}',
    phucTraNoRef: 'គ្មានលេខ 2026 សម្រាប់ជួរនេះ',
    phucTraDirRef: 'ទិស A/B គ្រាន់តែជាឯកសារយោង — ផ្ទៀងផ្ទាត់លើផលបូកបញ្ជូល',
    rowsPtNote: 'ផ្ទៀងផ្ទាត់តាមតារាងលម្អិត 2026។ ជួរខុសចាប់ពី 2 ដើម ត្រូវបន្លិច ដើម្បីឱ្យអ្នកត្រួតពិនិត្យពិនិត្យឡើងវិញ។',
    rowsPtMergedNote: 'ផ្ទៀងផ្ទាត់លើផលបូកបញ្ជូល A/B តាមតារាងឡូឆ្នាំ 2026 ដើម; លេខលើជួរនីមួយៗ ជាផលបូក A+B នៃជួរនោះ។',
    rowsPtNoData: 'ដីឡូតិ៍នេះមិនទាន់មានតារាងលម្អិត 2026 តាមជួរ (ដីឡូតិ៍បែងចែកច្រើនទិស A/B/C ឬដីឡូតិ៍ថ្មី) ដូច្នេះមិនអាចផ្ទៀងផ្ទាត់តាមជួរបានទេ។',
    ptSumWarn: '{n} ជួរខុស',
    ptSumWarnTip: '{n} ជួរខុសចាប់ពី 2 ដើមធៀប 2026 — ត្រូវពិនិត្យឡើងវិញ',
    ptSumMergedTip: 'គណនាលើផលបូកបញ្ជូល A/B តាមឯកសារ 2026 ដើម',
    ptSumOk: 'ត្រូវ 2026',
    dirMergedTag: 'បញ្ជូល A/B',
    hangMapMerged: 'ជួរដេក · បញ្ជូល A/B',
    checksPhucTra: '<b>ផ្ទៀងផ្ទាត់ 2026:</b> {n} ជួរខុសចាប់ពី 2 ដើម: {list}។ សូមអ្នកត្រួតពិនិត្យពិនិត្យឡើងវិញ។',
    checksPhucTraOk: 'ផ្ទៀងផ្ទាត់ 2026: ជួរដែលបានបញ្ចូលត្រូវតារាងលម្អិត (ខុសក្រោម 2 ដើម)។',
    checksPhucTraMergedRef: 'A/B គ្រាន់តែជាឯកសារយោង; ផ្ទៀងផ្ទាត់លើផលបូកបញ្ជូលតាមឯកសារ 2026 ដើម។',
    checksPhucTraNoData: 'ដីឡូតិ៍បែងចែកច្រើនទិស (A/B/C): មិនទាន់មានតារាងលម្អិត 2026 សម្រាប់ផ្ទៀងផ្ទាត់តាមជួរ។',
    alertPhucTra: '<b>ផ្ទៀងផ្ទាត់ 2026:</b> {n} ជួរខុសចាប់ពី 2 ដើមធៀបតារាងលម្អិត 2026: {list}។ សូមអ្នកត្រួតពិនិត្យពិនិត្យឡើងវិញជួរទាំងនេះ។',
    hangChipPt: 'ផ្ទៀងផ្ទាត់ខុស {d}',
    total: 'សរុប',
    rowsFoot: 'បញ្ចូលលេខអវិជ្ជមាន? ទេ។ ប្រអប់ទទេគិតជា 0។ ប៊ូតុង <b>=</b> ក្បែរសរុប ដើម្បីបំពេញសរុប 6 ជួរឈរ។',
    rowMissing: 'ខ្វះសរុប',
    rowDiff: 'ខុសគ្នា {n}',
    rowOk: 'ត្រូវគ្នា',
    rowsOddNote: 'មាន {n} ជួរដែលសរុបដាំខុសពីកម្រិតធម្មតា {med}: ជួរ {list}។ សូមពិនិត្យឡើងវិញមុនបិទដីឡូតិ៍។',
    rowOddTip: 'សរុបដាំខុស {n} ដើមពីកម្រិតធម្មតា {med} នៃដីឡូតិ៍',
    treeUnit: 'ដើម',
    emptyRows: 'មិនទាន់មានជួរណាមួយ។ ចុច <b>បញ្ចូលរហ័ស</b> ដើម្បីបញ្ចូល 2 ជួរក្នុងមួយសន្លឹក ឬ <b>+ បន្ថែមជួរ</b> ដើម្បីបញ្ចូលដោយដៃ។',
    sumIssues: 'ជួរ {n} ខុសសរុប',
    sumOk: 'ត្រូវគ្នា {n} ជួរ',
    rowCount: 'បានបញ្ចូល {n} ជួរ',
    calcTitle: 'បំពេញសរុប = ផលបូក 6 ជួរឈរ',
    undoCalcTitle: 'ស្ដារសរុបមុនពេលចុច =',
    undoEditTitle: 'មិនធ្វើវិញការកែមុនរបស់ជួរនេះ',
    delRowTitle: 'លុបជួរ',
    confirmDelRow: 'លុបជួរ {h}? ទិន្នន័យជួរនេះនឹងបាត់។',
    toastDone: 'បានសម្គាល់ដីឡូតិ៍ {lot} ថាបានបញ្ចប់ នៅ {time}',
    toastDoneEmpty: 'ដីឡូតិ៍មិនទាន់បញ្ចូលជួរណាមួយ — មិនអាចសម្គាល់ថារួចរាល់បានទេ។',
    issueMissing: 'ខ្វះសរុប (ផលបូក 6 ជួរឈរ = {sum})',
    issueDiff: 'សរុប {dt} ≠ ផលបូក 6 ជួរឈរ {sum} (ខុសគ្នា {d})',
    hangMapTitle: 'តារាងជួរ',
    hangBadge: '{n} ជួរ',
    hangBadgeMissing: ' · ខ្វះ {n}',
    hangBadgeIssues: ' · {n} ខុសគ្នា',
    hangMissing: 'នៅខ្វះ <b>{n}</b> ជួរ: <b>{list}</b>.',
    hangContinuous: 'បានបញ្ចូលជាប់គ្នា ជួរ 1–{max}.',
    hangCompleteList: 'បានបញ្ចូលគ្រប់ {n} ជួរត្រូវពិនិត្យ។',
    hangHint: ' ប្រអប់ពណ៌បៃតងចុចដើម្បីកែជួរ; ប្រអប់ជួរដេកដាច់ៗចុចដើម្បីបញ្ចូលជួរខ្វះ។',
    hangBtnFill: 'បញ្ចូលជួរ {h}',
    hangBtnResume: 'បន្តបញ្ចូលជួរ {h}',
    hangChipEdit: 'ជួរ {h} {st} — ចុចដើម្បីកែ',
    hangChipFill: 'ជួរ {h} មិនទាន់បញ្ចូល — ចុចដើម្បីបញ្ចូល',
    hangChipMatched: 'ត្រូវគ្នា',
    hangChipDiff: 'ខុសសរុប',
    checksTitle: 'ត្រួតពិនិត្យទិន្នន័យ',
    checksNoData: 'មិនទាន់មានទិន្នន័យសម្រាប់ត្រួតពិនិត្យ។',
    checksIssueCount: 'ជួរ {n} ខុសសរុប:',
    checksRow: 'ជួរ {h}',
    checksAllOk: 'គ្រប់ជួរត្រូវគ្នា: សរុប = G + (+) + C + K1 + K2 + O។',
    checksNoDup: 'គ្មានជួរស្ទួនលេខ។',
    checksDup: '<b>ជួរស្ទួន:</b> {list}។',
    checksTotalLine: 'បានបញ្ចូល <b>{n}</b> ជួរ · សរុប <b>{dt}</b> ដើម។',
    baselineEqual: 'សរុបធៀប 2026: ត្រូវគ្នា <b>{n}</b> ដើម។',
    baselineDiff: 'សរុបធៀប 2026: 2027 <b>{a}</b> / 2026 <b>{b}</b> · ខុសគ្នា <b>{d}</b> ({p})។',
    baselineMismatch: 'ទិន្នន័យគោល 2026 ខុសគ្នាខ្លួនឯង <b>{n}</b> ដើម (សរុប 6 ជួរឈរ {sum})។',
    detailMismatch: 'តារាងលម្អិត 2026 ខុសគ្នាខ្លួនឯង {n} ដើម (សរុប 6 ជួរឈរ {sum})។',
    checksNoBaseline: 'ដីឡូតិ៍ក្រៅបញ្ជី គ្មានទិន្នន័យគោល 2026។',
    checksDone: 'ដីឡូតិ៍បានសម្គាល់ថារួចរាល់។',
    checksNotDone: 'ដីឡូតិ៍មិនទាន់សម្គាល់ថារួចរាល់។',
    statusEmpty: 'មិនទាន់បញ្ចូល',
    statusDoing: 'កំពុងបញ្ចូល',
    statusPaused: 'រក្សាទុកបណ្ដោះអាសន្ន',
    statusDone: 'រួចរាល់',
    statusMatch2026: 'ត្រូវនឹង 2026',
    statusError: 'ទិន្នន័យមានបញ្ហា',
    statusPhucTra: 'ត្រូវផ្ទៀងផ្ទាត់',
    statusWarn: 'មានការព្រមាន',
    statusDiff: 'ខុសគ្នា {n}',
    lotOutside: 'ដីឡូតិ៍ក្រៅបញ្ជី',
    metaPlantYear: 'ដាំ {year}',
    metaPaused: 'បណ្ដោះអាសន្ន · បន្ត ជួរ {h}',
    compareBadgeNoBase: 'គ្មានទិន្នន័យគោល',
    compareBadgeEmpty: 'មិនទាន់បញ្ចូល',
    compareBadgeMatch: 'ត្រូវនឹង 2026',
    compareBadgeWarn: 'មានការព្រមាន',
    compareBadgeDiff: 'ខុសគ្នា {n}',
    noBaseNote: 'ដីឡូតិ៍ក្រៅបញ្ជី គ្មានទិន្នន័យគោល 2026។ កម្មវិធីនៅតែពិនិត្យសរុបជួរ និងនាំចេញ Excel ធម្មតា។',
    baselineNote: 'ទិន្នន័យគោល: ការរាប់ 0h 01/01/2026 · {id} · {total} ដើម។ ប្រភព: TỔNG HỢP KIỂM KÊ 2025-2026.xlsx។',
    baselineNotePhucTra: 'ធៀបឆ្នាំ 2026 តាមតារាងលម្អិត (ផ្ទៀងផ្ទាត់) · {id} · {total} ដើម។',
    baselineNoteSummaryDiff: 'តារាងសរុប 2026 កត់ {total} ដើម។',
    alertNoRows: '<b>មិនទាន់បញ្ចូលជួរណាមួយ។</b> ចុច <b>បញ្ចូលរហ័ស</b> ដើម្បីបញ្ចូល 2 ជួរក្នុងមួយសន្លឹកពីជួរចុងក្រោយ។',
    alertIssues: '<b>ជួរ {n} ខុសសរុប។</b><br>{first}',
    alertIssuesMore: '<br>… និងជួរ {n} ផ្សេងទៀត។',
    alertDup: '<b>ជួរស្ទួនលេខ:</b> {list}។ ជួរនីមួយៗបញ្ចូលបានតែម្ដង។',
    alertNoBase: 'ដីឡូតិ៍ក្រៅបញ្ជី: គ្មានទិន្នន័យគោល 2026 សម្រាប់ប្រៀបធៀបសរុប។',
    alertAllOk: 'ទិន្នន័យត្រូវគ្នា។ បើបញ្ចូលគ្រប់ ចុច <b>សម្គាល់ថារួចរាល់</b> ដើម្បីបិទដីឡូតិ៍។',
    alertMsgDiff: 'សរុប 2027 <b>{dt}</b> ធៀប 2026 <b>{base}</b> · ខុសគ្នា <b>{d}</b> ({p})។',
    alertDoneDiff: '<b>ដីឡូតិ៍រួចរាល់ហើយ តែនៅខុសគ្នា។</b> {msg}<br>ពិនិត្យជួរដែលបានបញ្ចូល ឬសន្លឹកក្រដាសឡើងវិញ។',
    alertTempDiff: '<b>ខុសគ្នាបណ្ដោះអាសន្ន។</b> {msg}<br>បើដីឡូតិ៍មិនទាន់បញ្ចូលគ្រប់ជួរ សូមមិនខ្វល់ការព្រមាននេះ។ ពេលបញ្ចូលរួចហើយ <b>សម្គាល់ថារួចរាល់</b> ដើម្បីបិទដីឡូតិ៍ — ប្រព័ន្ធនឹងផ្ញើឯកសាររាយការណ៍ដោយស្វ័យប្រវត្តិទៅជំនួយការសម្របសម្រួល។',
    alertMatch: '<b>សរុប 2027 ត្រូវនឹង 2026:</b> {n}',
    alertBaseMismatch: '<b>ទិន្នន័យគោល 2026 ខុសគ្នាខាងក្នុង {n}។</b> សរុបដើមគឺ {total} តែផលបូក 6 ជួរឈរគ្រាន់តែ {sum}។ គួរពិនិត្យឯកសារ 2026 ដើមឡើងវិញ។',
    checksMissingRow: 'នៅខ្វះ <b>{n}</b> ជួរបើធៀបនឹងបញ្ជីផ្ទៀងផ្ទាត់: {list}។',
    checksMatchTotal: 'សរុបធៀប 2026: ត្រូវគ្នា <b>{n}</b> ដើម។',
    lotEyebrow: 'ក្រុម {doi} · {id}',
    lotNoId: 'គ្មាន ID',
    noBaselineSub: 'គ្មានទិន្នន័យគោល 2026 សម្រាប់ប្រៀបធៀបស្វ័យប្រវត្តិ។',
    doneSuffix: ' · រួចរាល់ {time}',
    pauseSuffix: ' · បណ្ដោះអាសន្ន {time}',
    resumeHangBtn: 'បន្ត ជួរ {h}',
    resumeDirBtn: 'បន្ត {dir} · ជួរ {h}',
    menuTitle: 'ម៉ឺនុយ',
    menuExport: 'នាំចេញ Excel សរុប',
    menuExportSub: '95 ដីឡូតិ៍ + សន្លឹកការព្រមាន',
    menuBackup: 'បម្រុងទុកទិន្នន័យ (JSON)',
    menuBackupSub: 'ទាញឯកសារបម្រុងទុកមកម៉ាស៊ីន',
    menuRestore: 'ស្ដារពី JSON',
    menuRestoreSub: 'សរសេរជាន់ទិន្នន័យបច្ចុប្បន្ន',
    menuSync: 'ធ្វើសមកាល Google & របាយការណ៍អ៊ីមែល',
    menuSyncSub: 'មិនទាន់ភ្ជាប់',
    menuDetail: 'លម្អិតសមកាល (Google)',
    menuDetailSub: 'មើលជួរនីមួយៗដែលឧបករណ៍ផ្សេងបានបញ្ចូល',
    menuInstall: 'ដំឡើងកម្មវិធីលើ Desktop',
    menuInstallSub: 'ដំណើរការដូចកម្មវិធី, ប្រើក្រៅបណ្ដាញ',
    menuDemo: 'បំពេញសាកល្បងដីឡូតិ៍ 250',
    menuDemoSub: 'ជួរ 01 + 02 ពីរូបសន្លឹកគំរូ',
    menuReset: 'លុបទិន្នន័យទាំងអស់',
    menuResetSub: 'មិនអាចត្រឡប់វិញបាន',
    menuLang: 'ភាសា',
    menuFootnote: 'ទិន្នន័យនៅក្នុងកម្មវិធីរុករករបស់ម៉ាស៊ីននេះ (localStorage)។ ប្តូរម៉ាស៊ីន ឬលុបទិន្នន័យកម្មវិធីរុករកនឹងបាត់ ដូច្នេះសូមបម្រុងទុក JSON ជាប្រចាំ។',
    syncEyebrow: 'Google Sheets + Gmail',
    syncTitle: 'ធ្វើសមកាល & របាយការណ៍អ៊ីមែល',
    syncLead: 'បិទភ្ជាប់ URL Web App របស់ Apps Script។ កម្មវិធីនឹងសរសេរទិន្នន័យទៅ Google Sheets; ពេលដីឡូតិ៍ត្រូវបានសម្គាល់ <b>រួចរាល់</b> Google នឹងផ្ញើអ៊ីមែលជាមួយឯកសារ Excel។',
    syncUrlLabel: 'URL Web App (Apps Script)',
    syncDeviceLabel: 'ឈ្មោះឧបករណ៍ / អ្នកបញ្ចូល',
    syncDeviceHint: 'បំពេញម្តងលើឧបករណ៍នេះ (ឧ. Lan – Team 2) ដើម្បីឱ្យតារាងលម្អិត និងកំណត់ហេតុកត់ត្រាច្បាស់ថាអ្នកណាបញ្ចូល។ សូមសរសេរឈ្មោះជាអក្សរឡាតាំង (English)។',
    syncDevicePh: 'ឧ. Lan – Team 2',
    syncEnabled: 'ធ្វើសមកាលស្វ័យប្រវត្តិក្រោយរក្សាទុក',
    syncStatusInit: 'មិនទាន់ភ្ជាប់។',
    syncSave: 'រក្សាទុកការកំណត់',
    syncTest: 'ផ្ញើសាកល្បង',
    syncNow: 'ធ្វើសមកាលឥឡូវ',
    syncGuideTitle: 'ការណែនាំដំឡើង (5 នាទី)',
    syncStep1: 'បើក <a href="https://script.google.com/" target="_blank" rel="noopener">script.google.com</a> → <b>គម្រោងថ្មី</b>។',
    syncStep2: 'លុបខ្លឹមសារដើម បិទភ្ជាប់កូដ <code>Code.gs</code> ទាំងអស់ (ចុច <b>ចម្លងកូដ Code.gs</b> ខាងក្រោម)។',
    syncStep3: 'កែ <code>EMAIL_NHAN</code> នៅដើមឯកសារ បើចង់ទទួលអ៊ីមែលនៅអាសយដ្ឋានផ្សេង (លំនាំដើម: Gmail ដែលកំពុងចូល)។',
    syncStep4: 'ចុច <b>Deploy → New deployment → Web app</b>; ជ្រើស <b>Execute as: Me</b>; <b>Who has access: Anyone</b>។ ផ្ដល់សិទ្ធិពេល Google សួរ។',
    syncStep5: 'ចម្លង URL ទម្រង់ <code>…/exec</code> បិទភ្ជាប់ក្នុងប្រអប់ខាងលើ ចុច <b>ផ្ញើសាកល្បង</b>។',
    copyScript: 'ចម្លងកូដ Code.gs',
    downloadScript: 'ទាញយក Code.gs',
    syncFootnote: 'លើកដំបូង Google នឹងសុំសិទ្ធិអាន/សរសេរ Google Sheets និងផ្ញើអ៊ីមែល។ ទិន្នន័យនៅក្នុង Drive របស់អ្នក មិនផ្ញើទៅភាគីទីបី។ រាល់ពេលចុច “ផ្ញើសាកល្បង” នឹងផ្ញើអ៊ីមែលសាកល្បង 1 សារ។',
    toastNoStore: 'មិនអាចរក្សាទុកទិន្នន័យ។ អង្គចងចាំកម្មវិធីរុករកអាចពេញ។',
    toastAddedLot: 'បានបន្ថែមដីឡូតិ៍ក្រៅបញ្ជី: {lot}',
    toastLotExists: 'ដីឡូតិ៍នេះមានក្នុងបញ្ជីរួចហើយ។',
    toastReopened: 'បានបើកដីឡូតិ៍ {lot} ឡើងវិញ',
    updSumTitle: 'ដីឡូតិ៍បានកែបន្ទាប់ពីរួចរាល់',
    updSumHint: 'ចុចធ្វើបច្ចុប្បន្នភាព ដើម្បីផ្ញើទិន្នន័យថ្មីឡើងវិញទៅជំនួយការសរុប។ បើមិនចុច ឯកសារដែលផ្ញើរួចនឹងរក្សាដើម។',
    updSumBtn: 'ធ្វើបច្ចុប្បន្នភាពតារាងសរុប',
    toastExportOk: 'បាននាំចេញ: {file}',
    toastExportFail: 'មិនអាចនាំចេញ Excel: {err}',
    toastNoExportData: 'ដីឡូតិ៍មិនទាន់មានទិន្នន័យសម្រាប់នាំចេញ។',
    toastNoExportAll: 'មិនទាន់មានដីឡូតិ៍ណាមួយបញ្ចូលទិន្នន័យ។',
    toastNoDoneLots: 'មិនទាន់មានដីឡូតិ៍ណាបានសម្គាល់ថាបានបញ្ចប់ទេ។',
    exportConfirm: 'ដីឡូតិ៍មិនទាន់សម្គាល់ថារួចរាល់។ នៅតែនាំចេញ?',
    addLotPrompt: 'បញ្ចូលលេខ / ឈ្មោះដីឡូតិ៍ថ្មី (ឧ. 950):',
    backupOk: 'បានទាញឯកសារបម្រុងទុក JSON។',
    restoreBadFile: 'ឯកសារមិនត្រឹមត្រូវតាមទម្រង់។',
    restoreConfirm: 'ការស្ដារនឹងសរសេរជាន់ទិន្នន័យបច្ចុប្បន្នទាំងអស់។ បន្ត?',
    restoreOk: 'បានស្ដារទិន្នន័យពីឯកសារ។',
    restoreFail: 'មិនអាចអានឯកសារ: {err}',
    demoConfirm: 'ដីឡូតិ៍ 250 មានទិន្នន័យហើយ។ សរសេរជាន់ជួរ 1 និង 2 ដោយទិន្នន័យគំរូពីរូបសន្លឹក?',
    demoDone: 'បានបំពេញសាកល្បង 2 ជួរដីឡូតិ៍ 250 ពីរូបសន្លឹកគំរូ។',
    resetConfirm: 'លុបទិន្នន័យទាំងអស់ដែលបានបញ្ចូលលើម៉ាស៊ីននេះ? មិនអាចត្រឡប់វិញបាន។',
    resetPrompt: 'វាយ XOA ដើម្បីបញ្ជាក់ការលុបទាំងអស់:',
    resetCancel: 'បានបោះបង់ការលុប។',
    resetDone: 'បានលុបទិន្នន័យទាំងអស់។',
    syncUrlMissing: 'មិនទាន់កំណត់ URL Apps Script។',
    syncHttpError: 'ម៉ាស៊ីនបម្រើឆ្លើយ HTTP {code}',
    syncAppError: 'Apps Script រាយការណ៍កំហុស: {err}',
    syncStatusNone: 'មិនទាន់ភ្ជាប់',
    syncStatusConnected: 'បានភ្ជាប់ · {time}',
    syncStatusConfigured: 'បានកំណត់ URL',
    syncStatusHelp: 'មិនទាន់ភ្ជាប់។ បិទភ្ជាប់ URL Web App ខាងក្រោមដើម្បីបើកសមកាលកម្ម។',
    syncStatusNotSynced: 'បានកំណត់ URL មិនទាន់ធ្វើសមកាលនៅឡើយ។',
    syncNoUrl: 'មិនទាន់កំណត់ URL Apps Script ក្នុងម៉ឺនុយ ធ្វើសមកាល Google។',
    syncSending: 'កំពុងផ្ញើទិន្នន័យទៅ Google…',
    syncNoResponse: 'បានផ្ញើ (មិនអាចអានការឆ្លើយតប)',
    syncNoResponseToast: 'បានផ្ញើទៅ Google ប៉ុន្តែមិនអាចអានការឆ្លើយតប។ សូមពិនិត្យ Google Sheets ឬប្រអប់សំបុត្រ។',
    syncTestOkMail: 'ភ្ជាប់បានល្អ។ បានផ្ញើអ៊ីមែលសាកល្បង សូមពិនិត្យប្រអប់សំបុត្រ។',
    syncTestOkSheet: 'ភ្ជាប់បានល្អ។ បានសរសេរទិន្នន័យទៅ Google Sheets។',
    syncOkUrl: 'បានធ្វើសមកាល។ បើក Google Sheets ក្នុងម៉ឺនុយ។',
    syncOk: 'បានធ្វើសមកាល Google Sheets។',
    syncErrorPrefix: 'កំហុស',
    syncErrorToast: 'កំហុសសមកាលកម្ម: {err}',
    syncPasteFirst: 'សូមបិទភ្ជាប់ URL Web App សិន។',
    syncUrlFormat: 'URL ត្រូវមានទម្រង់ https://script.google.com/macros/s/…/exec',
    syncSaved: 'បានរក្សាទុកការកំណត់សមកាលកម្ម។',
    syncDisabled: 'បានបិទសមកាលកម្ម (មិនទាន់មាន URL)។',
    syncLast: 'លើកចុងក្រោយ: {time}',
    syncLotMail: 'បានផ្ញើអ៊ីមែលរបាយការណ៍ដីឡូតិ៍ {lot}។',
    syncLotSheet: 'បានធ្វើសមកាលដីឡូតិ៍ {lot} ទៅ Google Sheets។',
    copyOk: 'បានចម្លង Code.gs។ បិទភ្ជាប់ក្នុង script.google.com។',
    copyFail: 'មិនអាចចម្លងបាន។ ចុច "ទាញយក Code.gs" ដើម្បីទាញឯកសារ។',
    langChange: 'ប្តូរភាសា',
    syncPull: 'ទាញវឌ្ឍនភាពក្រុម',
    syncPullHint: 'ចុច “ទាញវឌ្ឍនភាពក្រុម” ដើម្បីមើលដីឡូតិ៍ដែលម៉ាស៊ីនផ្សេងបានបញ្ចូល/រួចរាល់លើផែនទី។ អានប៉ុណ្ណោះ មិនសរសេរចូលទិន្នន័យម៉ាស៊ីននេះទេ។',
    legendRemote: 'ពីម៉ាស៊ីនផ្សេង',
    remoteDoing: 'ម៉ាស៊ីនផ្សេងកំពុងបញ្ចូល',
    remoteDone: 'ម៉ាស៊ីនផ្សេងបានរួចរាល់',
    remoteWarn: 'ម៉ាស៊ីនផ្សេង៖ ការព្រមាន',
    remotePopNote: 'ទិន្នន័យពីម៉ាស៊ីនផ្សេង · ធ្វើបច្ចុប្បន្នភាព {time}',
    remoteNone: 'មិនមានវឌ្ឍនភាពពីម៉ាស៊ីនផ្សេងទេ។',
    remoteEmpty: 'បានភ្ជាប់ Google · មិនទាន់មានដីឡូតិ៍ពីម៉ាស៊ីនផ្សេងទេ។',
    remotePulling: 'កំពុងទាញវឌ្ឍនភាពក្រុម…',
    remotePulled: 'បានទាញវឌ្ឍនភាព៖ {n} ដីឡូតិ៍។',
    remotePullFail: 'មិនអាចទាញវឌ្ឍនភាព៖ {err}',
    remoteOldScript: 'Code.gs លើ Google មិនទាន់បានធ្វើបច្ចុប្បន្នភាពទេ។ បិទភ្ជាប់ Code.gs ថ្មី ហើយដាក់ផ្សព្វផ្សាយកំណែថ្មី។',
    remoteSummary: 'ក្រុម៖ {doing} កំពុងបញ្ចូល · {done} រួចរាល់ · {time}',
    btnDetailLot: 'លម្អិតសមកាល',
    detailEyebrow: 'Google Sheets',
    detailTitle: 'លម្អិតសមកាល',
    detailLead: 'ទិន្នន័យអានពីផ្ទាំង លម្អិត ក្នុង Google Sheets។ មើលបានតែប៉ុណ្ណោះ មិនកែទិន្នន័យលើឧបករណ៍នេះទេ។',
    detailLotLabel: 'ដីឡូតិ៍',
    detailRefresh: 'ផ្ទុកឡើងវិញ',
    detailDiff: 'ខុសគ្នាផ្ទៀងផ្ទាត់',
    detailLoading: 'កំពុងផ្ទុកលម្អិតពី Google…',
    detailError: 'មិនអាចផ្ទុកលម្អិតបាន៖ {err}',
    detailEmpty: 'មិនទាន់មានទិន្នន័យលម្អិតនៅ Google Sheets។ សូមធ្វើសមកាលពីឧបករណ៍ដែលបានបញ្ចូលទិន្នន័យ។',
    detailFoot: 'ជួរពណ៌លឿង៖ ផ្ទៀងផ្ទាត់ខុសគ្នាចាប់ពី 2 ដើម។ ជួរពណ៌ផ្កាឈូក៖ ខ្វះ/សរុបមិនត្រូវ ខ្វះ ឬស្ទួនលេខជួរ។ ទិន្នន័យនេះសម្រាប់តែមើល ត្រូវកែនៅឧបករណ៍ដែលបានបញ្ចូលដីឡូតិ៍។',
    detailUpdated: 'ធ្វើបច្ចុប្បន្នភាព {time}',
    lotRemoteLoading: 'កំពុងទាញកំណែថ្មីបំផុតពី Google Sheet…',
    lotRemoteUpdated: 'បានទាញកំណែថ្មីបំផុតដែល {device} បានរក្សាទុកម៉ោង {time}។',
    lotRemoteUpdatedNoDev: 'បានទាញកំណែថ្មីបំផុតពី Google Sheet ម៉ោង {time}។',
    lotRemoteConflict: 'ដីឡូតិ៍នេះទើបត្រូវ {device} កែម៉ោង {time} — បានទាញកំណែថ្មីបំផុតមកឧបករណ៍នេះ។',
    lotRemoteLocalNewer: 'ឧបករណ៍នេះមានកំណែថ្មីជាង មិនទាន់សមកាល — រក្សាកំណែលើឧបករណ៍ មិនទាញកំណែ Google ទេ។',
    lotRemoteDraft: 'នៅមានសេចក្ដីព្រាងកំពុងបញ្ចូលលើឧបករណ៍ — មិនទាញកំណែ Google ដោយស្វ័យប្រវត្តិទេ។ រក្សាទុករួចបើកឡូតិ៍វិញ។',
    lotRemoteEditing: 'កំពុងបញ្ចូលលើឧបករណ៍ — មិនទាញកំណែ Google ដើម្បីកុំឱ្យសរសេរជាន់ទេ។',
    lotRemoteError: 'មិនអាចទាញកំណែថ្មីបំផុតពី Google៖ {err}',
    lotRemoteDiscard: 'បោះបង់សេចក្ដីព្រាង ទាញកំណែ Google',
    lotRemoteDiscardConfirm: 'បោះបង់សេចក្ដីព្រាងដែលមិនទាន់រក្សាទុករបស់ដីឡូតិ៍នេះ ហើយទាញកំណែថ្មីបំផុតពី Google Sheet?',
    detailRowsCount: '{n} ជួរ',
    detailLocalOnly: 'មិនឃើញនៅ Google (មានតែនៅឧបករណ៍នេះ): {list} · ចុច ធ្វើសមកាលឥឡូវ ដើម្បីផ្ញើ។',
    detailLocalOnlyItem: '{lot} ({n} ជួរ)',
    detailWarnCount: '{n} ការព្រមាន',
    detailNoWarn: 'គ្មានការព្រមាន',
    detailDevice: 'ឧបករណ៍ / អ្នកបញ្ចូល៖ {device}',
    detailNguoi: 'អ្នករាប់៖ {nguoi}',
    detailOption: '{lot} · {n} ជួរ',
    detailOptionKv: '{lot} · {kv} · {n} ជួរ',
    notiAria: 'ដំណឹងដីឡូតិ៍បញ្ចូលថ្ងៃនេះ',
    notiTitle: 'ដីឡូតិ៍បញ្ចូលថ្ងៃនេះ',
    notiEyebrow: 'វឌ្ឍនភាពក្រុម',
    notiLead: 'ដីឡូតិ៍ដែលម៉ាស៊ីនផ្សេងបានបញ្ចូលថ្ងៃនេះ។ ចុចដីឡូតិ៍ដើម្បីមើលលម្អិតពី Google Sheets។',
    notiEmpty: 'ថ្ងៃនេះមិនទាន់មានដីឡូតិ៍ពីម៉ាស៊ីនផ្សេងទេ។',
    notiNotSynced: 'មិនទាន់ទាញបានវឌ្ឍនភាពក្រុមទេ។ ពិនិត្យការតភ្ជាប់ ហើយចុច ទាញឡើងវិញ។',
    notiRefresh: 'ទាញឡើងវិញ',
    notiFoot: 'ដំណឹងគិតដោយឡែកលើម៉ាស៊ីននេះ — ម៉ាស៊ីនផ្សេងមិនទាន់មើល នៅតែឃើញដំណឹងរបស់ពួកគេ។',
    notiNew: 'ថ្មី',
    notiStatusDone: 'រួចរាល់',
    notiStatusWarn: 'ការព្រមាន',
    notiStatusDoing: 'កំពុងបញ្ចូល',
    notiLot: 'ដីឡូតិ៍ {lot}',
    notiRows: '{n} ជួរ',
    notiTree: 'ដើម',
    notiTabToday: 'ថ្ងៃនេះ',
    notiTabHistory: 'ប្រវត្តិ',
    historyLead: 'ប្រវត្តិធ្វើសមកាលនៅ Google Sheets៖ តាមថ្ងៃ ឧបករណ៍ និងដីឡូតិ៍ដែលបានផ្លាស់ប្តូរ។',
    historyRangeAria: 'រយៈពេល',
    historyDeviceAria: 'ឧបករណ៍បញ្ចូល',
    historyDays7: '7 ថ្ងៃ',
    historyDays30: '30 ថ្ងៃ',
    historyDays90: '90 ថ្ងៃ',
    historyDays365: '1 ឆ្នាំ',
    historyAllDevices: 'គ្រប់ឧបករណ៍',
    historyEmpty: 'មិនទាន់មានការធ្វើសមកាលក្នុងរយៈពេលនេះទេ។',
    historyLoading: 'កំពុងផ្ទុកប្រវត្តិ…',
    historyTitle: 'កំណត់ហេតុបញ្ចូល',
    historyEyebrow: 'ប្រវត្តិធ្វើសមកាល',
    historyFoot: 'ប្រវត្តិទាញពីផ្ទាំង Nhật ký នៅ Google Sheets ដើម្បីមើលពេលក្រោយ។',
    historyError: 'មិនទាន់ទាញបានប្រវត្តិ៖ {err}',
    historyNoDevice: 'មិនដឹងឧបករណ៍',
    historyChanged: 'ដីឡូតិ៍៖ {list}',
    historySync: 'ប្តូរ {n} ដីឡូតិ៍',
    historyRuns: '{n} ដង',
    historyLot: 'ដីឡូតិ៍ {lot}',
    historyDelta: 'លំអៀង',
    historyEdits: 'កែ {n} ជួរ',
    historyFromImport: 'តាមកំណត់ហេតុបញ្ចូល',
    historySparse: 'កំណត់ត្រាចាស់ គ្មានព័ត៌មានលម្អិត',
    historyNoChanges: 'គ្មានការផ្លាស់ប្តូរ',
    statsBtn: 'ស្ថិតិអ្នកបញ្ចូល',
    statsTitle: 'ស្ថិតិអ្នកបញ្ចូល',
    statsEyebrow: 'បញ្ជីបញ្ចូលតាមអ្នកប្រើ',
    statsLead: 'ដីឡូតិ៍គិតតាមអ្នកបញ្ចូលដំបូង។ អ្នកកែដីឡូតិ៍ក្រោយមិនរាប់បញ្ចូលទេ។ ចំនួនដីឡូតិ៍រួមមានលើម៉ាស៊ីននេះ និងដីឡូតិ៍ដែលបានទាញពី Google។',
    statsFoot: 'ដីឡូតិ៍បញ្ចូលមុនកំណែ 69 យកឈ្មោះឧបករណ៍ដំបូងដែលកត់ត្រាក្នុងកំណត់ហេតុ; បើម៉ាស៊ីនមិនទាន់ដាក់ឈ្មោះ គិតតាម “អ្នករាប់” របស់ដីឡូតិ៍។',
    statsRefresh: 'ទាញពី Google ឡើងវិញ',
    statsTotalPeople: '{n} នាក់',
    statsTotalLots: '{n} ដីឡូតិ៍',
    statsTotalTrees: '{n} ដើម',
    statsLotUnit: 'ដីឡូតិ៍',
    statsUnknown: 'មិនដឹងអ្នកបញ្ចូល',
    statsFromSheet: 'ម៉ាស៊ីនផ្សេង',
    statsEmpty: 'មិនទាន់មានដីឡូតិ៍ដែលបានបញ្ចូលទេ។',
    statsLoadingHistory: 'កំពុងទាញកំណត់ហេតុដើម្បីយកឈ្មោះអ្នកបញ្ចូល…',
    statsHistoryError: 'មិនទាន់ទាញបានកំណត់ហេតុ៖ {err}',
  },
};
function t(key, vars) {
  const pack = APP_I18N[state.lang] || APP_I18N.vi;
  let s = pack[key] != null ? pack[key] : (APP_I18N.vi[key] != null ? APP_I18N.vi[key] : key);
  if (vars) Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(vars[k]); });
  return s;
}
function qt(key) {
  const pack = QUICK_I18N[state.lang] || QUICK_I18N.vi;
  return pack[key] != null ? pack[key] : QUICK_I18N.vi[key];
}
function qtf(key, vars) {
  let s = qt(key);
  Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(vars[k]); });
  return s;
}

function openLot(key, push = true) {
  state.view = 'lot';
  state.lot = key;
  state.recentLot = null;
  state.lotRemoteNote = null;
  $('#view-home').hidden = true;
  $('#view-lot').hidden = false;
  renderLot();
  pullRemoteLot(key);
  if (push) history.pushState({ lot: key }, '', '#lo/' + encodeURIComponent(key));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function openHome(push = true) {
  state.view = 'home';
  state.lot = null;
  $('#view-lot').hidden = true;
  $('#view-home').hidden = false;
  renderHome();
  if (push) history.pushState({}, '', '#');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function routeFromHash() {
  const m = location.hash.match(/^#lo\/(.+)$/);
  if (m) {
    const key = decodeURIComponent(m[1]);
    if (BASE_BY_LOT.has(key) || DB.lots[key]) {
      state.view = 'lot';
      state.lot = key;
      state.lotRemoteNote = null;
      $('#view-home').hidden = true;
      $('#view-lot').hidden = false;
      renderLot();
      pullRemoteLot(key);
      return;
    }
  }
  state.view = 'home';
  state.lot = null;
  $('#view-lot').hidden = true;
  $('#view-home').hidden = false;
  renderHome();
}

/* ============================================================
   Trang chủ
   ============================================================ */
const CHANGELOG = [
  {
    v: 73,
    date: '26/11/2026',
    vi: { title: 'Kiểm vòng 2: lệch hố trống O', items: ['Thêm cột “Lệch O” ngay cạnh cột Lệch: chênh lệch hố trống 2027 − 2026 theo từng hàng. Hàng có hố trống lệch từ 3 trở lên được tô vàng cam để dễ thấy.'] },
    km: { title: 'ត្រួតពិនិត្យជុំទី 2៖ លំអៀងរណ្ដៅទទេ O', items: ['បន្ថែមជួរឈរ “លំអៀង O” ជាប់នឹងជួរឈរលំអៀង៖ ភាពខុសគ្នារណ្ដៅទទេ 2027 − 2026 តាមជួរនីមួយៗ។ ជួរដែលរណ្ដៅទទេលំអៀងចាប់ពី 3 ឡើងទៅ ដាក់ពណ៌លឿងទុំ ដើម្បីមើលឃើញងាយ។'] },
  },
  {
    v: 72,
    date: '25/11/2026',
    vi: { title: 'Lô 354 đối chiếu tổng gộp từng hàng', items: ['Kiểm tra vòng 2 của lô tách hướng (354): số 2027 cộng A+B theo từng hàng để so với tổng hàng 2026, thấy ngay mức lệch của từng chỉ tiêu trên mỗi hàng. Sửa số ở màn hình lô.'] },
    km: { title: 'ដីឡូតិ៍ 354 ប្រៀបធៀបសរុបជួរនីមួយៗ', items: ['ត្រួតពិនិត្យជុំទី 2 នៃដីឡូតិ៍បែងចែកទិស (354)៖ លេខ 2027 បូក A+B តាមជួរនីមួយៗ ដើម្បីប្រៀបធៀបនឹងសរុបជួរ 2026 មើលឃើញភាពខុសគ្នានៃចំណុចនីមួយៗភ្លាមៗ។ សូមកែលេខនៅអេក្រង់ដីឡូតិ៍។'] },
  },
  {
    v: 71,
    date: '25/11/2026',
    vi: { title: 'Thống kê nhập lấy tên từ Nhật ký', items: ['Lô nhập trước đây chưa lưu tên người nhập giờ hiện đúng tên máy ghi lô sớm nhất trong Nhật ký (ví dụ “hien to8”, “Duong”, “Hung bv”) thay vì “Chưa rõ”. Mỗi người hiện số lô và danh sách lô kèm KV, gọn hơn.'] },
    km: { title: 'ស្ថិតិបញ្ចូលយកឈ្មោះពីកំណត់ហេតុ', items: ['ដីឡូតិ៍ដែលបានបញ្ចូលពីមុនមិនបានរក្សាឈ្មោះអ្នកបញ្ចូល ឥឡូវបង្ហាញឈ្មោះឧបករណ៍ដំបូងដែលកត់ត្រាក្នុងកំណត់ហេតុ (ឧ. “hien to8”, “Duong”, “Hung bv”) ជំនួស “មិនដឹង”។ នាក់ម្នាក់បង្ហាញចំនួនដីឡូតិ៍ និងបញ្ជីដីឡូតិ៍ជាមួយ KV ខ្លីជាងមុន។'] },
  },
  {
    v: 70,
    date: '25/11/2026',
    vi: { title: 'Kiểm vòng 2: tiêu đề dính, bảng rộng hơn', items: ['Hai hàng tiêu đề (nhóm chỉ tiêu và năm 2026/2027) dính khi cuộn bảng đối chiếu từng hàng. Hộp Kiểm tra vòng 2 rộng hơn, vùng bảng cao hơn; phần tổng quan 6 chỉ tiêu gấp gọn, bấm để mở.'] },
    km: { title: 'ត្រួតពិនិត្យជុំទី 2៖ ក្បាលតារាងជាប់ តារាងធំជាង', items: ['ក្បាលតារាងពីរជួរ (ក្រុមចំណុច និងឆ្នាំ 2026/2027) ជាប់ពេលរំកិលតារាងប្រៀបធៀបជួរនីមួយៗ។ ប្រអប់ត្រួតពិនិត្យជុំទី 2 ធំជាង តំបន់តារាងខ្ពស់ជាង; ផ្នែកសង្ខេប 6 ចំណុចបត់តូច ចុចដើម្បីបើក។'] },
  },
  {
    v: 69,
    date: '25/11/2026',
    vi: { title: 'Thống kê người nhập lô', items: ['Nút Thống kê nhập ở trang chủ: mỗi người nhập bao nhiêu lô, số cây và chi tiết từng lô. Lô tính theo người nhập đầu tiên — người sửa sau không bị tính; lô cũ lấy theo “Người KK”, gồm cả lô tải từ Google.'] },
    km: { title: 'ស្ថិតិអ្នកបញ្ចូលដីឡូតិ៍', items: ['ប៊ូតុង ស្ថិតិអ្នកបញ្ចូល នៅទំព័រដើម៖ នាក់ម្នាក់បញ្ចូលប៉ុន្មានដីឡូតិ៍ ចំនួនដើម និងលម្អិតដីឡូតិ៍នីមួយៗ។ ដីឡូតិ៍គិតតាមអ្នកបញ្ចូលដំបូង — អ្នកកែក្រោយមិនរាប់បញ្ចូល; ដីឡូតិ៍ចាស់យកតាម “អ្នករាប់” រួមទាំងដីឡូតិ៍ដែលទាញពី Google។'] },
  },
  {
    v: 68,
    date: '25/11/2026',
    vi: { title: 'Lô 354 chia 2 hướng A, B', items: ['Lô 354 nhập và kiểm tra riêng theo hướng A/B. Tổng lô vẫn đối chiếu 2026; phần đối chiếu theo hướng để trống vì 2026 chưa có số tách hướng.'] },
    km: { title: 'ដីឡូតិ៍ 354 បែងចែក 2 ទិស A, B', items: ['ដីឡូតិ៍ 354 បញ្ចូល និងត្រួតពិនិត្យដោយឡែកតាមទិស A/B។ សរុបដីឡូតិ៍នៅតែប្រៀបធៀប 2026; ផ្នែកប្រៀបធៀបតាមទិសទុកទទេ ព្រោះ 2026 មិនទាន់មានលេខបំបែកតាមទិស។'] },
  },
  {
    v: 67,
    date: '24/11/2026',
    vi: { title: 'Sửa vòng 2 đồng bộ vòng 1, hoàn tác và cân bằng', items: ['Sửa số trong Kiểm tra vòng 2 giờ cập nhật ngay bảng ở vòng 1. Mỗi hàng có nút “=” điền Tổng ĐT bằng tổng 6 cột và nút hoàn tác trả lại số trước khi sửa. Ô số có nút tăng/giảm như màn hình nhập.'] },
    km: { title: 'កែជុំទី 2 សមស្របជុំទី 1 មិនធ្វើវិញ និងតម្រូវតុល្យ', items: ['កែលេខក្នុងត្រួតពិនិត្យជុំទី 2 ឥឡូវធ្វើបច្ចុប្បន្នភាពតារាងជុំទី 1 ភ្លាមៗ។ ជួរនីមួយៗមានប៊ូតុង “=” បំពេញសរុបស្មើផលបូក 6 ជួរ និងប៊ូតុងមិនធ្វើវិញ ត្រឡប់លេខមុនពេលកែ។ ប្រអប់លេខមានប៊ូតុងឡើង/ចុះដូចអេក្រង់បញ្ចូល។'] },
  },
  {
    v: 66,
    date: '24/11/2026',
    vi: { title: 'So từng chỉ tiêu 2026 cạnh 2027', items: ['Bảng từng hàng xếp mỗi chỉ tiêu thành cặp 2026 | 2027: Tổng ĐT, G, +, C, K1, K2, O. Số 2027 lệch với 2026 được tô nhẹ để dễ thấy; vẫn sửa trực tiếp cột 2027 và lưu tại chỗ.'] },
    km: { title: 'ប្រៀបធៀបចំណុចនីមួយៗ 2026 ជាប់នឹង 2027', items: ['តារាងជួរនីមួយៗដាក់ចំណុចនីមួយៗជាគូ 2026 | 2027៖ សរុប, G, +, C, K1, K2, O។ លេខ 2027 ដែលខុសពី 2026 ត្រូវបានដាក់ពណ៌ស្រាលដើម្បីមើលឃើញងាយ។ នៅតែកែជួរ 2027 និងរក្សាទុកនៅនឹងកន្លែងបាន។'] },
  },
  {
    v: 65,
    date: '24/11/2026',
    vi: { title: 'Sửa số ngay trong Kiểm tra vòng 2', items: ['Bảng từng hàng hiện đủ 6 cột G, +, C, K1, K2, O của 2027 và sửa được tại chỗ — bấm ra ngoài ô là lưu. Hàng có tổng khác 6 cột được ghi chú ngay trong bảng.'] },
    km: { title: 'កែលេខនៅក្នុងត្រួតពិនិត្យជុំទី 2', items: ['តារាងជួរនីមួយៗបង្ហាញគ្រប់ 6 ជួរ G, +, C, K1, K2, O របស់ 2027 ហើយកែបាននៅនឹងកន្លែង — ចុចចេញក្រៅប្រអប់គឺរក្សាទុក។ ជួរដែលផលបូកខុសពី 6 ជួរ មានកំណត់សម្គាល់ក្នុងតារាង។'] },
  },
  {
    v: 64,
    date: '24/11/2026',
    vi: { title: 'Kiểm tra vòng 2 đối chiếu từng hàng', items: ['Hộp Kiểm tra vòng 2 thêm bảng đối chiếu từng hàng: 2026, 2027, lệch và ghi chú khớp/lệch/thiếu. Lô chưa nhập hàng thì không đánh dấu hoàn tất được, tránh ghi đè tiến độ bằng dòng 0 hàng.'] },
    km: { title: 'ត្រួតពិនិត្យជុំទី 2 ប្រៀបធៀបជួរនីមួយៗ', items: ['ប្រអប់ត្រួតពិនិត្យជុំទី 2 បន្ថែមតារាងប្រៀបធៀបជួរនីមួយៗ៖ 2026, 2027, ខុស និងកំណត់សម្គាល់ត្រូវ/ខុស/ខ្វះ។ ដីឡូតិ៍ដែលមិនទាន់បញ្ចូលជួរណាមួយ មិនអាចសម្គាល់ថារួចរាល់បានទេ។'] },
  },
  {
    v: 62,
    date: '24/11/2026',
    vi: { title: 'Kiểm tra vòng 2 từng chỉ tiêu', items: ['Thêm nút “Kiểm tra vòng 2” trong lô: so 7 chỉ tiêu với 2026, kiểm tra tổng 6 cột và xem nhanh theo hướng A/B/C.'] },
    km: { title: 'ត្រួតពិនិត្យជុំទី 2 តាមចំណុចនីមួយៗ', items: ['បន្ថែមប៊ូតុង “ត្រួតពិនិត្យជុំទី 2” ក្នុងដីឡូតិ៍៖ ប្រៀបធៀប 7 ចំណុចជាមួយ 2026 ផ្ទៀងផ្ទាត់ផលបូក 6 ជួរ និងមើលតាមទិសដៅ A/B/C។'] },
  },
  {
    v: 61,
    date: '21/11/2026',
    vi: { title: 'Cập nhật biểu tổng hợp sau khi sửa lô', items: ['Lô đã hoàn tất mà sửa sau đó sẽ hiện nút “Cập nhật biểu tổng hợp” để gửi lại số liệu mới; không bấm thì bản đã gửi giữ nguyên.'] },
    km: { title: 'ធ្វើបច្ចុប្បន្នភាពតារាងសរុបឡើងវិញបន្ទាប់ពីកែដីឡូតិ៍', items: ['ដីឡូតិ៍ដែលរួចរាល់តែកែក្រោយមក នឹងបង្ហាញប៊ូតុង “ធ្វើបច្ចុប្បន្នភាពតារាងសរុប” ដើម្បីផ្ញើទិន្នន័យថ្មីឡើងវិញ។ បើមិនចុច ឯកសារដែលផ្ញើរួចរក្សាដើម។'] },
  },
  {
    v: 60,
    date: '21/11/2026',
    vi: { title: 'Biểu đồ tiến độ % toàn Đội', items: ['Biểu đồ tròn % hoàn tất/đang nhập và thanh % từng khu vực, ngay dưới bản đồ.'] },
    km: { title: 'គំនូសតាងវឌ្ឍនភាព % ទូទាំងក្រុម', items: ['រង្វង់ % រួចរាល់/កំពុងបញ្ចូល និងរបារ % តាមតំបន់នីមួយៗ នៅក្រោមផែនទី។'] },
  },
  {
    v: 59,
    date: '21/11/2026',
    vi: { title: 'Hộp Cập nhật ứng dụng', items: ['Các tính năng mới hiện ngay trên màn hình chính; chưa xem sẽ có nhãn “Mới”.'] },
    km: { title: 'ប្រអប់ការធ្វើបច្ចុប្បន្នភាពកម្មវិធី', items: ['លក្ខណៈពិសេសថ្មីបង្ហាញនៅផ្ទាំងដើម; បើមិនទាន់មើល នឹងមានស្លាក “ថ្មី”។'] },
  },
  {
    v: 58,
    date: '21/11/2026',
    vi: { title: 'Biểu tổng hợp in khổ A4 ngang', items: ['Chữ ký “LẬP BIỂU / ĐỘI TRƯỞNG” không còn bị cắt.'] },
    km: { title: 'នាំចេញតារាងសង្ខេបជាទម្រង់ផ្តេក A4', items: ['ហត្ថលេខា “អ្នករៀបចំតារាង / ប្រធានក្រុម” មិនត្រូវបានកាត់ទៀតទេ។'] },
  },
  {
    v: 57,
    date: '21/11/2026',
    vi: { title: 'Nút Xuất biểu tổng hợp ở màn hình chính', items: ['Các lô đã đánh dấu hoàn tất được điền vào mẫu Biểu tổng hợp.'] },
    km: { title: 'ប៊ូតុងនាំចេញតារាងសង្ខេបនៅផ្ទាំងដើម', items: ['ដីឡូតិ៍ដែលបានសម្គាល់ថាបានបញ្ចប់ ត្រូវបំពេញចូលតារាងតាមទម្រង់គំរូ។'] },
  },
  {
    v: 56,
    date: '21/11/2026',
    vi: { title: 'Phúc tra ghép A+B trên từng hàng', items: ['Lô ghép A/B hiện số phúc tra tổng và mức lệch ngay trên hàng.'] },
    km: { title: 'ផ្ទៀងផ្ទាត់រួម A+B លើជួរនីមួយៗ', items: ['ដីឡូតិ៍រួម A/B បង្ហាញចំនួនផ្ទៀងផ្ទាត់រួម និងចំនួនខុសគ្នានៅជួរនីមួយៗ។'] },
  },
  {
    v: 55,
    date: '21/11/2026',
    vi: { title: 'Bỏ nháp để tải bản Google', items: ['Nút “Bỏ nháp, tải bản Google” khi lô bị chặn bởi bản nháp.'] },
    km: { title: 'បោះបង់សេចក្តីព្រាង ដើម្បីទាញយកច្បាប់ Google', items: ['ប៊ូតុង “បោះបង់សេចក្តីព្រាង ទាញយកច្បាប់ Google” ពេលដីឡូតិ៍ជាប់សេចក្តីព្រាង។'] },
  },
  {
    v: 54,
    date: '21/11/2026',
    vi: { title: 'Mở lô tự tải bản mới nhất từ Google', items: ['Cảnh báo khi máy khác vừa sửa; giữ bản trên máy nếu đang nhập dở.'] },
    km: { title: 'បើកដីឡូតិ៍ ទាញយកច្បាប់ថ្មីបំផុតពី Google', items: ['ព្រមានពេលម៉ាស៊ីនផ្សេងបានកែ និងរក្សាច្បាប់ក្នុងម៉ាស៊ីន ប្រសិនបើកំពុងបញ្ចូលមិនទាន់រួច។'] },
  },
];

function readWhatsNewSeen() {
  try { return localStorage.getItem(WHATS_NEW_KEY) || ''; } catch (err) { return ''; }
}
function renderWhatsNew() {
  const host = $('#whatsNew');
  if (!host) return;
  host.hidden = false;
  const version = String(CHANGELOG[0].v);
  const isNew = readWhatsNewSeen() !== version;
  const lang = state.lang === 'km' ? 'km' : 'vi';
  host.classList.toggle('has-new', isNew);
  host.innerHTML = `
    <details id="whatsNewDetails">
      <summary class="wn-summary">
        <span class="wn-label">${t('whatsNewTitle')}</span>
        <span class="wn-ver">v${version}</span>
        ${isNew ? `<span class="badge warn wn-new">${t('whatsNewNew')}</span>` : ''}
        <span class="wn-latest">${esc(CHANGELOG[0][lang].title)}</span>
        <span class="wn-hint">${t('whatsNewOpen')}</span>
      </summary>
      <ol class="wn-list">
        ${CHANGELOG.map(e => {
          const c = e[lang];
          return `<li>
            <div class="wn-meta"><span class="wn-ver">v${e.v}</span><span class="wn-date">${e.date}</span></div>
            <div class="wn-title">${esc(c.title)}</div>
            <ul class="wn-items">${c.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          </li>`;
        }).join('')}
      </ol>
    </details>`;
  const details = $('#whatsNewDetails');
  details.addEventListener('toggle', () => {
    if (!details.open) return;
    try { localStorage.setItem(WHATS_NEW_KEY, version); } catch (err) {}
    host.classList.remove('has-new');
    const badge = details.querySelector('.wn-new');
    if (badge) badge.remove();
  });
}

function renderHome() {
  const keys = lotsKeys();
  let enteredLots = 0, doneLots = 0, warnLots = 0, totalRows = 0, totalTrees = 0;
  keys.forEach(key => {
    const st = lotState(key);
    if (st.entered.length) enteredLots += 1;
    const lv = progressLevel(st);
    if (lv === 'done') doneLots += 1;
    if (lv === 'warn') warnLots += 1;
    totalRows += st.entered.length;
    totalTrees += st.agg.dt;
  });
  const totalLots = keys.length;
  const baseTotal = BASELINE.reduce((s, l) => {
    const r = ref2026(l.lot);
    return s + (r ? r.total : (l.total || 0));
  }, 0);

  $('#stats').innerHTML = `
    <div class="stat-card">
      <div class="k">${t('statEnteredLots')}</div>
      <div class="v">${enteredLots}<span class="muted" style="font-size:16px">/${totalLots}</span></div>
      <div class="s">${t('statEnteredSub', { n: doneLots })}</div>
    </div>
    <div class="stat-card ${totalTrees ? 'good' : ''}">
      <div class="k">${t('statTrees')}</div>
      <div class="v">${fmt(totalTrees)}</div>
      <div class="s">${totalTrees ? t('statTreesSub', { base: fmt(baseTotal), delta: signed(totalTrees - baseTotal) }) : t('statTreesSubNo', { base: fmt(baseTotal) })}</div>
    </div>
    <div class="stat-card">
      <div class="k">${t('statRows')}</div>
      <div class="v">${fmt(totalRows)}</div>
      <div class="s">${t('statRowsSub', { n: enteredLots })}</div>
    </div>
    <div class="stat-card ${warnLots ? 'warn' : ''}">
      <div class="k">${t('statWarn')}</div>
      <div class="v">${fmt(warnLots)}</div>
      <div class="s">${t('statWarnSub', { done: doneLots, warn: warnLots })}</div>
    </div>`;

  renderWhatsNew();
  renderLotList();
  if (mapCtx) {
    refreshMap();
    const panel = $('#mapPanel');
    if (panel && !panel.hidden) requestAnimationFrame(() => mapCtx.map.invalidateSize());
  }
}

function statusInfo(st) {
  if (st.level === 'empty') return { cls: 'empty', label: t('statusEmpty'), dot: '' };
  if (st.level === 'doing') return { cls: 'doing', label: st.meta.pausedAt ? t('statusPaused') : t('statusDoing'), dot: 'doing' };
  if (st.level === 'done') return { cls: 'done', label: st.base ? t('statusMatch2026') : t('statusDone'), dot: 'done' };
  if (st.hasError) return { cls: 'warn', label: t('statusError'), dot: 'warn' };
  if (st.hasPt) return { cls: 'warn', label: t('statusPhucTra'), dot: 'warn' };
  return { cls: 'warn', label: st.delta != null ? t('statusDiff', { n: signed(st.delta) }) : t('statusWarn'), dot: 'warn' };
}
function statusLabelVN(st) {
  if (st.level === 'empty') return 'Chưa nhập';
  if (st.level === 'doing') return st.meta.pausedAt ? 'Tạm lưu' : 'Đang nhập';
  if (st.level === 'done') return st.base ? 'Khớp 2026' : 'Hoàn tất';
  if (st.hasError) return 'Lỗi dữ liệu';
  if (st.hasPt) return 'Cần phúc tra';
  return st.delta != null ? `Lệch ${signed(st.delta)}` : 'Có cảnh báo';
}

function lotRowHtml(key) {
  const st = lotState(key);
  const base = st.base;
  const info = statusInfo(st);
  const entered = st.entered.length > 0;
  const metaBits = [];
  if (base) {
    if (base.clone) metaBits.push(base.clone);
    if (base.year) metaBits.push(t('metaPlantYear', { year: base.year }));
    if (base.area) metaBits.push(fmt2(base.area) + ' ha');
    if (base.id) metaBits.push(base.id);
  } else {
    metaBits.push(t('lotOutside'));
  }
  if (st.level === 'doing' && st.meta.pausedAt) {
    metaBits.push(t('metaPaused', { h: resumeHang(key, defaultQuickDir(key) || undefined) }));
  }
  if (st.dirStates) {
    metaBits.push(t('dirLotMeta', { list: st.dirStates.map(d => `${d.dir} ${d.entered.length}`).join(' · ') }));
  }
  let deltaCls = 'muted';
  let deltaText = '—';
  if (st.ref && entered) {
    deltaText = signed(st.delta);
    if (st.delta === 0) deltaCls = 'delta-0';
    else deltaCls = st.meta.done ? 'delta-x' : 'delta-w';
  }
  const pill = `<span class="status-pill ${info.cls}"><span class="status-dot"></span>${esc(info.label)}</span>`;
  return `
    <button class="lot-row${key === state.recentLot ? ' is-recent' : ''}" type="button" data-lot="${esc(key)}"${key === state.recentLot ? ' aria-current="true"' : ''}>
      <span class="lot-main">
        <span class="lot-dot ${info.dot}"></span>
        <span style="min-width:0">
          <span class="lot-name">${esc(key)}</span>
          <span class="lot-meta">${esc(metaBits.join(' · '))}</span>
        </span>
      </span>
      <span class="lot-stats">
        <span class="stat"><small>2026</small><b>${st.ref ? fmt(st.ref.total) : '—'}</b></span>
        <span class="stat"><small>2027</small><b>${entered ? fmt(st.agg.dt) : '—'}</b></span>
        <span class="stat"><small>${t('thDelta')}</small><b class="${deltaCls}">${deltaText}</b></span>
        <span class="stat"><small>${t('thRows')}</small><b>${st.entered.length}</b></span>
        <span class="stat status"><small>${t('thStatus')}</small>${pill}</span>
      </span>
    </button>`;
}

function renderLotList() {
  const q = state.q.trim().toLowerCase();
  const all = lotsKeys();
  const recent = state.recentLot && all.includes(state.recentLot) ? state.recentLot : null;
  let keys = all.filter(key => {
    if (key === recent) return false;
    const lv = progressLevel(lotState(key));
    if (state.filter === 'empty' && lv !== 'empty') return false;
    // Lô đang nhập có lệch hàng vẫn phải hiện ở bộ lọc "Đang nhập",
    // đồng thời vẫn nằm trong "Cảnh báo" — hai bộ lọc không loại trừ nhau.
    if (state.filter === 'doing' && lv !== 'doing' && lv !== 'warn') return false;
    if (state.filter === 'done' && lv !== 'done') return false;
    if (state.filter === 'warn' && lv !== 'warn') return false;
    if (!q) return true;
    const base = BASE_BY_LOT.get(key);
    const hay = [key, base && base.id, base && base.clone, base && base.year].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });
  if (recent) keys.unshift(recent);
  const list = $('#lotList');
  list.innerHTML = keys.map(lotRowHtml).join('');
  $('#emptyState').hidden = keys.length > 0;
}

/* ============================================================
   Bản đồ tiến độ
   ============================================================ */
let mapCtx = null;

function zoneStats(zone) {
  const out = { zone, total: 0, empty: [], doing: [], done: [], warn: [] };
  GEO.forEach(f => {
    if (f.properties.kv !== zone) return;
    const key = f.properties.ma_lo;
    out.total += 1;
    out[viewLevel(key).level].push(key);
  });
  return out;
}

function shortList(keys, max = 5) {
  const shown = keys.slice(0, max).join(', ');
  return keys.length > max ? shown + ', …' : shown;
}

function renderZones() {
  const host = $('#mapZones');
  if (!host) return;
  host.innerHTML = ZONE_ORDER.map(zone => {
    const s = zoneStats(zone);
    if (!s.total) return '';
    const segs = ['done', 'doing', 'warn', 'empty']
      .filter(k => s[k].length)
      .map(k => `<i style="width:${(s[k].length / s.total * 100).toFixed(2)}%;background:${STATUS_COLORS[k]}"></i>`)
      .join('');
    const bits = [t('zoneDone', { a: s.done.length, b: s.total })];
    if (s.doing.length) bits.push(t('zoneDoing', { n: s.doing.length }));
    if (s.warn.length) bits.push(t('zoneWarn', { n: s.warn.length }));
    let miss = '';
    let missCls = '';
    if (s.empty.length) miss = t('zoneMissing', { n: s.empty.length, list: esc(shortList(s.empty)) });
    else if (!s.warn.length) { miss = t('zoneAllDone', { a: s.total, b: s.total }); missCls = ' all-done'; }
    if (s.warn.length) miss += `${miss ? ' · ' : ''}${t('zoneWarnList', { list: esc(shortList(s.warn)) })}`;
    return `<button class="zone-row${state.zone === zone ? ' is-active' : ''}" data-zone="${zone}" type="button">
      <span class="zone-top"><span class="zone-name">${zone}</span><span class="zone-count">${bits.join(' · ')}</span></span>
      <span class="zone-bar">${segs}</span>
      <span class="zone-miss${missCls}">${miss}</span>
    </button>`;
  }).join('');
  const doneCount = [...GEO_BY_LOT.keys()].filter(key => viewLevel(key).level === 'done').length;
  const badge = $('#mapBadge');
  if (badge) badge.textContent = t('mapBadge', { done: doneCount, total: GEO.length });
  const allBtn = $('#btnZoneAll');
  if (allBtn) allBtn.hidden = !state.zone;
  renderProgressChart();
}

function animateChartPct(el, target, suffix) {
  if (!el) return;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { el.textContent = Math.round(target) + suffix; return; }
  const t0 = performance.now();
  const tick = now => {
    const k = Math.min(1, (now - t0) / 900);
    el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suffix;
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderProgressChart() {
  const host = $('#progressChart');
  if (!host || !GEO.length) return;
  const total = GEO.length;
  let done = 0, doing = 0, empty = 0;
  GEO_BY_LOT.forEach((f, key) => {
    const lv = viewLevel(key).level;
    if (lv === 'done') done += 1;
    else if (lv === 'empty') empty += 1;
    else doing += 1;
  });
  const zones = ZONE_ORDER.map(z => zoneStats(z)).filter(s => s.total);
  const sig = [state.lang, total, done, doing, empty,
    zones.map(s => `${s.zone}:${s.done.length}/${s.doing.length + s.warn.length}/${s.total}`).join(',')].join('|');
  if (host.dataset.sig === sig) return;
  host.dataset.sig = sig;

  const CIRC = 2 * Math.PI * 52;
  const donePct = Math.round(done / total * 100);
  const doingPct = Math.round(doing / total * 100);
  const emptyPct = Math.max(0, 100 - donePct - doingPct);
  const doneLen = CIRC * done / total;
  const doingLen = CIRC * doing / total;
  const zoneRows = zones.map((s, i) => {
    const zDone = s.done.length;
    const zDoing = s.doing.length + s.warn.length;
    return `<div class="pz-row">
      <span class="pz-name">${esc(s.zone)}</span>
      <span class="pz-bar">
        <i class="done" style="--w:${(zDone / s.total * 100).toFixed(2)}%;--d:${i * 70}ms"></i>
        <i class="doing" style="--w:${(zDoing / s.total * 100).toFixed(2)}%;--d:${i * 70 + 40}ms"></i>
      </span>
      <span class="pz-nums"><b class="done">${Math.round(zDone / s.total * 100)}%</b><b class="doing">${Math.round(zDoing / s.total * 100)}%</b></span>
    </div>`;
  }).join('');
  host.innerHTML = `
    <div class="pchart-overall">
      <div class="pchart-ring">
        <svg viewBox="0 0 120 120" role="img" aria-label="${esc(t('chartTitle'))}">
          <circle class="ring-track" cx="60" cy="60" r="52"></circle>
          <circle class="ring-done" cx="60" cy="60" r="52" stroke-dasharray="0 ${CIRC.toFixed(2)}" stroke-dashoffset="0"></circle>
          <circle class="ring-doing" cx="60" cy="60" r="52" stroke-dasharray="0 ${CIRC.toFixed(2)}" stroke-dashoffset="${(-doneLen).toFixed(2)}"></circle>
        </svg>
        <div class="pchart-center"><b id="chartDonePct">0%</b><span>${t('chartDone')}</span></div>
      </div>
      <div class="pchart-legend">
        <div class="pl done"><i></i><span>${t('chartDone')}</span><b>${donePct}%</b></div>
        <div class="pl doing"><i></i><span>${t('chartDoing')}</span><b>${doingPct}%</b></div>
        <div class="pl empty"><i></i><span>${t('chartEmpty')}</span><b>${emptyPct}%</b></div>
      </div>
    </div>
    <div class="pchart-zones">
      <div class="pchart-head">
        <span>${t('mapZonesTitle')}</span>
        <span class="pchart-head-nums"><b class="done">${t('chartDone')}</b><b class="doing">${t('chartDoing')}</b></span>
      </div>
      ${zoneRows}
    </div>`;
  const badge = $('#chartBadge');
  if (badge) badge.textContent = t('chartLots', { a: done, b: total });
  animateChartPct($('#chartDonePct'), donePct, '%');
  const ringDone = host.querySelector('.ring-done');
  const ringDoing = host.querySelector('.ring-doing');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    ringDone.style.strokeDasharray = `${doneLen.toFixed(2)} ${(CIRC - doneLen).toFixed(2)}`;
    ringDoing.style.strokeDasharray = `${doingLen.toFixed(2)} ${(CIRC - doingLen).toFixed(2)}`;
  }));
}

function mapPopupHtml(key) {
  const st = lotState(key);
  const v = viewLevel(key);
  const r = v.remote;
  const base = st.base;
  const info = r ? remoteStatusInfo(v.level) : statusInfo(st);
  const f = GEO_BY_LOT.get(key);
  const p = f ? f.properties : {};
  const bits = [p.kv, base && base.id, base && base.clone, p.area_ha ? fmt2(p.area_ha) + ' ha' : ''].filter(Boolean);
  const entered = r ? r.entered : st.entered.length;
  const dt = r ? r.dt : (st.entered.length ? st.agg.dt : null);
  const deltaNum = r ? r.delta : (st.ref && st.entered.length ? st.delta : null);
  const isDone = r ? r.done : st.meta.done;
  let delta = '—';
  let deltaCls = 'muted';
  if (deltaNum != null) {
    delta = signed(deltaNum);
    deltaCls = deltaNum === 0 ? 'delta-0' : (isDone ? 'delta-x' : 'delta-w');
  }
  const doneAt = r ? (r.doneAt || '') : (st.meta.done && st.meta.doneAt ? dateTimeVN(st.meta.doneAt) : '');
  return `<div class="map-pop">
    <h4>${t('thLot')} ${esc(key)}</h4>
    <div class="map-pop-sub">${esc(bits.join(' · '))}</div>
    <span class="status-pill ${info.cls}"><span class="status-dot"></span>${esc(info.label)}</span>
    <table>
      <tr><td>2026</td><td>${st.ref ? fmt(st.ref.total) : '—'}</td></tr>
      <tr><td>2027</td><td>${dt != null ? fmt(dt) : '—'}</td></tr>
      <tr><td>${t('thDelta')}</td><td class="${deltaCls}">${delta}</td></tr>
      <tr><td>${t('thRows')}</td><td>${entered}</td></tr>
      ${doneAt ? `<tr><td>${t('statusDone')}</td><td>${esc(doneAt)}</td></tr>` : ''}
    </table>
    ${r ? `<p class="remote-note">${esc(t('remotePopNote', { time: r.updatedAtDisplay || r.updatedAt || '—' }))}${r.nguoi ? ' · ' + esc(r.nguoi) : ''}</p>` : ''}
    <button class="open-lot" data-openlot="${esc(key)}" type="button">${t('openLot')}</button>
  </div>`;
}

function mapStyle(key) {
  const v = viewLevel(key);
  const color = STATUS_COLORS[v.level] || STATUS_COLORS.empty;
  const style = { color, weight: 1.3, opacity: .95, fillColor: color, fillOpacity: .42 };
  if (v.remote) {
    style.weight = 1.8;
    style.dashArray = '6 4';
    style.fillOpacity = .24;
  }
  return style;
}

function initMap() {
  if (mapCtx) return mapCtx;
  const el = $('#mapCanvas');
  if (!window.L || !el) {
    const hint = $('#mapHint');
    if (hint) hint.textContent = t('mapLibError');
    return null;
  }
  if (!GEO.length) {
    const hint = $('#mapHint');
    if (hint) hint.textContent = t('mapNoGeo');
    return null;
  }
  const map = L.map(el, { zoomControl: true, preferCanvas: true });
  map.setView([13.2, 104.72], 14);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Esri Satellite',
  }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);

  const layers = new Map();
  const zoneBounds = new Map();
  const allBounds = L.latLngBounds([]);
  GEO.forEach(f => {
    const key = f.properties.ma_lo;
    const layer = L.geoJSON(f, {
      style: () => mapStyle(key),
      onEachFeature: (_feat, lyr) => lyr
        .bindPopup(() => mapPopupHtml(key), { maxWidth: 280 })
        .bindTooltip(esc(key), { permanent: true, direction: 'center', className: 'map-lot-label', opacity: 1 }),
    }).addTo(map);
    layers.set(key, layer);
    const kv = f.properties.kv;
    const b = layer.getBounds();
    if (b.isValid()) {
      allBounds.extend(b);
      if (!zoneBounds.has(kv)) zoneBounds.set(kv, L.latLngBounds([]));
      zoneBounds.get(kv).extend(b);
    }
  });

  mapCtx = { map, layers, zoneBounds, allBounds };
  map.on('zoomend resize', updateMapLabels);
  if (allBounds.isValid()) map.fitBounds(allBounds, { padding: [18, 18] });
  const wrap = el.closest('.map-wrap');
  if (wrap) wrap.classList.add('is-ready');
  return mapCtx;
}

function updateMapLabels() {
  if (!mapCtx) return;
  const placed = [];
  mapCtx.layers.forEach((layer, key) => {
    const dim = state.zone && GEO_BY_LOT.get(key).properties.kv !== state.zone;
    layer.eachLayer(lyr => {
      const tooltip = lyr.getTooltip();
      const rect = tooltip.getElement().getBoundingClientRect();
      const overlaps = placed.some(r => rect.left < r.right + 3 && rect.right + 3 > r.left
        && rect.top < r.bottom + 3 && rect.bottom + 3 > r.top);
      const visible = !dim && !overlaps;
      tooltip.setOpacity(visible ? 1 : 0);
      if (visible) placed.push(rect);
    });
  });
}

function applyZoneStyles() {
  if (!mapCtx) return;
  mapCtx.layers.forEach((layer, key) => {
    const base = mapStyle(key);
    const kv = GEO_BY_LOT.get(key).properties.kv;
    const dim = state.zone && kv !== state.zone;
    layer.setStyle(dim ? Object.assign({}, base, { opacity: .18, fillOpacity: .06 }) : base);
  });
  updateMapLabels();
}

function refreshMap() {
  applyZoneStyles();
  renderZones();
}

function setZone(zone, opts = {}) {
  state.zone = zone || null;
  applyZoneStyles();
  renderZones();
  if (!mapCtx) return;
  const bounds = state.zone ? mapCtx.zoneBounds.get(state.zone) : mapCtx.allBounds;
  if (bounds && bounds.isValid()) mapCtx.map.fitBounds(bounds, { padding: [22, 22], maxZoom: 17 });
  if (opts.scroll && window.innerWidth <= 980) {
    const wrap = $('.map-wrap');
    if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function setHomeView(mode) {
  state.homeView = mode === 'map' ? 'map' : 'list';
  $$('.home-tabs .seg').forEach(btn => {
    const active = btn.dataset.homeview === state.homeView;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  $('#listPanel').hidden = state.homeView !== 'list';
  $('#mapPanel').hidden = state.homeView !== 'map';
  if (state.homeView === 'map') {
    pullRemote(false);
    const ctx = initMap();
    if (ctx) {
      refreshMap();
      requestAnimationFrame(() => ctx.map.invalidateSize());
    } else {
      renderZones();
    }
  }
}

/* ============================================================
   Chi tiết lô
   ============================================================ */
function renderLot() {
  const key = state.lot;
  if (!key) { openHome(false); return; }
  const st = lotState(key);
  const base = st.base;
  const meta = st.meta;

  $('#lotEyebrow').textContent = base ? t('lotEyebrow', { doi: base.doi, id: base.id || t('lotNoId') }) : t('lotOutside');
  $('#lotTitle').textContent = `${t('thLot')} ${key}`;
  const doneSuffix = meta.done && meta.doneAt ? t('doneSuffix', { time: dateTimeVN(meta.doneAt) }) : '';
  const pauseSuffix = !meta.done && meta.pausedAt ? t('pauseSuffix', { time: dateTimeVN(meta.pausedAt) }) : '';
  $('#lotSub').textContent = base
    ? `${base.clone || '—'} · ${t('metaPlantYear', { year: base.year || '—' })} · ${fmt2(base.area)} ha · 2026: ${fmt(st.ref ? st.ref.total : base.total)} ${t('treeUnit')}${doneSuffix}${pauseSuffix}`
    : t('noBaselineSub') + doneSuffix + pauseSuffix;

  $('#metaHuong').value = meta.huong || '';
  $('#metaNgay').value = meta.ngay || '';
  $('#metaNguoi').value = meta.nguoi || '';
  $('#metaGhiChu').value = meta.ghiChu || '';

  const dirs = lotDirs(key);
  if (dirs && state.lotDir !== 'ALL' && !dirs.includes(state.lotDir)) state.lotDir = dirs[0];

  const doneBtn = $('#btnToggleDone');
  doneBtn.textContent = meta.done ? t('reopenLot') : t('markDone');
  doneBtn.classList.toggle('btn-primary', !meta.done);
  updateQuickLotBtn();
  rebuildRowsTable();
  refreshLotDerived();
  renderLotRemoteNote();
}

function activeDir(key) {
  const dirs = lotDirs(key);
  if (!dirs) return '';
  if (state.lotDir === 'ALL') return 'ALL';
  return dirs.includes(state.lotDir) ? state.lotDir : dirs[0];
}
function viewRowsOf(key) {
  const dir = activeDir(key);
  return dir && dir !== 'ALL' ? rowsInDir(key, dir) : lotRows(key);
}
function defaultQuickDir(key) {
  const dirs = lotDirs(key);
  if (!dirs) return '';
  const cur = activeDir(key);
  if (cur && cur !== 'ALL') return cur;
  const rows = lotRows(key);
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rowHasData(rows[i])) return rowDir(key, rows[i]);
  }
  return dirs[0];
}
function updateQuickLotBtn() {
  const btn = $('#btnQuickLot');
  if (!btn || !state.lot) return;
  const key = state.lot;
  const st = lotState(key);
  const dir = defaultQuickDir(key);
  const dirs = lotDirs(key);
  btn.textContent = !st.meta.done && st.entered.length
    ? (dirs ? t('resumeDirBtn', { dir, h: resumeHang(key, dir) }) : t('resumeHangBtn', { h: resumeHang(key, dir || undefined) }))
    : t('quickEntry');
}
function sortedRows(key, dir) {
  const rows = dir && dir !== 'ALL' ? rowsInDir(key, dir) : lotRows(key);
  return rows.slice().sort((a, b) => {
    const ha = a.hang == null ? 999999 : a.hang;
    const hb = b.hang == null ? 999999 : b.hang;
    if (ha !== hb) return ha - hb;
    return 0;
  });
}
function outlierMapFor(key, rows) {
  const dirs = lotDirs(key);
  if (!dirs) return rowOutliers(rows);
  const merged = new Map();
  dirs.forEach(d => rowOutliers(rowsInDir(key, d)).forEach((v, k) => merged.set(k, v)));
  return merged;
}

function mergedPtMapFor(key) {
  const refMap = mergedRefMap(key);
  if (!refMap) return null;
  const map = new Map();
  mergeDirRows(lotRows(key)).forEach(m => {
    const ref = refMap[String(m.hang)];
    if (!Number.isFinite(ref)) return;
    const dt = Number(m.dt) || 0;
    const diff = dt - ref;
    map.set(m.hang, { ref, diff, dt, warn: Math.abs(diff) >= PHUC_TRA_MIN, merged: true });
  });
  return map;
}

function ptCellHtml(pt, refOnly) {
  if (!pt) {
    return `<span class="pt-empty" title="${esc(t(refOnly ? 'phucTraDirRef' : 'phucTraNoRef'))}">—</span>`;
  }
  const cls = pt.warn ? 'alert' : 'ok';
  const refText = pt.merged ? t('phucTraRefMerged', { ref: fmt(pt.ref) }) : `2026 · ${fmt(pt.ref)}`;
  const tip = pt.merged
    ? t('phucTraTipMerged', { ref: fmt(pt.ref), dt: fmt(pt.dt), d: signed(pt.diff) })
    : t('phucTraTip', { ref: fmt(pt.ref), d: signed(pt.diff) });
  return `<span class="pt-cell ${cls}" title="${esc(tip)}">
    <span class="pt-ref">${esc(refText)}</span>
    <span class="pt-diff ${cls}">${signed(pt.diff)}</span>
  </span>`;
}

function rowHtml(row, odd, mergedPt) {
  const key = state.lot;
  const dirs = lotDirs(key);
  const rowDirVal = rowDir(key, row);
  const issue = rowIssue(row);
  const has = rowHasData(row);
  const sum = rowSum(row);
  const oddInfo = odd ? odd.get(row.uid) : null;
  const pt = phucTraOf(key, row)
    || (mergedPt && Number.isInteger(row.hang) ? mergedPt.get(row.hang) : null)
    || null;
  const ptWarn = !!(pt && pt.warn);
  let checkCls = 'empty', checkText = '—';
  if (has) {
    if (issue) {
      checkCls = 'bad';
      checkText = row.dt == null ? t('rowMissing') : t('rowDiff', { n: signed(Number(row.dt) - sum) });
    } else {
      checkCls = 'ok';
      checkText = t('rowOk');
    }
  }
  const dtBad = issue && row.dt != null ? ' bad' : '';
  const dtOdd = oddInfo ? ' odd' : '';
  const dtTitle = oddInfo ? ` title="${t('rowOddTip', { n: signed(oddInfo.diff), med: fmt(oddInfo.ref) })}"` : '';
  const input = (field, cls) => `<input class="${cls || ''}" type="number" inputmode="numeric" min="0" step="1"
      data-field="${field}" data-uid="${row.uid}" value="${row[field] == null ? '' : row[field]}" aria-label="${field}">`;
  const rowCls = [oddInfo ? 'row-outlier' : '', ptWarn ? 'pt-warn' : ''].filter(Boolean).join(' ');
  const dirCell = dirs
    ? `<td class="col-dir"><select class="dir-select" data-dir-uid="${row.uid}" aria-label="${esc(t('thDir'))}">${dirs.map(d => `<option value="${d}"${d === rowDirVal ? ' selected' : ''}>${d}</option>`).join('')}</select></td>`
    : '<td class="col-dir" hidden></td>';
  return `
    <tr data-uid="${row.uid}"${rowCls ? ` class="${rowCls}"` : ''}>
      <td><input class="hang-input" type="number" inputmode="numeric" min="1" step="1" data-field="hang" data-uid="${row.uid}" value="${row.hang == null ? '' : row.hang}" aria-label="${t('thHang')}"></td>
      ${dirCell}
      <td><input class="dt-input${dtBad}${dtOdd}"${dtTitle} type="number" inputmode="numeric" min="0" step="1" data-field="dt" data-uid="${row.uid}" value="${row.dt == null ? '' : row.dt}" aria-label="dt"></td>
      <td>${input('g')}</td>
      <td>${input('plus')}</td>
      <td>${input('c')}</td>
      <td>${input('k1')}</td>
      <td>${input('k2')}</td>
      <td>${input('o')}</td>
      <td class="col-pt">${ptCellHtml(pt, !!mergedRefMap(key))}</td>
      <td class="col-check"><span class="row-check ${checkCls}">${checkText}</span></td>
      <td>
        <div class="row-tools">
          <button class="mini-btn undo" type="button" data-act="undo" data-uid="${row.uid}" title="${t('undoCalcTitle')}"${rowUndo.has(row.uid) ? '' : ' hidden'}>
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5.5L4.5 9 8 12.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.8 9H14a5.2 5.2 0 0 1 0 10.4h-3.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
          </button>
          <button class="mini-btn calc" type="button" data-act="calc" data-uid="${row.uid}" title="${t('calcTitle')}">=</button>
          <button class="mini-btn del" type="button" data-act="del" data-uid="${row.uid}" title="${t('delRowTitle')}">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
}

function rebuildRowsTable() {
  const key = state.lot;
  const dirs = lotDirs(key);
  const rows = sortedRows(key, dirs ? activeDir(key) : '');
  const body = $('#rowsBody');
  const thDir = document.querySelector('.rows-table thead .col-dir');
  if (thDir) thDir.hidden = !dirs;
  const footDir = document.querySelector('.rows-table tfoot .col-dir');
  if (footDir) footDir.hidden = !dirs;
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="${dirs ? 12 : 11}"><div class="empty-rows">${t('emptyRows')}</div></td></tr>`;
    return;
  }
  const odd = outlierMapFor(key, rows);
  const mergedPt = mergedPtMapFor(key);
  body.innerHTML = rows.map(row => rowHtml(row, odd, mergedPt)).join('');
}

function refreshLotDerived() {
  const key = state.lot;
  if (!key) return;
  const dirs = lotDirs(key);
  const dir = activeDir(key);
  const rows = viewRowsOf(key);
  const entered = rows.filter(rowHasData);
  const agg = aggregate(rows);
  const issues = rowIssuesOf(rows);
  const dups = findDuplicates(rows);
  const dupsSet = new Set(dirs && dir === 'ALL'
    ? (lotDirStates(key) || []).flatMap(d => d.dups)
    : dups);
  const ptIssues = mergedRefMap(key) ? mergedPhucTraIssues(key) : phucTraIssues(key, rows);
  const base = BASE_BY_LOT.get(key);
  const meta = lotMeta(key);
  const st = lotState(key);
  const delta = st.ref && entered.length ? agg.dt - st.ref.total : null;

  const sumLabel = $('#sumLabel');
  if (sumLabel) {
    sumLabel.textContent = dirs
      ? (dir === 'ALL' || !dir ? t('dirTotalAll') : t('dirTotal', { dir }))
      : t('total');
  }
  $('#sumDt').textContent = fmt(agg.dt);
  $('#sumG').textContent = fmt(agg.g);
  $('#sumPlus').textContent = fmt(agg.plus);
  $('#sumC').textContent = fmt(agg.c);
  $('#sumK1').textContent = fmt(agg.k1);
  $('#sumK2').textContent = fmt(agg.k2);
  $('#sumO').textContent = fmt(agg.o);
  const checkNote = $('#sumCheckNote');
  if (!entered.length) {
    checkNote.textContent = t('statusEmpty');
    checkNote.className = 'muted';
  } else if (issues.length) {
    checkNote.textContent = t('sumIssues', { n: issues.length });
    checkNote.className = 'row-check bad';
  } else {
    checkNote.textContent = t('sumOk', { n: entered.length });
    checkNote.className = 'row-check ok';
  }
  $('#rowCountLabel').textContent = dirs && dir !== 'ALL'
    ? `${t('rowCount', { n: entered.length })} · ${t('dirTotal', { dir })}`
    : t('rowCount', { n: entered.length });

  // cập nhật từng dòng
  const odd = outlierMapFor(key, rows);
  const mergedPt = mergedPtMapFor(key);
  rows.forEach(row => {
    const tr = $(`#rowsBody tr[data-uid="${CSS.escape(row.uid)}"]`);
    if (!tr) return;
    const issue = rowIssue(row);
    const sum = rowSum(row);
    const oddInfo = odd.get(row.uid);
    tr.classList.toggle('row-outlier', !!oddInfo);
    const dtInput = tr.querySelector('input[data-field="dt"]');
    if (dtInput) {
      dtInput.classList.toggle('bad', !!(issue && row.dt != null));
      dtInput.classList.toggle('odd', !!oddInfo);
      if (oddInfo) dtInput.title = t('rowOddTip', { n: signed(oddInfo.diff), med: fmt(oddInfo.ref) });
      else dtInput.removeAttribute('title');
    }
    const hangInput = tr.querySelector('input[data-field="hang"]');
    if (hangInput) hangInput.classList.toggle('dup', row.hang != null && dupsSet.has(row.hang));
    const cell = tr.querySelector('.row-check');
    if (cell) {
      if (!rowHasData(row)) { cell.className = 'row-check empty'; cell.textContent = '—'; }
      else if (issue) { cell.className = 'row-check bad'; cell.textContent = row.dt == null ? t('rowMissing') : t('rowDiff', { n: signed(Number(row.dt) - sum) }); }
      else { cell.className = 'row-check ok'; cell.textContent = t('rowOk'); }
    }
    const pt = phucTraOf(key, row)
      || (mergedPt && Number.isInteger(row.hang) ? mergedPt.get(row.hang) : null)
      || null;
    tr.classList.toggle('pt-warn', !!(pt && pt.warn));
    const ptCell = tr.querySelector('.col-pt');
    if (ptCell) ptCell.innerHTML = ptCellHtml(pt, !!mergedRefMap(key));
  });

  const sumPt = $('#sumPt');
  if (sumPt) {
    if (!entered.length || !hasPhucTra(key)) {
      sumPt.textContent = '—';
      sumPt.className = 'pt-sum';
      sumPt.removeAttribute('title');
    } else if (ptIssues.length) {
      sumPt.textContent = t('ptSumWarn', { n: ptIssues.length });
      sumPt.className = 'pt-sum alert';
      sumPt.title = t('ptSumWarnTip', { n: ptIssues.length })
        + (mergedRefMap(key) ? ' · ' + t('ptSumMergedTip') : '');
    } else {
      sumPt.textContent = t('ptSumOk');
      sumPt.className = 'pt-sum ok';
      if (mergedRefMap(key)) sumPt.title = t('ptSumMergedTip');
      else sumPt.removeAttribute('title');
    }
  }
  const ptNoteEl = $('#rowsPtNote');
  if (ptNoteEl) {
    if (!hasPhucTra(key)) {
      ptNoteEl.textContent = t('rowsPtNoData');
      ptNoteEl.className = 'rows-pt-note muted';
      ptNoteEl.hidden = false;
    } else {
      ptNoteEl.textContent = mergedRefMap(key) ? t('rowsPtMergedNote') : t('rowsPtNote');
      ptNoteEl.className = 'rows-pt-note';
      ptNoteEl.hidden = false;
    }
  }

  const oddNote = $('#rowsOddNote');
  if (oddNote) {
    if (odd.size) {
      const list = rows
        .filter(r => odd.has(r.uid))
        .sort((a, b) => (a.hang == null ? 1e9 : a.hang) - (b.hang == null ? 1e9 : b.hang))
        .map(r => (r.hang == null ? '—' : r.hang))
        .join(', ');
      oddNote.textContent = t('rowsOddNote', { n: odd.size, list, med: fmt(odd.values().next().value.ref) });
      oddNote.hidden = false;
    } else {
      oddNote.hidden = true;
      oddNote.textContent = '';
    }
  }

  const doneBtn = $('#btnToggleDone');
  if (doneBtn && state.view === 'lot') {
    doneBtn.textContent = meta.done ? t('reopenLot') : t('markDone');
    doneBtn.classList.toggle('btn-primary', !meta.done);
  }
  updateQuickLotBtn();

  renderDirBar(key, st);
  renderCompare({ base, ref: st.ref, agg: st.agg, entered: st.entered.length, delta: st.delta, meta });
  renderAlerts({
    key, base, ref: st.ref, agg: st.agg, entered: st.entered.length, delta: st.delta, meta,
    dirStates: st.dirStates, issues: st.issues, dups: st.dups, ptIssues: st.ptIssues,
  });
  renderChecks({
    key, base, ref: st.ref, agg: st.agg, entered: st.entered.length, delta: st.delta, meta,
    issues: st.issues, dups: st.dups, rows: st.rows, ptIssues: st.ptIssues, dirStates: st.dirStates,
  });
  renderHangMap(key);
  updateSummaryBanner(key);
}

function dupsLabel(dups) {
  return dups
    .map(d => (d && typeof d === 'object' ? `${d.dir}·${d.hang}` : d))
    .join(', ');
}

function renderDirBar(key, st) {
  const host = $('#lotDirBar');
  if (!host) return;
  const dirs = lotDirs(key);
  if (!dirs) { host.hidden = true; return; }
  host.hidden = false;
  const current = activeDir(key);
  const btn = (val, label, count, warn) => `<button class="dir-chip${current === val ? ' is-active' : ''}${warn ? ' has-warn' : ''}" type="button" data-dir="${val}" title="${esc(val === 'ALL' ? t('dirTotalAll') : t('dirChipTitle', { dir: val }))}"><b>${esc(label)}</b><span>${count}</span></button>`;
  const all = dirs.reduce((n, d) => n + (st.dirStates.find(s => s.dir === d) || { entered: [] }).entered.length, 0);
  const html = [btn('ALL', t('dirAll'), all, st.hasError || st.hasPt)]
    .concat(st.dirStates.map(d => btn(d.dir, d.dir, d.entered.length, d.issues.length || d.dups.length || d.ptIssues.length)));
  $('#lotDirBtns').innerHTML = html.join('');
  const summary = $('#lotDirSummary');
  if (summary) {
    const hasBase = st.ref && st.entered.length;
    summary.textContent = hasBase
      ? t('dirSummary', { dt: fmt(st.agg.dt), base: fmt(st.ref.total), d: signed(st.delta) })
      : t('dirSummaryNoBase', { dt: fmt(st.agg.dt) });
  }
  const note = $('#lotDirNote');
  if (note) note.textContent = t(mergedRefMap(key) ? 'dirNoteMerged' : 'dirNote', { n: dirs.length, list: dirs.join('/') });
}

function compareRow(label, v26, v27, isTotal, deltaCls) {
  const show27 = v27 == null ? '—' : fmt(v27);
  const show26 = v26 == null ? '—' : fmt(v26);
  let d = '—', cls = '';
  if (v26 != null && v27 != null) {
    const diff = v27 - v26;
    d = signed(diff);
    if (isTotal && diff !== 0) cls = deltaCls;
    else if (isTotal && diff === 0) cls = 'pos';
  }
  return `<tr class="${isTotal ? 'total-row' : ''}"><td>${label}</td><td>${show26}</td><td>${show27}</td><td class="${cls}">${d}</td></tr>`;
}

function renderCompare({ base, ref, agg, entered, delta, meta }) {
  const has = entered > 0;
  const r = ref || base;
  const deltaCls = meta.done ? 'neg' : 'neg';
  const rows = [
    compareRow(t('metricTotal'), r ? r.total : null, has ? agg.dt : null, true, deltaCls),
    ...CATS.map(([k, key]) => compareRow(t(key), r ? r[k] : null, has ? agg[k] : null, false, '')),
  ];
  $('#compareBody').innerHTML = rows.join('');
  const badge = $('#compareBadge');
  if (!r) {
    badge.className = 'badge';
    badge.textContent = t('compareBadgeNoBase');
  } else if (!has) {
    badge.className = 'badge';
    badge.textContent = t('compareBadgeEmpty');
  } else if (delta === 0) {
    badge.className = 'badge good';
    badge.textContent = t('compareBadgeMatch');
  } else {
    badge.className = 'badge ' + (meta.done ? 'bad' : 'warn');
    badge.textContent = `${t('compareBadgeDiff', { n: signed(delta) })} · ${pct(delta, r.total)}`;
  }
  const note = $('#baselineNote');
  if (!base) {
    note.textContent = t('noBaseNote');
  } else {
    let text;
    if (ref && ref.detail) {
      text = t('baselineNotePhucTra', { id: base.id || '—', total: fmt(ref.total) });
      if (Number(base.total) !== Number(ref.total)) {
        text += ' ' + t('baselineNoteSummaryDiff', { total: fmt(base.total) });
      }
      if (ref.mismatch) {
        text += ' ' + t('detailMismatch', { n: signed(ref.mismatch), sum: fmt(ref.sum) });
      }
    } else {
      text = t('baselineNote', { id: base.id || '—', total: fmt(base.total) });
      if (base.mismatch) {
        text += ' ' + t('baselineMismatch', { n: signed(base.mismatch), sum: fmt(base.sum) });
      }
    }
    note.textContent = text;
  }
}

const CHECK2_COMP = ['g', 'plus', 'c', 'k1', 'k2', 'o'];
const CHECK2_O_DIFF = 3;

function check2RowVals(row) {
  const v = {};
  FIELDS.forEach(k => { v[k] = row[k] == null || row[k] === '' ? null : Number(row[k]) || 0; });
  return v;
}

function check2RowsData(key) {
  const dirs = lotDirs(key);
  const mergedRef = mergedRefMap(key);
  const pt = PHUC_TRA[key];
  const items = [];
  if (mergedRef) {
    const seen = new Set();
    mergeDirRows(lotRows(key)).filter(rowHasData).forEach(m => {
      seen.add(String(m.hang));
      const rv = mergedRef[String(m.hang)];
      items.push({ dir: '', hang: m.hang, ref: Number.isFinite(rv) ? rv : null, c26: phucTraComps(key, m.hang, ''), vals: check2RowVals(m), editable: false });
    });
    Object.keys(mergedRef).forEach(h => {
      if (seen.has(String(h))) return;
      const hang = Number(h);
      if (!Number.isInteger(hang)) return;
      const ref = Number(mergedRef[h]);
      if (!Number.isFinite(ref)) return;
      items.push({ dir: '', hang, ref, c26: phucTraComps(key, hang, ''), vals: null, editable: false });
    });
    return { items: items.sort((a, b) => a.hang - b.hang), mode: pt && pt.ref ? 'merged' : 'dirsum' };
  }
  if (dirs) {
    dirs.forEach(dir => {
      const seen = new Set();
      const block = [];
      rowsInDir(key, dir).filter(r => rowHasData(r) && Number.isInteger(r.hang)).forEach(r => {
        seen.add(String(r.hang));
        block.push({ uid: r.uid, dir, hang: r.hang, ref: phucTraRef(key, r.hang, dir, false), c26: phucTraComps(key, r.hang, dir), vals: check2RowVals(r), editable: true });
      });
      const map = pt && pt.dirs && pt.dirs[dir];
      if (map) Object.keys(map).forEach(h => {
        if (seen.has(String(h))) return;
        const hang = Number(h);
        if (!Number.isInteger(hang)) return;
        const ref = Number(map[h]);
        if (!Number.isFinite(ref)) return;
        block.push({ uid: '', dir, hang, ref, c26: phucTraComps(key, hang, dir), vals: null, editable: true });
      });
      block.sort((a, b) => a.hang - b.hang).forEach(x => items.push(x));
    });
    return { items, mode: 'dirs' };
  }
  const seen = new Set();
  lotRows(key).filter(r => rowHasData(r) && Number.isInteger(r.hang)).forEach(r => {
    seen.add(String(r.hang));
    items.push({ uid: r.uid, dir: '', hang: r.hang, ref: phucTraRef(key, r.hang, '', false), c26: phucTraComps(key, r.hang, ''), vals: check2RowVals(r), editable: true });
  });
  if (pt && !pt.dirs && !pt.ref) {
    Object.keys(pt).forEach(h => {
      if (seen.has(String(h))) return;
      const hang = Number(h);
      if (!Number.isInteger(hang)) return;
      const ref = Number(pt[h]);
      if (!Number.isFinite(ref)) return;
      items.push({ uid: '', dir: '', hang, ref, c26: phucTraComps(key, hang, ''), vals: null, editable: true });
    });
  }
  items.sort((a, b) => a.hang - b.hang);
  return { items, mode: pt ? 'rows' : 'none' };
}

let check2Focus = null;
const check2Undo = new Map();
const CHECK2_UNDO_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5.5L4.5 9 8 12.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.8 9H14a5.2 5.2 0 0 1 0 10.4h-3.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

function check2Remember(row) {
  const vals = {};
  FIELDS.forEach(k => { vals[k] = row[k] == null ? null : row[k]; });
  check2Undo.set(row.uid, { vals });
}

function renderCheck2Rows(key) {
  const host = $('#check2Rows');
  const body = $('#check2RowsBody');
  const head = $('#check2RowsHead');
  const note = $('#check2RowsNote');
  if (!host || !body || !head) return;
  const { items, mode } = check2RowsData(key);
  if (!items.length) { host.hidden = true; return; }
  host.hidden = false;
  const noDirRef = mode === 'dirs' && !(PHUC_TRA[key] && PHUC_TRA[key].dirs);
  const dirs = mode === 'merged' || mode === 'dirsum' ? null : lotDirs(key);
  const compLabels = ['G', '+', 'C', 'K1', 'K2', 'O'];
  const group = label => `<th colspan="2">${esc(label)}</th>`;
  head.innerHTML = `<tr class="c2-group"><th rowspan="2">${esc(t('thHang'))}</th>`
    + (dirs ? `<th rowspan="2">${esc(t('thDir'))}</th>` : '')
    + group(t('metricTotal')) + compLabels.map(group).join('')
    + `<th rowspan="2">${esc(t('thDelta'))}</th><th rowspan="2" title="${esc(t('check2OdiffTitle'))}">${esc(t('check2ColODiff'))}</th><th rowspan="2">${esc(t('check2ColNote'))}</th></tr>`
    + `<tr class="c2-year">${'<th>2026</th><th>2027</th>'.repeat(7)}</tr>`;
  measureCheck2Head();
  let diff = 0;
  let miss = 0;
  body.innerHTML = items.map(item => {
    const v = item.vals;
    const dt = v ? v.dt : null;
    const has26 = item.ref != null;
    const has27 = dt != null;
    let dText = '—';
    let dCls = '';
    let text = '';
    let cls = '';
    if (has26 && has27) {
      const dv = dt - item.ref;
      dText = signed(dv);
      dCls = dv === 0 ? 'pos' : 'neg';
      if (dv === 0) { cls = 'pos'; text = t('check2RowOk'); }
      else if (Math.abs(dv) < PHUC_TRA_MIN) text = t('check2RowSmall');
      else { cls = 'neg'; text = t('check2RowDiff'); diff += 1; }
    } else if (has26 && !has27) {
      cls = 'neg';
      text = t('check2RowMissing27');
      miss += 1;
    } else if (!has26 && has27) {
      text = t(noDirRef ? 'check2RowNoDirRef' : 'check2RowNoRef');
    }
    let sumBad = null;
    if (has27 && v) {
      sumBad = CHECK2_COMP.reduce((sum, k) => sum + (Number(v[k]) || 0), 0) - dt;
      if (sumBad !== 0) { cls = 'neg'; text = t('check2RowSumBad', { d: signed(sumBad) }); }
    }
    // Chênh lệch hố trống (O) theo hàng: từ 3 trở lên thì tô vàng cam cả hàng.
    const o26 = item.c26 && item.c26[5] != null ? Number(item.c26[5]) : null;
    const o27 = v && v.o != null && v.o !== '' ? Number(v.o) : null;
    const oDiff = o26 != null && o27 != null ? o27 - o26 : null;
    const oBad = oDiff != null && Math.abs(oDiff) >= CHECK2_O_DIFF;
    const oCell = oDiff == null
      ? '<td class="c2-odiff">—</td>'
      : `<td class="c2-odiff${oBad ? ' bad' : ''}">${signed(oDiff)}</td>`;
    const pair = (field, ref26) => {
      const val = v && v[field] != null ? v[field] : '';
      const hasRef = ref26 != null;
      const cellCls = hasRef && val !== '' && Number(val) !== Number(ref26) ? ' c2-v27-diff' : '';
      const v26 = `<td class="c2-v26">${hasRef ? fmt(ref26) : '—'}</td>`;
      const v27 = !item.editable
        ? `<td class="${cellCls.trim()}">${val === '' ? '—' : fmt(val)}</td>`
        : `<td class="${cellCls.trim()}"><input class="c2-in" type="number" inputmode="numeric" min="0" step="1"`
          + ` data-field="${field}" data-uid="${esc(item.uid || '')}" data-hang="${item.hang}" data-dir="${esc(item.dir || '')}"`
          + ` value="${val}" aria-label="${field}"></td>`;
      return v26 + v27;
    };
    const dirCell = dirs ? `<td>${esc(item.dir || '—')}</td>` : '';
    const cells = [pair('dt', item.ref)];
    CHECK2_COMP.forEach((f, i) => cells.push(pair(f, item.c26 ? item.c26[i] : null)));
    const tools = item.uid
      ? '<span class="check2-tools">'
        + `<button class="mini-btn undo" type="button" data-c2="undo" data-uid="${esc(item.uid)}" title="${esc(t('undoEditTitle'))}"${check2Undo.has(item.uid) ? '' : ' hidden'}>${CHECK2_UNDO_ICON}</button>`
        + `<button class="mini-btn calc" type="button" data-c2="calc" data-uid="${esc(item.uid)}" title="${esc(t('calcTitle'))}">=</button>`
        + '</span>'
      : '';
    return `<tr${oBad ? ' class="c2-row-o"' : ''}><td>${esc(String(item.hang))}</td>${dirCell}`
      + cells.join('')
      + `<td class="${dCls}">${dText}</td>${oCell}<td class="check2-row-note ${cls}">`
      + `<span class="c2-note-text">${esc(text)}</span>${tools}</td></tr>`;
  }).join('');
  if (note) {
    const base = mode === 'merged' ? t('check2RowsMergedNote')
      : mode === 'dirsum' ? t('check2RowsDirSumNote')
        : mode === 'dirs' ? t(noDirRef ? 'check2RowsNoDirRefNote' : 'check2RowsDirsNote')
          : mode === 'rows' ? t('check2RowsPlainNote') : t('check2RowsNoRefNote');
    const edit = mode === 'merged' || mode === 'dirsum' ? '' : t('check2RowsEditNote');
    note.textContent = `${base} ${t('check2RowsPairNote')} ${edit} ${t('check2RowsSummary', { n: items.length, d: diff, m: miss })}`.replace(/\s+/g, ' ').trim();
  }
  if (check2Focus) {
    const el = body.querySelector(`input[data-uid="${CSS.escape(check2Focus.uid)}"][data-field="${check2Focus.field}"]`);
    if (el) el.focus();
  }
}

function onCheck2RowChange(e) {
  const inp = e.target.closest('input[data-field]');
  if (!inp || !state.lot) return;
  const key = state.lot;
  const field = inp.dataset.field;
  const hang = parseHang(inp.dataset.hang);
  if (!Number.isInteger(hang)) return;
  const dir = inp.dataset.dir || '';
  const val = inp.value.trim() === '' ? null : parseNum(inp.value);
  let row = inp.dataset.uid ? lotRows(key).find(r => r.uid === inp.dataset.uid) : null;
  if (row) {
    const prev = row[field] == null ? null : Number(row[field]);
    if (prev === val) return;
    check2Remember(row);
  } else {
    if (val == null) return;
    row = { uid: uid(), hang, dt: null, g: null, plus: null, c: null, k1: null, k2: null, o: null };
    if (dir) row.dir = dir;
    ensureLot(key).rows.push(row);
    check2Undo.set(row.uid, { isNew: true });
    inp.dataset.uid = row.uid;
  }
  row[field] = val;
  touchLot(key);
  persist();
  check2Focus = { uid: row.uid, field };
  renderCheck2();
  check2Focus = null;
  syncLotScreen();
}

function syncLotScreen() {
  rebuildRowsTable();
  refreshLotDerived();
}

function onCheck2RowAction(e) {
  const btn = e.target.closest('button[data-c2]');
  if (!btn || !state.lot) return;
  const key = state.lot;
  const rowUid = btn.dataset.uid;
  if (!rowUid) return;
  const lot = ensureLot(key);
  const row = lotRows(key).find(r => r.uid === rowUid);
  if (!row) return;
  if (btn.dataset.c2 === 'calc') {
    check2Remember(row);
    row.dt = rowSum(row);
    touchLot(key);
    persist();
    renderCheck2();
    syncLotScreen();
  }
  if (btn.dataset.c2 === 'undo') {
    const snap = check2Undo.get(rowUid);
    if (!snap) return;
    check2Undo.delete(rowUid);
    if (snap.isNew) {
      lot.rows = lot.rows.filter(r => r.uid !== rowUid);
      if (!lot.rows.some(rowHasData)) lot.meta.clearedAt = new Date().toISOString();
    } else {
      Object.assign(row, snap.vals);
    }
    touchLot(key);
    persist();
    renderCheck2();
    syncLotScreen();
  }
}

function dirRefTotal(key, dir) {
  if (mergedRefMap(key) || !hasPhucTra(key)) return null;
  const lot = PHUC_TRA[key];
  const map = lot && lot.dirs && lot.dirs[dir];
  if (!map) return null;
  let sum = 0;
  for (const v of Object.values(map)) sum += Number(v) || 0;
  return sum;
}

function renderCheck2() {
  const key = state.lot;
  if (!key) return;
  const st = lotState(key);
  const r = st.ref || st.base;
  const has = st.entered.length > 0;
  const defs = [
    { k: 'dt', label: t('metricTotal'), ref: r ? r.total : null, total: true },
    ...CATS.map(([k, lk]) => ({ k, label: t(lk), ref: r ? r[k] : null, total: false })),
  ];
  let compared = 0;
  let diff = 0;
  const rows = defs.map(d => {
    const v27 = has ? st.agg[d.k] : null;
    const v26 = d.ref == null ? null : Number(d.ref);
    let dText = '—';
    let cls = '';
    if (v26 != null && v27 != null) {
      compared += 1;
      const dv = Number(v27) - v26;
      dText = signed(dv);
      cls = dv === 0 ? 'pos' : 'neg';
      if (dv !== 0) diff += 1;
    }
    return `<tr${d.total ? ' class="total-row"' : ''}><td>${esc(d.label)}</td>`
      + `<td>${v26 == null ? '—' : fmt(v26)}</td><td>${v27 == null ? '—' : fmt(v27)}</td>`
      + `<td class="${cls}">${dText}</td></tr>`;
  });
  $('#check2Body').innerHTML = rows.join('');

  const badge = $('#check2Status');
  if (!badge) return;
  if (!has) {
    badge.className = 'badge';
    badge.textContent = t('check2NoData');
  } else if (!r) {
    badge.className = 'badge';
    badge.textContent = t('check2NoRef');
  } else if (diff === 0) {
    badge.className = 'badge good';
    badge.textContent = t('check2AllMatch');
  } else {
    badge.className = 'badge warn';
    badge.textContent = t('check2DiffCount', { n: diff, total: compared });
  }

  const notes = [];
  if (has) {
    const sum27 = st.agg.g + st.agg.plus + st.agg.c + st.agg.k1 + st.agg.k2 + st.agg.o;
    const d27 = sum27 - st.agg.dt;
    notes.push(d27 === 0
      ? `<p class="check2-note ok">${esc(t('check2Sum27Ok'))}</p>`
      : `<p class="check2-note bad">${esc(t('check2Sum27Diff', { n: signed(d27) }))}</p>`);
    if (r && r.mismatch) {
      notes.push(`<p class="check2-note bad">${esc(t('check2Sum26Diff', { n: signed(r.mismatch) }))}</p>`);
    }
  }
  $('#check2Notes').innerHTML = notes.join('');
  renderCheck2Rows(key);

  const dirs = lotDirs(key);
  const dirsEl = $('#check2Dirs');
  if (!dirsEl) return;
  if (!dirs) { dirsEl.hidden = true; return; }
  dirsEl.hidden = false;
  const short = ['G', '+', 'C', 'K1', 'K2', 'O'];
  $('#check2DirsHead').innerHTML = [t('check2DirCol'), '2026', '2027', t('thDelta'), ...short]
    .map(h => `<th>${esc(h)}</th>`).join('');
  $('#check2DirsBody').innerHTML = st.dirStates.map(ds => {
    const refTotal = dirRefTotal(key, ds.dir);
    const v27 = ds.entered.length ? ds.agg.dt : null;
    const diffT = refTotal != null && v27 != null ? v27 - refTotal : null;
    return `<tr><td><b>${esc(ds.dir)}</b></td><td>${refTotal == null ? '—' : fmt(refTotal)}</td>`
      + `<td>${v27 == null ? '—' : fmt(v27)}</td><td${diffT ? ' class="neg"' : ''}>${diffT == null ? '—' : signed(diffT)}</td>`
      + short.map((_, i) => `<td>${ds.entered.length ? fmt(ds.agg[CATS[i][0]]) : '—'}</td>`).join('')
      + '</tr>';
  }).join('');
}

function openCheck2() {
  if (!state.lot) return;
  const dlg = $('#check2Dialog');
  if (!dlg) return;
  const title = $('#check2Title');
  if (title) title.textContent = `${t('thLot')} ${state.lot}`;
  renderCheck2();
  if (!dlg.open) dlg.showModal();
  measureCheck2Head();
}
// Hai hàng tiêu đề dính khi cuộn: hàng năm 2026/2027 nằm ngay dưới hàng nhóm.
function measureCheck2Head() {
  const head = $('#check2RowsHead');
  if (!head) return;
  const row = head.querySelector('.c2-group');
  const h = row ? row.getBoundingClientRect().height : 0;
  if (h) head.closest('table').style.setProperty('--c2-head', `${h}px`);
}

function alertHtml(level, body, extraClass) {
  const icon = level === 'ok'
    ? '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M5 12.5l4.2 4L19 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : level === 'bad'
      ? '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5v5.2M12 16.4v.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M12 4l8.5 15h-17L12 4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 9.2v4M12 16.3v.1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  return `<div class="alert ${level}${extraClass ? ' ' + extraClass : ''}">${icon}<div class="alert-body">${body}</div></div>`;
}

function renderAlerts({ key, base, ref, agg, entered, delta, meta, dirStates, issues, dups, ptIssues }) {
  const alerts = [];
  const r = ref || base;
  if (!entered) {
    alerts.push(alertHtml('info', t('alertNoRows')));
  }
  if (dirStates) {
    dirStates.forEach(d => {
      const tag = t('dirAlertPrefix', { dir: d.dir });
      if (d.issues.length) {
        const first = d.issues.slice(0, 3).map(x => `${t('checksRow', { h: esc(x.row.hang ?? '?') })}: ${esc(x.issue.text)}`).join('<br>');
        alerts.push(alertHtml('bad', `<b>${esc(tag)}</b> — ${t('alertIssues', { n: d.issues.length, first })}${d.issues.length > 3 ? t('alertIssuesMore', { n: d.issues.length - 3 }) : ''}`));
      }
      if (d.dups.length) {
        alerts.push(alertHtml('bad', `<b>${esc(tag)}</b> — ${t('alertDup', { list: d.dups.map(h => esc(h)).join(', ') })}`));
      }
      if (d.ptIssues.length) {
        const list = d.ptIssues.slice(0, 6)
          .map(x => `${t('checksRow', { h: esc(x.row.hang ?? '?') })} (${signed(x.pt.diff)})`)
          .join(', ');
        alerts.push(alertHtml('warn', `<b>${esc(tag)}</b> — ${t('alertPhucTra', { n: d.ptIssues.length, list: list + (d.ptIssues.length > 6 ? '…' : '') })}`, 'pt'));
      }
    });
    const emptyDirs = dirStates.filter(d => !d.entered.length).map(d => d.dir);
    if (mergedRefMap(key) && ptIssues.length) {
      const tag = t('dirMergedTag');
      const list = ptIssues.slice(0, 6)
        .map(x => `${t('checksRow', { h: esc(x.row.hang ?? '?') })} (${signed(x.pt.diff)})`)
        .join(', ');
      alerts.push(alertHtml('warn', `<b>${esc(tag)}</b> — ${t('alertPhucTra', { n: ptIssues.length, list: list + (ptIssues.length > 6 ? '…' : '') })}`, 'pt'));
    }
    if (emptyDirs.length && entered && !meta.done) {
      alerts.push(alertHtml('info', t('dirMissing', { list: emptyDirs.join(', ') })));
    }
  } else {
    if (issues.length) {
      const first = issues.slice(0, 3).map(x => `${t('checksRow', { h: esc(x.row.hang ?? '?') })}: ${esc(x.issue.text)}`).join('<br>');
      alerts.push(alertHtml('bad', t('alertIssues', { n: issues.length, first }) + (issues.length > 3 ? t('alertIssuesMore', { n: issues.length - 3 }) : '')));
    }
    if (dups.length) {
      alerts.push(alertHtml('bad', t('alertDup', { list: dups.map(h => esc(h)).join(', ') })));
    }
    if (ptIssues.length) {
      const list = ptIssues.slice(0, 6)
        .map(x => `${t('checksRow', { h: esc(x.row.hang ?? '?') })} (${signed(x.pt.diff)})`)
        .join(', ');
      alerts.push(alertHtml('warn', t('alertPhucTra', { n: ptIssues.length, list: list + (ptIssues.length > 6 ? '…' : '') }), 'pt'));
    }
  }
  if (entered && r) {
    if (delta !== 0) {
      const msg = t('alertMsgDiff', { dt: fmt(agg.dt), base: fmt(r.total), d: signed(delta), p: pct(delta, r.total) });
      alerts.push(meta.done
        ? alertHtml('bad', t('alertDoneDiff', { msg }))
        : alertHtml('warn', t('alertTempDiff', { msg }), 'alert-cta'));
    } else {
      alerts.push(alertHtml('ok', t('alertMatch', { n: fmt(r.total) })));
    }
    if (base && base.mismatch && !(ref && ref.detail)) {
      alerts.push(alertHtml('warn', t('alertBaseMismatch', { n: signed(base.mismatch), total: fmt(base.total), sum: fmt(base.sum) })));
    }
  }
  if (entered && !r) {
    alerts.push(alertHtml('info', t('alertNoBase')));
  }
  const allRowOk = dirStates
    ? dirStates.every(d => !d.issues.length && !d.dups.length)
    : !issues.length && !dups.length;
  if (entered && !meta.done && allRowOk && (!r || delta === 0)) {
    alerts.push(alertHtml('info', t('alertAllOk')));
  }
  $('#lotAlerts').innerHTML = alerts.join('');
}

function renderChecks({ key, base, ref, agg, entered, delta, meta, issues, dups, rows, ptIssues, dirStates }) {
  const items = [];
  const pushRowChecks = (opt) => {
    const tag = opt.tag ? opt.tag + ' — ' : '';
    if (!opt.entered) {
      items.push(`<li class="check-item">${tag}${t('checksNoData')}</li>`);
      return;
    }
    items.push(opt.issues.length
      ? `<li class="check-item bad"><b>${tag}${t('checksIssueCount', { n: opt.issues.length })}</b> ${opt.issues.slice(0, 6).map(x => t('checksRow', { h: esc(x.row.hang ?? '?') })).join(', ')}${opt.issues.length > 6 ? '…' : ''}</li>`
      : `<li class="check-item ok">${tag}${t('checksAllOk')}</li>`);
    items.push(opt.dups.length
      ? `<li class="check-item bad">${tag}${t('checksDup', { list: opt.dups.map(h => esc(h)).join(', ') })}</li>`
      : `<li class="check-item ok">${tag}${t('checksNoDup')}</li>`);
    if (hasPhucTra(key) && !mergedRefMap(key)) {
      if (opt.ptIssues.length) {
        const list = opt.ptIssues.slice(0, 8)
          .map(x => `${esc(x.row.hang ?? '?')} (${signed(x.pt.diff)})`)
          .join(', ');
        items.push(`<li class="check-item pt">${tag}${t('checksPhucTra', { n: opt.ptIssues.length, list: list + (opt.ptIssues.length > 8 ? '…' : '') })}</li>`);
      } else {
        items.push(`<li class="check-item ok">${tag}${t('checksPhucTraOk')}</li>`);
      }
    } else if (!hasPhucTra(key)) {
      items.push(`<li class="check-item info">${tag}${t('checksPhucTraNoData')}</li>`);
    }
    const missing = missingHangs(opt.rows, key, opt.dir || '');
    if (missing.length) {
      const show = missing.slice(0, 12).map(h => esc(h)).join(', ');
      items.push(`<li class="check-item warn">${tag}${t('checksMissingRow', { n: missing.length, list: show + (missing.length > 12 ? '…' : '') })}</li>`);
    }
  };

  if (dirStates) {
    items.push(`<li class="check-item info">${t('checksTotalLine', { n: entered, dt: fmt(agg.dt) })}</li>`);
    if (!entered) {
      items.push(`<li class="check-item">${t('checksNoData')}</li>`);
    } else {
      dirStates.forEach(d => {
        const tag = t('dirAlertPrefix', { dir: d.dir });
        if (!d.entered.length) {
          items.push(`<li class="check-item warn">${tag} — ${t('checksNoData')}</li>`);
          return;
        }
        items.push(`<li class="check-item info">${t('dirChecksTotal', { dir: d.dir, n: d.entered.length, dt: fmt(d.agg.dt) })}</li>`);
        pushRowChecks({ tag, dir: d.dir, entered: d.entered.length, issues: d.issues, dups: d.dups, ptIssues: d.ptIssues, rows: d.rows });
      });
      if (mergedRefMap(key) && entered) {
        items.push(`<li class="check-item info"><b>${t('dirMergedTag')}</b> — ${t('checksPhucTraMergedRef')}</li>`);
        if (ptIssues.length) {
          const list = ptIssues.slice(0, 8)
            .map(x => `${esc(x.row.hang ?? '?')} (${signed(x.pt.diff)})`)
            .join(', ');
          items.push(`<li class="check-item pt"><b>${t('dirMergedTag')}</b> — ${t('checksPhucTra', { n: ptIssues.length, list: list + (ptIssues.length > 8 ? '…' : '') })}</li>`);
        } else {
          items.push(`<li class="check-item ok">${t('dirMergedTag')} — ${t('checksPhucTraOk')}</li>`);
        }
      }
      renderOverallChecks();
    }
  } else {
    items.push(`<li class="check-item info">${t('checksTotalLine', { n: entered, dt: fmt(agg.dt) })}</li>`);
    if (!entered) {
      items.push(`<li class="check-item">${t('checksNoData')}</li>`);
    } else {
      pushRowChecks({ tag: '', dir: '', entered, issues, dups, ptIssues, rows });
      renderOverallChecks();
    }
  }
  function renderOverallChecks() {
    const r = ref || base;
    if (r) {
      if (delta === 0) {
        items.push(`<li class="check-item ok">${t('checksMatchTotal', { n: fmt(r.total) })}</li>`);
      } else {
        items.push(`<li class="check-item ${meta.done ? 'bad' : 'warn'}">${t('baselineDiff', { a: fmt(agg.dt), b: fmt(r.total), d: signed(delta), p: pct(delta, r.total) })}</li>`);
      }
      if (base && base.mismatch && !(ref && ref.detail)) {
        items.push(`<li class="check-item warn">${t('baselineMismatch', { n: signed(base.mismatch), sum: fmt(base.sum) })}</li>`);
      }
      if (ref && ref.detail && ref.mismatch) {
        items.push(`<li class="check-item warn">${t('detailMismatch', { n: signed(ref.mismatch), sum: fmt(ref.sum) })}</li>`);
      }
    } else {
      items.push(`<li class="check-item warn">${t('checksNoBaseline')}</li>`);
    }
    items.push(meta.done
      ? `<li class="check-item ok">${t('checksDone')}</li>`
      : `<li class="check-item">${t('checksNotDone')}</li>`);
  }
  $('#lotChecks').innerHTML = `<h3>${t('checksTitle')}</h3><ul class="check-list">${items.join('')}</ul>`;
}

function hangMapBlock(key, rows, dir, label) {
  const entered = rows.filter(r => rowHasData(r) && Number.isInteger(r.hang));
  if (!entered.length) return '';
  const cov = coverageInfo(key, dir, rows);
  const max = Math.max(...entered.map(r => r.hang), cov.max || 0);
  const byHang = new Map(entered.map(r => [r.hang, r]));
  const gaps = missingHangs(rows, key, dir);
  const issues = rowIssuesOf(rows).length;
  const odd = rowOutliers(rows);
  const resume = gaps.length ? gaps[0] : max + 1;
  const dirAttr = dir ? ` data-dir="${esc(dir)}"` : '';
  const title = label || (dir ? `${t('hangMapTitle')} · ${t('dirAlertPrefix', { dir })}` : t('hangMapTitle'));
  const chips = [];
  cov.rows.slice(0, 200).forEach(h => {
    const row = byHang.get(h);
    if (row) {
      const bad = !!rowIssue(row);
      const oddCls = odd.has(row.uid) ? ' odd' : '';
      const pt = phucTraOf(key, row);
      const ptCls = pt && pt.warn ? ' pt' : '';
      const ptTip = pt && pt.warn ? ' · ' + t('hangChipPt', { d: signed(pt.diff) }) : '';
      chips.push(`<button class="hang-chip ${bad ? 'bad' : 'ok'}${oddCls}${ptCls}${h === resume ? ' is-next' : ''}" type="button" data-hang="${h}" data-mode="edit"${dirAttr} title="${t('hangChipEdit', { h, st: bad ? t('hangChipDiff') : t('hangChipMatched') })}${ptTip}">${h}</button>`);
    } else {
      chips.push(`<button class="hang-chip gap${h === resume ? ' is-next' : ''}" type="button" data-hang="${h}" data-mode="fill"${dirAttr} title="${t('hangChipFill', { h })}">${h}</button>`);
    }
  });
  if (!gaps.length) {
    chips.push(`<button class="hang-chip add is-next" type="button" data-hang="${resume}" data-mode="fill"${dirAttr} title="${t('hangBtnResume', { h: resume })}">+${resume}</button>`);
  }
  const missingText = gaps.length
    ? t('hangMissing', { n: gaps.length, list: gaps.slice(0, 14).join(', ') + (gaps.length > 14 ? '…' : '') })
    : cov.known && !cov.continuous
      ? t('hangCompleteList', { n: cov.expected.length })
      : t('hangContinuous', { max });
  const badgeCls = gaps.length || issues ? 'warn' : 'good';
  const badgeText = t('hangBadge', { n: entered.length })
    + (gaps.length ? t('hangBadgeMissing', { n: gaps.length }) : '')
    + (issues ? t('hangBadgeIssues', { n: issues }) : '');
  return `
    <div class="hang-block"${dir ? ` data-dir="${esc(dir)}"` : ''}>
      <div class="card-head">
        <h3>${title}</h3>
        <span class="badge ${badgeCls}">${badgeText}</span>
      </div>
      <div class="hang-chips">${chips.join('')}</div>
      <div class="hang-map-foot">
        <span>${missingText}${t('hangHint')}</span>
        <button class="btn btn-sm btn-hang-resume" type="button" data-hang="${resume}"${dirAttr}>${gaps.length ? t('hangBtnFill', { h: resume }) : t('hangBtnResume', { h: resume })}</button>
      </div>
    </div>`;
}

function renderHangMap(key) {
  const host = $('#lotHangMap');
  if (!host) return;
  const dirs = lotDirs(key);
  const blocks = [];
  if (mergedRefMap(key)) {
    blocks.push(hangMapBlock(key, mergeDirRows(lotRows(key)), '', t('hangMapMerged')));
  }
  if (dirs) {
    dirs.forEach(d => blocks.push(hangMapBlock(key, rowsInDir(key, d), d)));
  } else if (!mergedRefMap(key)) {
    blocks.push(hangMapBlock(key, lotRows(key), ''));
  }
  const shown = blocks.filter(Boolean);
  if (!shown.length) { host.hidden = true; host.innerHTML = ''; return; }
  host.hidden = false;
  host.innerHTML = shown.join('');
}

function focusLotRow(uid) {
  if (!uid) return;
  const tr = document.querySelector(`#rowsBody tr[data-uid="${CSS.escape(uid)}"]`);
  if (!tr) return;
  tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const input = tr.querySelector('input[data-field="dt"]');
  if (input) {
    input.focus({ preventScroll: true });
    input.select();
  }
  tr.classList.add('is-flash');
  setTimeout(() => tr.classList.remove('is-flash'), 1500);
}

/* ============================================================
   Sự kiện trang chủ
   ============================================================ */
function setupHomeEvents() {
  $('#filters').addEventListener('click', e => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    state.filter = btn.dataset.filter;
    state.recentLot = null;
    $$('#filters .chip').forEach(ch => ch.classList.toggle('is-active', ch === btn));
    renderLotList();
  });
  $('#searchInput').addEventListener('input', e => {
    state.q = e.target.value;
    state.recentLot = null;
    renderLotList();
  });
  $('#lotList').addEventListener('click', e => {
    const row = e.target.closest('.lot-row');
    if (row) openLot(row.dataset.lot);
  });
  $$('.home-tabs .seg').forEach(btn => {
    btn.addEventListener('click', () => setHomeView(btn.dataset.homeview));
  });
  $('#mapZones').addEventListener('click', e => {
    const row = e.target.closest('.zone-row');
    if (!row) return;
    setZone(row.dataset.zone === state.zone ? null : row.dataset.zone, { scroll: true });
  });
  $('#mapCanvas').addEventListener('click', e => {
    const btn = e.target.closest('[data-openlot]');
    if (btn) openLot(btn.dataset.openlot);
  });
  $('#btnZoneAll').addEventListener('click', () => setZone(null));
  $('#btnAddLot').addEventListener('click', addCustomLot);
  $('#btnBack').addEventListener('click', () => openHome());
  $('#btnQuickHome').addEventListener('click', () => openQuick(false));
  $('#btnQuickHome2').addEventListener('click', () => openQuick(false));
  $('#btnQuickLot').addEventListener('click', () => {
    if (!state.lot) return;
    openQuick(true, resumeHang(state.lot, defaultQuickDir(state.lot) || undefined));
  });
  $('#lotDirBtns').addEventListener('click', e => {
    const btn = e.target.closest('button[data-dir]');
    if (!btn || !state.lot) return;
    state.lotDir = btn.dataset.dir;
    rebuildRowsTable();
    refreshLotDerived();
  });
  $('#lotHangMap').addEventListener('click', e => {
    if (!state.lot) return;
    const resumeBtn = e.target.closest('.btn-hang-resume');
    if (resumeBtn) { openQuick(true, Number(resumeBtn.dataset.hang), resumeBtn.dataset.dir || ''); return; }
    const chip = e.target.closest('.hang-chip');
    if (!chip) return;
    const hang = Number(chip.dataset.hang);
    const dir = chip.dataset.dir || '';
    if (chip.dataset.mode === 'fill') { openQuick(true, hang, dir); return; }
    const row = lotRows(state.lot).find(r => r.hang === hang && (!dir || rowDir(state.lot, r) === dir));
    if (row) {
      if (dir && activeDir(state.lot) !== dir) {
        state.lotDir = dir;
        rebuildRowsTable();
        refreshLotDerived();
      }
      focusLotRow(row.uid);
    }
  });
  $('#btnExportLot').addEventListener('click', () => exportLot(state.lot));
  $('#btnExportAll').addEventListener('click', exportAll);
  $('#btnExportSummary').addEventListener('click', exportSummaryForm);
  $('#btnToggleDone').addEventListener('click', toggleDone);
  $('#btnUpdateSummary').addEventListener('click', updateSummary);

  ['huong', 'ngay', 'nguoi', 'ghiChu'].forEach(field => {
    const id = '#meta' + field.charAt(0).toUpperCase() + field.slice(1);
    $(id).addEventListener('input', e => {
      if (!state.lot) return;
      ensureLot(state.lot).meta[field] = e.target.value;
      touchLot(state.lot);
      persist();
      refreshLotDerived();
    });
  });

  $('#btnAddRow').addEventListener('click', addRow);
  $('#rowsBody').addEventListener('input', onRowInput);
  $('#rowsBody').addEventListener('keydown', onRowKeydown);
  $('#rowsBody').addEventListener('click', onRowClick);
  $('#rowsBody').addEventListener('change', onRowDirChange);
}

function onRowDirChange(e) {
  const sel = e.target.closest('.dir-select');
  if (!sel || !state.lot) return;
  const lot = ensureLot(state.lot);
  const row = lot.rows.find(r => r.uid === sel.dataset.dirUid);
  if (!row) return;
  row.dir = sel.value;
  touchLot(state.lot);
  persist();
  rebuildRowsTable();
  refreshLotDerived();
}

function addCustomLot() {
  const name = prompt(t('addLotPrompt'));
  if (name == null) return;
  const key = name.trim();
  if (!key) return;
  if (BASE_BY_LOT.has(key) || DB.lots[key]) {
    toast(t('toastLotExists'), 'bad');
    openLot(key);
    return;
  }
  ensureLot(key).meta.custom = true;
  touchLot(key);
  persist();
  renderHome();
  openLot(key);
  toast(t('toastAddedLot', { lot: key }), 'ok');
}

function toggleDone() {
  if (!state.lot) return;
  const lot = ensureLot(state.lot);
  const willDone = !lot.meta.done;
  if (willDone && !lotState(state.lot).entered.length) {
    toast(t('toastDoneEmpty'), 'bad');
    return;
  }
  const dirs = lotDirs(state.lot);
  if (willDone && dirs) {
    const empty = dirs.filter(d => !rowsInDir(state.lot, d).some(rowHasData));
    if (empty.length && !confirm(t('dirConfirmDone', { list: empty.join(', ') }))) return;
  }
  lot.meta.done = willDone;
  if (lot.meta.done) {
    lot.meta.doneAt = new Date().toISOString();
    lot.meta.reportAt = lot.meta.doneAt;
    lot.meta.doneBy = lot.meta.nguoi || '';
    lot.meta.pausedAt = null;
  } else {
    lot.meta.doneAt = null;
    lot.meta.reportAt = null;
    lot.meta.doneBy = '';
  }
  touchLot(state.lot);
  persist();
  renderLot();
  renderHome();
  if (lot.meta.done) {
    toast(t('toastDone', { lot: state.lot, time: dateTimeVN(lot.meta.doneAt) }), 'ok');
    syncNow('lot_done', state.lot);
  } else {
    toast(t('toastReopened', { lot: state.lot }), 'ok');
    scheduleSync();
  }
}

function summaryNeedsUpdate(key) {
  const lot = DB.lots && DB.lots[key];
  if (!lot || !lot.meta || !lot.meta.done) return false;
  const reported = Date.parse(lot.meta.reportAt || lot.meta.doneAt || '') || 0;
  const edited = Date.parse(lot.updatedAt || '') || 0;
  return edited > reported + 1000;
}
function updateSummaryBanner(key) {
  const el = $('#lotUpdateSummary');
  if (!el) return;
  el.hidden = !summaryNeedsUpdate(key);
}
async function updateSummary() {
  const key = state.lot;
  if (!key) return;
  const lot = ensureLot(key);
  if (!lot.meta.done) return;
  const btn = $('#btnUpdateSummary');
  if (btn) btn.disabled = true;
  const sentAt = new Date().toISOString();
  try {
    const ok = await syncNow('lot_done', key);
    if (ok) {
      lot.meta.reportAt = sentAt;
      persist();
    }
  } finally {
    if (btn) btn.disabled = false;
    if (state.view === 'lot' && state.lot === key) renderLot();
  }
}

function addRow() {
  if (!state.lot) return;
  const lot = ensureLot(state.lot);
  const dir = lotDirs(state.lot) ? (activeDir(state.lot) === 'ALL' ? lotDirs(state.lot)[0] : activeDir(state.lot)) : '';
  const scope = dir ? rowsInDir(state.lot, dir) : lot.rows;
  const hangs = scope.map(r => r.hang).filter(Number.isInteger);
  const next = hangs.length ? Math.max(...hangs) + 1 : 1;
  const row = { uid: uid(), hang: next, dt: null, g: null, plus: null, c: null, k1: null, k2: null, o: null };
  if (dir) row.dir = dir;
  lot.rows.push(row);
  touchLot(state.lot);
  persist();
  rebuildRowsTable();
  refreshLotDerived();
  const tr = $(`#rowsBody tr[data-uid="${CSS.escape(row.uid)}"]`);
  if (tr) { const inp = tr.querySelector('.dt-input'); if (inp) inp.focus(); }
}

function onRowInput(e) {
  const inp = e.target.closest('input[data-field]');
  if (!inp || !state.lot) return;
  const uidVal = inp.dataset.uid;
  const row = lotRows(state.lot).find(r => r.uid === uidVal);
  if (!row) return;
  const field = inp.dataset.field;
  if (field === 'hang') {
    row.hang = inp.value.trim() === '' ? null : parseHang(inp.value);
  } else {
    row[field] = inp.value.trim() === '' ? null : parseNum(inp.value);
  }
  touchLot(state.lot);
  persist();
  refreshLotDerived();
}

function onRowKeydown(e) {
  if (!e.target.matches('input')) return;
  if (e.key === 'Enter') {
    e.preventDefault();
    const inputs = $$('#rowsBody input');
    const idx = inputs.indexOf(e.target);
    if (idx >= 0 && idx < inputs.length - 1) inputs[idx + 1].focus();
    return;
  }
  if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.altKey && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    focusInputStep($$('#rowsBody input'), e.target, e.key === 'ArrowUp' ? -1 : 1);
  }
}

function focusInputStep(list, current, step) {
  const idx = list.indexOf(current);
  const next = idx < 0 ? null : list[idx + step];
  if (!next) return false;
  next.focus();
  return true;
}

function onRowClick(e) {
  const btn = e.target.closest('button[data-act]');
  if (!btn || !state.lot) return;
  const row = lotRows(state.lot).find(r => r.uid === btn.dataset.uid);
  if (!row) return;
  if (btn.dataset.act === 'calc') {
    if (!rowUndo.has(row.uid)) rowUndo.set(row.uid, row.dt == null ? null : Number(row.dt));
    row.dt = rowSum(row);
    touchLot(state.lot);
    persist();
    const tr = $(`#rowsBody tr[data-uid="${CSS.escape(row.uid)}"]`);
    if (tr) {
      const dt = tr.querySelector('.dt-input');
      if (dt) dt.value = row.dt;
      const undo = tr.querySelector('.mini-btn.undo');
      if (undo) undo.hidden = false;
    }
    refreshLotDerived();
  }
  if (btn.dataset.act === 'undo') {
    if (!rowUndo.has(row.uid)) return;
    const prev = rowUndo.get(row.uid);
    rowUndo.delete(row.uid);
    row.dt = prev;
    touchLot(state.lot);
    persist();
    const tr = $(`#rowsBody tr[data-uid="${CSS.escape(row.uid)}"]`);
    if (tr) {
      const dt = tr.querySelector('.dt-input');
      if (dt) dt.value = prev == null ? '' : prev;
    }
    btn.hidden = true;
    refreshLotDerived();
  }
  if (btn.dataset.act === 'del') {
    const hadData = rowHasData(row);
    if (hadData && !confirm(t('confirmDelRow', { h: row.hang ?? '' }))) return;
    const lot = ensureLot(state.lot);
    lot.rows = lot.rows.filter(r => r.uid !== row.uid);
    rowUndo.delete(row.uid);
    if (hadData && !lot.rows.some(rowHasData)) lot.meta.clearedAt = new Date().toISOString();
    touchLot(state.lot);
    persist();
    rebuildRowsTable();
    refreshLotDerived();
  }
}

/* ============================================================
   Nhập nhanh
   ============================================================ */
function readDrafts() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    return d && typeof d === 'object' ? d : {};
  } catch (err) { return {}; }
}
function writeDrafts(map) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(map)); } catch (err) {}
}
function draftKey(key, dir) {
  return dir ? `${key}#${dir}` : key;
}
function clearDraft(key, dir) {
  if (!key) return;
  const map = readDrafts();
  const dk = draftKey(key, dir);
  if (!map[dk]) return;
  delete map[dk];
  writeDrafts(map);
}
function clearAllDrafts() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (err) {}
}
function timeHM(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function quickDraftCards() {
  return $$('#quickPages .qcard').map(card => {
    const vals = {};
    card.querySelectorAll('.q-input').forEach(inp => { vals[inp.dataset.field] = inp.value; });
    return { hang: card.querySelector('.q-hang').value, vals };
  });
}
function saveQuickDraft() {
  const key = state.quickLot;
  if (!key) return;
  const dk = draftKey(key, state.quickDir);
  const map = readDrafts();
  const draft = Object.assign({}, map[dk], {
    zone: state.quickZone || '',
    ngay: $('#quickNgay').value,
    nguoi: $('#quickNguoi').value,
    at: new Date().toISOString(),
  });
  if (state.quickReview) {
    draft.review = { ...state.quickReview, cards: quickDraftCards(), gAuto: state.gAuto };
  } else {
    draft.cards = quickDraftCards();
    draft.gAuto = state.gAuto;
    draft.focus = state.quickFocus;
    delete draft.review;
  }
  map[dk] = draft;
  writeDrafts(map);
}
function fillQuickCards(saved) {
  const cards = $$('#quickPages .qcard');
  (saved || []).slice(0, cards.length).forEach((dc, i) => {
    const card = cards[i];
    if (dc.hang != null) card.querySelector('.q-hang').value = dc.hang;
    FIELDS.forEach(f => {
      card.querySelector(`.q-input[data-field="${f}"]`).value = dc.vals[f] ?? '';
    });
  });
  refreshQuickChecks();
  refreshQuickSummary();
}
function restoreQuickDraft(key) {
  const draft = key && readDrafts()[draftKey(key, state.quickDir)];
  if (!draft) return false;
  if (draft.ngay != null) $('#quickNgay').value = draft.ngay;
  if (draft.nguoi != null) $('#quickNguoi').value = draft.nguoi;
  state.quickFocus = draft.focus || null;
  const gAuto = draft.review ? draft.review.gAuto : draft.gAuto;
  if (gAuto != null) {
    state.gAuto = gAuto;
    try { localStorage.setItem(GAUTO_KEY, state.gAuto ? '1' : '0'); } catch (err) {}
    applyQuickMode();
  }
  if (draft.review) {
    state.quickReview = { start: draft.review.start, original: draft.review.original, metaChanged: draft.review.metaChanged };
    buildQuickCards();
    const rows = state.quickDir ? rowsInDir(key, state.quickDir) : lotRows(key);
    const saved = draft.review.cards.map((card, i) => {
      const row = rows.find(r => r.hang === parseHang(card.hang));
      if (FIELDS.some(f => card.vals[f] !== draft.review.original[i].vals[f])) {
        $$('#quickPages .qcard')[i].dataset.recalculate = 'true';
      }
      return { ...card, vals: Object.fromEntries(FIELDS.map(f => [f,
        card.vals[f] !== draft.review.original[i].vals[f] ? card.vals[f] : String(row?.[f] ?? '')])) };
    });
    state.quickReview.original = draft.review.cards.map(card => {
      const row = rows.find(r => r.hang === parseHang(card.hang));
      return { hang: card.hang, vals: Object.fromEntries(FIELDS.map(f => [f, String(row?.[f] ?? '')])) };
    });
    fillQuickCards(saved);
  } else {
    fillQuickCards(draft.cards);
  }
  return true;
}
function quickSavedSheets() {
  const { filled, start } = quickRowsInfo(state.quickLot, state.quickDir);
  return [...new Set(filled.map(h => start + Math.floor((h - start) / 2) * 2))]
    .sort((a, b) => a - b);
}
function refreshQuickNav() {
  const sheets = quickSavedSheets();
  const review = state.quickReview;
  const index = review ? sheets.indexOf(review.start) : sheets.length;
  $('#btnQuickPrev').disabled = index <= 0;
  $('#btnQuickNext').disabled = !review;
  $('#btnQuickReturn').hidden = !review;
  const pair = quickDraftCards().map(c => c.hang).filter(Boolean).join(', ');
  $('#quickPosition').textContent = qtf(review ? 'reviewing' : 'currentSheet', { list: pair });
  $('#quickNavNote').textContent = qt(review ? 'reviewHint' : 'navHint');
  $('#btnQuickSaveNext').textContent = qt(review ? 'saveReviewNext' : 'saveNext');
}
function focusQuickCard() {
  const focus = !state.quickReview && state.quickFocus;
  const cards = $$('#quickPages .qcard');
  const card = focus && cards[focus.index];
  const input = card && (focus.field === 'hang' ? card.querySelector('.q-hang')
    : [...card.querySelectorAll('.q-input')].find(el => el.dataset.field === focus.field && !el.readOnly));
  (input || $('#quickPages .qcard .dt-input'))?.focus();
}
function showQuickSheet(start) {
  state.quickReview = start == null ? null : { start, original: [] };
  buildQuickCards();
  if (state.quickReview) {
    const rows = state.quickDir ? rowsInDir(state.quickLot, state.quickDir) : lotRows(state.quickLot);
    fillQuickCards([start, start + 1].map(hang => {
      const row = rows.find(r => r.hang === hang);
      return { hang, vals: Object.fromEntries(FIELDS.map(f => [f, row?.[f] ?? ''])) };
    }));
    state.quickReview.original = quickDraftCards();
  } else {
    restoreQuickDraft(state.quickLot);
  }
  saveQuickDraft();
  focusQuickCard();
}
function navigateQuickSheet(target) {
  if (state.quickReview) {
    if (!saveQuick('review')) return;
  } else {
    saveQuickDraft();
  }
  showQuickSheet(target);
}
function stepQuickSheet(step) {
  const sheets = quickSavedSheets();
  const index = state.quickReview ? sheets.indexOf(state.quickReview.start) : sheets.length;
  const next = index + step;
  if (next < 0 || next > sheets.length) return;
  navigateQuickSheet(sheets[next] ?? null);
}

function pickDefaultQuickLot() {
  const keys = lotsKeys();
  const doing = keys.find(k => lotState(k).level === 'doing');
  if (doing) return doing;
  const empty = keys.find(k => lotState(k).level === 'empty');
  return empty || keys[0] || '';
}
function zoneOfLot(key) {
  const f = GEO_BY_LOT.get(key);
  return (f && f.properties.kv) || '';
}
function populateQuickZoneSelect() {
  const used = new Set([...GEO_BY_LOT.values()].map(f => f.properties.kv));
  const zones = ZONE_ORDER.filter(z => used.has(z));
  $('#quickZone').innerHTML = [`<option value="">${esc(qt('zoneAll'))}</option>`]
    .concat(zones.map(z => `<option value="${esc(z)}">${esc(qtf('zoneItem', { z }))}</option>`))
    .join('');
  $('#quickZone').value = state.quickZone;
  return zones;
}
function populateQuickLotSelect(zone) {
  const sel = $('#quickLot');
  const keys = lotsKeys().filter(key => !zone || zoneOfLot(key) === zone);
  sel.innerHTML = keys.map(key => {
    const st = lotState(key);
    const base = BASE_BY_LOT.get(key);
    const suffix = base ? ` · ${base.clone || ''}` : ` · ${qt('lotOther')}`;
    const done = progressLevel(st) === 'done' ? ` · ${qt('lotDone')}` : '';
    return `<option value="${esc(key)}">${esc(key)}${esc(suffix)}${done}</option>`;
  }).join('');
  return keys;
}

function openQuick(fromLot, seed, dir) {
  state.quickFrom = fromLot ? 'lot' : 'home';
  state.quickSeed = fromLot && Number.isInteger(seed) && seed > 0 ? seed : null;
  const sel = $('#quickLot');
  applyQuickLang();
  populateQuickZoneSelect();
  $('#quickZoneWrap').hidden = !!fromLot;
  if (fromLot) {
    state.quickZone = zoneOfLot(state.lot);
    $('#quickZone').value = state.quickZone;
    $('#quickLotWrap').hidden = true;
    sel.value = state.lot;
    state.quickLot = state.lot;
  } else {
    $('#quickLotWrap').hidden = false;
    if (!state.quickLot) state.quickLot = pickDefaultQuickLot();
    const zones = populateQuickZoneSelect();
    if (state.quickZone && !zones.includes(state.quickZone)) state.quickZone = '';
    if (!state.quickZone) state.quickZone = zoneOfLot(state.quickLot);
    populateQuickZoneSelect();
    const keys = populateQuickLotSelect(state.quickZone);
    sel.value = keys.includes(state.quickLot) ? state.quickLot : (keys[0] || '');
    state.quickLot = sel.value;
  }
  setQuickLot(state.quickLot, true, fromLot ? dir : '');
  const dlg = $('#quickDialog');
  if (!dlg.open) dlg.showModal();
  setTimeout(focusQuickCard, 60);
}

function setQuickLot(key, resetHang, dir) {
  if (!key) return;
  state.quickLot = key;
  state.quickReview = null;
  state.quickFocus = null;
  const dirs = lotDirs(key);
  state.quickDir = dirs
    ? (dir && dirs.includes(dir) ? dir : defaultQuickDir(key))
    : '';
  const meta = lotMeta(key);
  $('#quickTitle').textContent = `${qt('title')} · ${qt('lot')} ${key}`;
  $('#quickNgay').value = meta.ngay || todayISO();
  $('#quickNguoi').value = meta.nguoi || '';
  buildQuickCards(resetHang);
  refreshQuickDirBar();
  refreshQuickSummary();
  if (restoreQuickDraft(key)) {
    toast(qtf('draftRestored', { time: timeHM(readDrafts()[draftKey(key, state.quickDir)].at) }), '');
  }
}

function switchQuickDir(dir) {
  if (!state.quickLot || !lotDirs(state.quickLot)) return;
  saveQuickDraft();
  state.quickDir = dir;
  state.quickSeed = null;
  state.quickReview = null;
  state.quickFocus = null;
  buildQuickCards(true);
  refreshQuickDirBar();
  refreshQuickSummary();
  restoreQuickDraft(state.quickLot);
  setTimeout(focusQuickCard, 40);
}

function refreshQuickDirBar() {
  const wrap = $('#quickDirWrap');
  const key = state.quickLot;
  const dirs = key ? lotDirs(key) : null;
  if (!wrap) return;
  if (!dirs) { wrap.hidden = true; return; }
  wrap.hidden = false;
  $('#quickDirBtns').innerHTML = dirs.map(d => {
    const n = rowsInDir(key, d).filter(rowHasData).length;
    return `<button class="dir-chip${state.quickDir === d ? ' is-active' : ''}" type="button" data-qdir="${d}" title="${esc(t('dirChipTitle', { dir: d }))}"><b>${d}</b><span>${n}</span></button>`;
  }).join('');
  const note = $('#quickDirNote');
  if (note) {
    const range = hangRangeText(expectedHangs(key, state.quickDir));
    note.textContent = qtf('dirSwitch', { dir: state.quickDir }) + (range ? ' ' + qtf('dirRange', { range }) : '');
  }
}

function applyQuickMode() {
  $$('#quickDialog [data-gmode]').forEach(btn => {
    btn.setAttribute('aria-pressed', String((btn.dataset.gmode === 'auto') === state.gAuto));
  });
  const note = $('#quickModeNote');
  if (note) note.textContent = qt(state.gAuto ? 'gNote' : 'gManualNote');
  const host = $('#quickPages');
  if (host) host.classList.toggle('auto-g', state.gAuto);
  $$('#quickPages .q-input[data-field="g"]').forEach(inp => {
    inp.readOnly = state.gAuto;
    inp.classList.toggle('q-auto', state.gAuto);
    inp.placeholder = state.gAuto ? qt('autoPh') : '';
    inp.title = state.gAuto ? qt('gNote') : '';
  });
}
function setGAuto(on) {
  state.gAuto = !!on;
  try { localStorage.setItem(GAUTO_KEY, state.gAuto ? '1' : '0'); } catch (err) {}
  applyQuickMode();
  $$('#quickPages .qcard').forEach(card => { card.dataset.recalculate = 'true'; });
  refreshQuickChecks();
  refreshQuickSummary();
  saveQuickDraft();
}
function quickInputsInOrder() {
  const fields = state.gAuto
    ? ['dt', 'plus', 'c', 'k1', 'k2', 'o']
    : ['dt', 'g', 'plus', 'c', 'k1', 'k2', 'o'];
  const list = [];
  $$('#quickPages .qcard').forEach(card => {
    const hang = card.querySelector('.q-hang');
    if (hang && !hang.readOnly) list.push(hang);
    fields.forEach(f => {
      const el = card.querySelector(`.q-input[data-field="${f}"]`);
      if (el) list.push(el);
    });
  });
  return list;
}
function applyQuickLang(lang) {
  if (lang) state.lang = lang === 'km' ? 'km' : 'vi';
  const dlg = $('#quickDialog');
  dlg.classList.toggle('lang-km', state.lang === 'km');
  $$('[data-quicklang]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.quicklang === state.lang));
  });
  $$('#quickDialog [data-qk]').forEach(el => {
    el.textContent = qt(el.dataset.qk);
  });
  $$('#quickDialog [data-qk-placeholder]').forEach(el => {
    el.placeholder = qt(el.dataset.qkPlaceholder);
  });
  $$('#quickDialog [data-qk-aria]').forEach(el => {
    el.setAttribute('aria-label', qt(el.dataset.qkAria));
  });
  $('#quickHint').innerHTML = qt('hint');
  $('#btnQuickSave').textContent = qt('save');
  $('#btnQuickSaveNext').textContent = qt('saveNext');
  $('#quickEyebrow').textContent = qt('eyebrow');
  applyQuickMode();
  if (state.quickLot) {
    $('#quickTitle').textContent = `${qt('title')} · ${qt('lot')} ${state.quickLot}`;
  } else {
    $('#quickTitle').textContent = qt('title');
  }
  if ($('#quickPages').childElementCount) {
    $$('#quickPages .qcard').forEach(card => {
      const hangLab = card.querySelector('.q-hang-i18n');
      if (hangLab) hangLab.textContent = qt('hangNo') + ' ';
      const tt = card.querySelector('.q-tt');
      if (tt) tt.textContent = qt('totalDT');
    });
    refreshQuickChecks();
    refreshQuickDirBar();
    refreshQuickSummary();
  }
}

function syncLanguageUi() {
  document.documentElement.lang = state.lang;
  document.body.classList.toggle('lang-km', state.lang === 'km');
  document.title = t('appTitle');
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  $$('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  const langSub = $('#menuLangSub');
  if (langSub) langSub.textContent = t(state.lang === 'km' ? 'langKm' : 'langVi');
  const langBtn = $('#btnLangToggle');
  if (langBtn) {
    langBtn.textContent = state.lang === 'km' ? t('langToVi') : t('langToKm');
    langBtn.setAttribute('aria-label', state.lang === 'km' ? t('langToggleAriaVi') : t('langToggleAriaKm'));
    langBtn.title = langBtn.getAttribute('aria-label');
  }
  applyQuickLang();
  updateSyncUi();
}

function setLang(lang) {
  state.lang = lang === 'km' ? 'km' : 'vi';
  state.langChosen = true;
  try {
    localStorage.setItem(LANG_KEY, state.lang);
    localStorage.setItem(QUICK_LANG_KEY, state.lang);
  } catch (err) {}
  const dlg = $('#langDialog');
  if (dlg && dlg.open) dlg.close();
  syncLanguageUi();
  if (state.view === 'home') renderHome();
  else if (state.lot) renderLot();
  if (state.view === 'home' && state.homeView === 'map' && mapCtx) refreshMap();
  const detailDlg = $('#detailDialog');
  if (detailDlg && detailDlg.open && state.remoteDetail) {
    fillDetailLotSelect();
    renderDetailLot();
  }
  const notiDlg = $('#notiDialog');
  if (notiDlg && notiDlg.open) {
    updateNotiChrome();
    renderNotiList();
    if (historyTab === 'history') renderHistory();
  }
  refreshNotiUi();
}

function maybePromptName() {
  const dlg = $('#nameDialog');
  if (!dlg || dlg.open || userName()) return;
  const langDlg = $('#langDialog');
  if (langDlg && langDlg.open) return;
  const input = $('#nameInput');
  const save = $('#btnNameSave');
  const err = $('#nameError');
  input.value = '';
  save.disabled = true;
  if (err) err.hidden = true;
  dlg.showModal();
  setTimeout(() => input.focus(), 50);
}

function saveUserName() {
  const input = $('#nameInput');
  if (!input) return;
  const name = input.value.replace(/\s+/g, ' ').trim().slice(0, 40);
  const err = $('#nameError');
  if (!name) {
    if (err) err.hidden = false;
    input.focus();
    return;
  }
  saveSyncCfg({ device: name });
  const dlg = $('#nameDialog');
  if (dlg && dlg.open) dlg.close();
  toast(t('nameSaved', { name }), 'ok');
  if (DB.updatedAt) scheduleSync();
}

function buildQuickCards() {
  const key = state.quickLot;
  const [h1, h2] = state.quickReview ? [state.quickReview.start, state.quickReview.start + 1]
    : quickHangPair(key, state.quickSeed, state.quickDir);
  $('#quickPages').innerHTML = [h1, h2].map((hang, i) => `
    <div class="qcard" data-idx="${i}">
      <div class="qcard-head">
        <div class="qhang"><span class="q-hang-i18n">${esc(qt('hangNo') + ' ')}</span><input class="q-hang" type="number" inputmode="numeric" min="1" step="1" value="${hang}" ${state.quickReview ? 'readonly' : ''} aria-label="${esc(qt('hangNo'))}"></div>
        <button class="mini-btn calc" type="button" data-act="qcalc" title="Tổng ĐT = G + (+) + C + K1 + K2 + O">=</button>
      </div>
      <div class="qgrid">
        <label class="qdt"><span class="q-tt">${esc(qt('totalDT'))}</span><input class="q-input dt-input" type="number" inputmode="numeric" min="0" step="1" data-field="dt" aria-label="${esc(qt('totalDT'))}"></label>
        <label class="q-cell-g">G<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="g" aria-label="Cây cạo"></label>
        <label>+<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="plus" aria-label="Cây cộng"></label>
        <label>C<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="c" aria-label="Cây C"></label>
        <label>K1<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="k1" aria-label="Cây K1"></label>
        <label>K2<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="k2" aria-label="Cây K2"></label>
        <label>O<input class="q-input" type="number" inputmode="numeric" min="0" step="1" data-field="o" aria-label="Hố trống"></label>
      </div>
      <div class="qcheck idle" data-role="check">${esc(qt('checkIdle'))}</div>
    </div>`).join('');
  applyQuickMode();
  refreshQuickChecks();
  refreshQuickDirBar();
  refreshQuickSummary();
}

function readQuickCard(card) {
  const hang = parseHang(card.querySelector('.q-hang').value);
  const vals = {};
  card.querySelectorAll('.q-input').forEach(inp => {
    vals[inp.dataset.field] = inp.value.trim() === '' ? null : parseNum(inp.value);
  });
  // Viewing saved rows must not silently recalculate G, including existing discrepancies.
  if (state.gAuto && (!state.quickReview || card.dataset.recalculate === 'true')) {
    const gEl = card.querySelector('.q-input[data-field="g"]');
    if (vals.dt != null) {
      const others = ['plus', 'c', 'k1', 'k2', 'o'].reduce((s, k) => s + (vals[k] || 0), 0);
      vals.g = vals.dt - others;
    } else {
      vals.g = null;
    }
    if (gEl) {
      gEl.value = vals.g == null ? '' : String(vals.g);
      gEl.classList.toggle('neg', vals.g != null && vals.g < 0);
    }
  }
  const has = FIELDS.some(k => vals[k] != null);
  const sum = FIELDS.filter(k => k !== 'dt').reduce((s, k) => s + (vals[k] || 0), 0);
  const dt = vals.dt;
  return { hang, vals, has, sum, dt, diff: dt == null ? null : dt - sum };
}

function refreshQuickChecks() {
  $$('#quickPages .qcard').forEach(card => {
    const r = readQuickCard(card);
    const check = card.querySelector('[data-role="check"]');
    const dtInput = card.querySelector('.dt-input');
    dtInput.classList.remove('bad');
    if (!r.has) {
      check.className = 'qcheck idle';
      check.innerHTML = esc(qt('checkIdle'));
    } else if (r.dt == null) {
      check.className = 'qcheck bad';
      check.innerHTML = `<span class="qc-text">${esc(qt('checkMissing'))}</span><span>${esc(qt('checkSum6'))}: ${fmt(r.sum)}</span>`;
      dtInput.classList.add('bad');
    } else if (r.diff !== 0) {
      check.className = 'qcheck bad';
      check.innerHTML = `<span class="qc-text">${esc(qt('checkDiff'))} ${signed(r.diff)}</span><span>${esc(qt('checkSum6'))}: ${fmt(r.sum)}</span>`;
      dtInput.classList.add('bad');
    } else {
      check.className = 'qcheck ok';
      check.innerHTML = `<span class="qc-text">${esc(qt('checkOk'))}</span><span>${fmt(r.dt)} ${esc(qt('unitTree'))}</span>`;
    }
  });
}

function renderQuickProgress() {
  const host = $('#quickProgress');
  if (!host) return;
  const key = state.quickLot;
  if (!key) { host.innerHTML = ''; return; }
  const { filled, gaps, start, known, continuous, expected } = quickRowsInfo(key, state.quickDir);
  const pair = $$('#quickPages .qcard').map(c => readQuickCard(c).hang).filter(Number.isInteger);
  const bits = [];
  if (!filled.length) {
    bits.push(`<span>${esc(qt('progressNone'))}</span>`);
    if (pair.length) bits.push(`<span class="qp-next">${esc(qtf('progressStart', { h: pair[0] }))}</span>`);
  } else {
    bits.push(`<span>${esc(qtf('progressEntered', { n: filled.length }))}</span>`);
    bits.push(gaps.length
      ? `<span class="qp-gap">${esc(qtf('progressMissing', { list: gaps.slice(0, 10).join(', ') + (gaps.length > 10 ? '…' : '') }))}</span>`
      : known && !continuous
        ? `<span class="qp-ok">${esc(qtf('progressComplete', { n: expected.length }))}</span>`
        : `<span class="qp-ok">${esc(qtf('progressContinuous', { a: start, b: Math.max(...filled) }))}</span>`);
    if (pair.length) bits.push(`<span class="qp-next">${esc(qtf(state.quickReview ? 'reviewing' : 'progressEntering', { list: pair.join(', ') }))}</span>`);
  }
  host.innerHTML = bits.join('');
}

function refreshQuickSummary() {
  const key = state.quickLot;
  if (!key) return;
  const dir = state.quickDir;
  const cards = $$('#quickPages .qcard').map(readQuickCard);
  const enteredCards = cards.filter(c => c.has);
  const ref = ref2026(key);
  const allRows = lotRows(key);
  const existing = aggregate(allRows);
  const replacedHangs = new Set(enteredCards.map(c => c.hang).filter(h => h != null));
  const replacedSum = allRows
    .filter(r => rowHasData(r) && replacedHangs.has(r.hang) && (!dir || rowDir(key, r) === dir))
    .reduce((s, r) => s + (Number(r.dt) || 0), 0);
  const addSum = enteredCards.reduce((s, c) => s + (c.dt || 0), 0);
  const projected = existing.dt - replacedSum + addSum;
  let html = dir ? `<span>${esc(qt('dirLabel'))}: <b>${esc(dir)}</b></span>` : '';
  html += `<span>${esc(qt('sheetThis'))}: <b>${fmt(addSum)}</b> ${esc(qt('unitTree'))}</span><span>${esc(qt('lotAfter'))}: <b>${fmt(projected)}</b> ${esc(qt('unitTree'))}</span>`;
  if (ref) {
    const d = projected - ref.total;
    html += `<span>2026: <b>${fmt(ref.total)}</b></span><span>${esc(qt('diffLabel'))}: <b style="color:${d === 0 ? 'var(--green)' : 'var(--red)'}">${signed(d)}</b></span>`;
  }
  html += `<span class="muted">${enteredCards.length}/2 ${esc(qt('rowsWithData'))}</span>`;
  $('#quickSummary').innerHTML = html;
  renderQuickProgress();
  refreshQuickNav();
}

function focusNextQuickInput(current) {
  const inputs = quickInputsInOrder();
  const idx = inputs.indexOf(current);
  if (idx >= 0 && idx < inputs.length - 1) inputs[idx + 1].focus();
}

function saveQuick(mode) {
  const advance = mode === 'next';
  const pause = mode === 'pause';
  const review = state.quickReview;
  const key = state.quickLot;
  if (!key) return false;
  const lot = ensureLot(key);
  const dir = state.quickDir || '';
  const cards = $$('#quickPages .qcard').map(readQuickCard);
  const rawCards = quickDraftCards();
  const entries = [];
  const errors = [];
  const mismatches = [];
  cards.forEach((c, i) => {
    if (review && JSON.stringify(rawCards[i]) === JSON.stringify(review.original[i])) return;
    if (!c.has) {
      if (review) errors.push(qt('errEmptySheet'));
      return;
    }
    if (c.hang == null) { errors.push(qtf('errNoHang', { n: i + 1 })); return; }
    if (c.dt == null) mismatches.push(qtf('warnMissing', { h: c.hang, sum: fmt(c.sum) }));
    else if (c.diff !== 0) mismatches.push(qtf('warnDiff', { h: c.hang, dt: fmt(c.dt), diff: signed(c.diff) }));
    entries.push({ hang: c.hang, vals: c.vals });
  });
  if (errors.length) { alert(errors.join('\n')); return false; }
  if (!entries.length && !review) { toast(qt('errEmptySheet'), 'bad'); return false; }
  const hset = new Set(entries.map(e => e.hang));
  if (hset.size !== entries.length) { alert(qt('warnDup')); return false; }
  const dirRows = dir ? rowsInDir(key, dir) : lot.rows;
  const existingHangs = new Set(dirRows.map(r => r.hang).filter(Number.isInteger));
  const replacing = entries.filter(e => existingHangs.has(e.hang)).map(e => e.hang);
  if (replacing.length && !confirm(qtf('confirmOverwrite', { h: replacing.join(', ') }))) return false;
  if (mismatches.length && !confirm(qtf('confirmMismatch', { list: mismatches.join('\n') }))) return false;

  if (entries.length || pause || (review ? Object.keys(review.metaChanged || {}).length : (
    lot.meta.ngay !== $('#quickNgay').value || lot.meta.nguoi !== $('#quickNguoi').value.trim()))) {
    if (!review || review.metaChanged?.ngay) lot.meta.ngay = $('#quickNgay').value || '';
    if (!review || review.metaChanged?.nguoi) lot.meta.nguoi = $('#quickNguoi').value.trim();
    if (pause) lot.meta.pausedAt = new Date().toISOString();
    else if (advance) lot.meta.pausedAt = null;
    entries.forEach(entry => {
      const old = dirRows.find(r => r.hang === entry.hang);
      if (old) {
        FIELDS.forEach(k => { old[k] = entry.vals[k]; });
        if (dir) old.dir = dir;
      } else {
        const row = {
          uid: uid(), hang: entry.hang,
          dt: entry.vals.dt, g: entry.vals.g, plus: entry.vals.plus,
          c: entry.vals.c, k1: entry.vals.k1, k2: entry.vals.k2, o: entry.vals.o,
        };
        if (dir) row.dir = dir;
        lot.rows.push(row);
      }
    });
    touchLot(key);
    persist();
    renderHome();
    if (state.view === 'lot' && state.lot === key) renderLot();
  }
  if (review) {
    const drafts = readDrafts();
    delete drafts[draftKey(key, dir)].review;
    writeDrafts(drafts);
  } else {
    clearDraft(key, dir);
  }
  if (pause) {
    state.recentLot = key;
    renderHome();
    const draft = readDrafts()[draftKey(key, dir)];
    const h = parseHang(draft?.cards?.[0]?.hang) || resumeHang(key, dir || undefined);
    toast(qtf('pausedSaved', { lot: key, h }), 'ok');
  } else if (entries.length) {
    toast(qtf('savedRows', { h: entries.map(e => e.hang).join(', ') }), 'ok');
  }
  if (mode === 'review') return true;
  if (review) {
    showQuickSheet(null);
  } else {
    state.quickSeed = null;
    state.quickFocus = null;
    if (advance) {
      buildQuickCards();
      saveQuickDraft();
      setTimeout(focusQuickCard, 40);
    }
  }
  if (!advance) {
    $('#quickDialog').close();
    if (pause && state.quickFrom === 'home') {
      setHomeView('list');
      setTimeout(() => {
        const row = $('#lotList .lot-row.is-recent');
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }
  }
  return true;
}

/* ============================================================
   Xuất Excel
   ============================================================ */
function setNumberFormat(ws, decimalsByCol) {
  if (!ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (!cell || typeof cell.v !== 'number') continue;
      if (decimalsByCol && Object.prototype.hasOwnProperty.call(decimalsByCol, C)) {
        cell.z = decimalsByCol[C];
      } else {
        cell.z = '#,##0';
      }
    }
  }
}
function makeSheet(aoa, merges, widths, decimalsByCol) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (merges) ws['!merges'] = merges.map(r => XLSX.utils.decode_range(r));
  if (widths) ws['!cols'] = widths.map(w => ({ wch: w }));
  setNumberFormat(ws, decimalsByCol);
  return ws;
}
function safeSheetName(name) {
  return name.replace(/[\\/?*[\]:]/g, '').slice(0, 31);
}
const XL_BORDER = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
};
function xlCell(ws, r, c) {
  const addr = XLSX.utils.encode_cell({ r, c });
  if (!ws[addr]) ws[addr] = { t: 's', v: '' };
  return ws[addr];
}
function xlStyleRow(ws, r, c0, c1, style) {
  for (let c = c0; c <= c1; c++) {
    const cell = xlCell(ws, r, c);
    cell.s = Object.assign({}, cell.s || {}, style);
  }
}
function xlFormula(ws, r, c, f, v) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr] || {};
  cell.t = typeof v === 'number' ? 'n' : 'str';
  cell.f = f;
  cell.v = v == null ? '' : v;
  cell.z = cell.z || '#,##0';
  ws[addr] = cell;
}
function styleLotSheet(ws, maxHang, lastCol = 7) {
  const center = { horizontal: 'center', vertical: 'center' };
  const headerRow = 4;
  const firstData = 5;
  const totalRow = firstData + maxHang;
  xlCell(ws, 1, 0).s = {
    font: { name: 'Times New Roman', sz: 14, bold: true, color: { rgb: '000000' } },
    alignment: center,
  };
  xlCell(ws, 2, 0).s = {
    font: { name: 'Times New Roman', sz: 14, bold: true, color: { rgb: '000000' } },
    alignment: center,
  };
  xlCell(ws, 3, 0).s = {
    font: { name: 'Times New Roman', sz: 10, italic: true, color: { rgb: '404040' } },
    alignment: center,
  };
  xlStyleRow(ws, headerRow, 0, lastCol, {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: center,
    border: XL_BORDER,
  });
  for (let r = firstData; r < totalRow; r++) {
    xlStyleRow(ws, r, 0, lastCol, {
      font: { name: 'Calibri', sz: 11, color: { rgb: '000000' } },
      alignment: center,
      border: XL_BORDER,
    });
  }
  xlStyleRow(ws, totalRow, 0, lastCol, {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: center,
    border: XL_BORDER,
  });
  ws['!rows'] = [];
  ws['!rows'][1] = { hpt: 17.4 };
  ws['!rows'][2] = { hpt: 17.4 };
  ws['!rows'][3] = { hpt: 16 };
  ws['!margins'] = { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 };
}
function downloadWorkbook(wb, filename) {
  try {
    XLSX.writeFile(wb, filename, { compression: true, cellStyles: true });
    toast(t('toastExportOk', { file: filename }), 'ok');
  } catch (err) {
    toast(t('toastExportFail', { err: err.message }), 'bad');
  }
}

/* Thư viện xlsx không ghi được hướng giấy: xuất zip không nén rồi chèn
   pageSetup + sheetPr vào XML của sheet đầu tiên để in khổ ngang. */
const ZIP_CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();
function zipCrc32(u8) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = ZIP_CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function xlsxLandscape(bytes) {
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = [];
  let off = 0;
  while (off + 30 <= bytes.length && dv.getUint32(off, true) === 0x04034b50) {
    const flags = dv.getUint16(off + 6, true);
    const method = dv.getUint16(off + 8, true);
    const nlen = dv.getUint16(off + 26, true);
    const elen = dv.getUint16(off + 28, true);
    if (flags & 8) throw new Error('zip data descriptor');
    const nameBytes = bytes.subarray(off + 30, off + 30 + nlen);
    const extra = bytes.subarray(off + 30 + nlen, off + 30 + nlen + elen);
    const start = off + 30 + nlen + elen;
    const csize = dv.getUint32(off + 18, true);
    const entry = {
      flags,
      method,
      time: dv.getUint16(off + 10, true),
      date: dv.getUint16(off + 12, true),
      crc: dv.getUint32(off + 14, true),
      csize,
      usize: dv.getUint32(off + 22, true),
      nameBytes,
      extra,
      data: bytes.subarray(start, start + csize),
    };
    if (dec.decode(nameBytes) === 'xl/worksheets/sheet1.xml') {
      if (method !== 0) throw new Error('sheet xml is compressed');
      let xml = dec.decode(entry.data);
      if (xml.indexOf('<pageSetup ') === -1) {
        const pageSetup = '<pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/>';
        xml = /<pageMargins[^>]*\/>/.test(xml)
          ? xml.replace(/(<pageMargins[^>]*\/>)/, '$1' + pageSetup)
          : xml.replace('</worksheet>', pageSetup + '</worksheet>');
        if (xml.indexOf('<sheetPr') === -1) {
          const open = xml.match(/<worksheet[^>]*>/);
          if (open) xml = xml.replace(open[0], open[0] + '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
        }
      }
      entry.data = enc.encode(xml);
      entry.method = 0;
      entry.crc = zipCrc32(entry.data);
      entry.csize = entry.usize = entry.data.length;
    }
    entries.push(entry);
    off = start + csize;
  }
  if (!entries.length) throw new Error('empty zip');
  const locals = [];
  const central = [];
  let offset = 0;
  entries.forEach(e => {
    const lh = new Uint8Array(30 + e.nameBytes.length + e.extra.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, e.flags, true);
    lv.setUint16(8, e.method, true);
    lv.setUint16(10, e.time, true);
    lv.setUint16(12, e.date, true);
    lv.setUint32(14, e.crc, true);
    lv.setUint32(18, e.csize, true);
    lv.setUint32(22, e.usize, true);
    lv.setUint16(26, e.nameBytes.length, true);
    lv.setUint16(28, e.extra.length, true);
    lh.set(e.nameBytes, 30);
    lh.set(e.extra, 30 + e.nameBytes.length);
    locals.push(lh, e.data);
    const ch = new Uint8Array(46 + e.nameBytes.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, e.flags, true);
    cv.setUint16(10, e.method, true);
    cv.setUint16(12, e.time, true);
    cv.setUint16(14, e.date, true);
    cv.setUint32(16, e.crc, true);
    cv.setUint32(20, e.csize, true);
    cv.setUint32(24, e.usize, true);
    cv.setUint16(28, e.nameBytes.length, true);
    cv.setUint32(42, offset, true);
    ch.set(e.nameBytes, 46);
    central.push(ch);
    offset += lh.length + e.data.length;
  });
  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const parts = locals.concat(central, [eocd]);
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  parts.forEach(p => { out.set(p, pos); pos += p.length; });
  return out;
}
function downloadLandscapeWorkbook(wb, filename) {
  try {
    const raw = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: false, cellStyles: true }));
    const blob = new Blob([xlsxLandscape(raw)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast(t('toastExportOk', { file: filename }), 'ok');
  } catch (err) {
    downloadWorkbook(wb, filename);
  }
}

function buildLotSheet(key, meta, rows, agg, dirLabel, refMap) {
  const sorted = rows.filter(rowHasData).slice().sort((a, b) => (a.hang || 0) - (b.hang || 0));
  const map = new Map(sorted.map(r => [r.hang, r]));
  const maxHang = Math.max(84, ...sorted.map(r => r.hang || 0));
  const lastCol = refMap ? 9 : 7;
  const aoa = [];
  aoa.push([]);
  aoa.push(['BẢNG TỔNG HỢP KẾT QUẢ KIỂM KÊ']);
  aoa.push([`LÔ : ${key}    ${dirLabel || `Hướng lô: ${meta.huong || '…'}`}    Ngày KK: ${dateVN(meta.ngay)}    Người KK: ${meta.nguoi || '…'}`]);
  aoa.push([`Trạng thái: ${meta.done ? 'Hoàn tất' : 'Đang nhập'} · ${sorted.length} hàng · ${fmt(agg.dt)} cây${refMap ? ' · phúc tra theo file 2026 gốc' : ''}`]);
  aoa.push(['Hàng', 'Tổng điểm trồng', 'Cây cạo', 'Cây +', 'Cây C', 'Cây K1', 'Cây K2', 'Hố trống']
    .concat(refMap ? ['Phúc tra 2026', 'Lệch'] : []));
  for (let h = 1; h <= maxHang; h++) {
    const r = map.get(h);
    const vals = r
      ? [h, r.dt != null ? r.dt : 0, r.g != null ? r.g : 0, r.plus != null ? r.plus : 0, r.c != null ? r.c : 0, r.k1 != null ? r.k1 : 0, r.k2 != null ? r.k2 : 0, r.o != null ? r.o : 0]
      : [h, null, 0, null, null, null, null, null];
    if (refMap) {
      const ref = refMap[String(h)];
      const known = Number.isFinite(ref);
      vals.push(known ? ref : null,
        known && r && r.dt != null ? (Number(r.dt) || 0) - ref : null);
    }
    aoa.push(vals);
  }
  const totalRow = ['Tổng', agg.dt, agg.g, agg.plus, agg.c, agg.k1, agg.k2, agg.o];
  if (refMap) {
    const refSum = Object.values(refMap).reduce((s, v) => s + (Number(v) || 0), 0);
    totalRow.push(refSum, (Number(agg.dt) || 0) - refSum);
  }
  aoa.push(totalRow);

  const span = XLSX.utils.encode_col(lastCol);
  const ws = makeSheet(aoa, [`A2:${span}2`, `A3:${span}3`, `A4:${span}4`],
    [8.5, 14.73, 13, 10, 10, 10, 10, 12].concat(refMap ? [13, 10] : []));
  styleLotSheet(ws, maxHang, lastCol);
  for (let h = 1; h <= maxHang; h++) {
    const r = map.get(h);
    const rowNo = h + 5;
    const g = r
      ? (Number(r.dt) || 0) - ['plus', 'c', 'k1', 'k2', 'o'].reduce((s, k) => s + (Number(r[k]) || 0), 0)
      : '';
    xlFormula(ws, h + 4, 2, `IF(B${rowNo}="","",B${rowNo}-SUM(D${rowNo}:H${rowNo}))`, g);
    if (refMap) {
      const ref = refMap[String(h)];
      const diff = r && r.dt != null && Number.isFinite(ref) ? (Number(r.dt) || 0) - ref : '';
      xlFormula(ws, h + 4, 9, `IF(OR(B${rowNo}="",I${rowNo}=""),"",B${rowNo}-I${rowNo})`, diff);
    }
  }
  const sumNo = maxHang + 6;
  xlFormula(ws, maxHang + 5, 2, `B${sumNo}-SUM(D${sumNo}:H${sumNo})`,
    (Number(agg.dt) || 0) - ['plus', 'c', 'k1', 'k2', 'o'].reduce((s, k) => s + (Number(agg[k]) || 0), 0));
  return ws;
}

function exportLot(key) {
  if (!key) return;
  if (!lotState(key).entered.length) { toast(t('toastNoExportData'), 'bad'); return; }
  if (!lotMeta(key).done && !confirm(t('exportConfirm'))) return;
  const wb = buildLotWorkbook(key);
  if (!wb) return;
  downloadWorkbook(wb, `KK2027_Lo_${key.replace(/[^\w\-]+/g, '_')}.xlsx`);
}

function mergeDirRows(rows) {
  const map = new Map();
  rows.filter(r => Number.isInteger(r.hang)).forEach(r => {
    let m = map.get(r.hang);
    if (!m) {
      m = { hang: r.hang, uid: `ghep-${r.hang}`, _merged: true };
      map.set(r.hang, m);
    }
    FIELDS.forEach(k => {
      if (r[k] != null) m[k] = (m[k] || 0) + (Number(r[k]) || 0);
    });
  });
  return [...map.values()].sort((a, b) => a.hang - b.hang);
}

function buildLotWorkbook(key) {
  const st = lotState(key);
  if (!st.entered.length) return null;
  const { rows, agg, meta, base } = st;
  const dirs = lotDirs(key);
  const wb = XLSX.utils.book_new();
  if (dirs) {
    dirs.forEach(dir => {
      const dr = rows.filter(r => rowDir(key, r) === dir);
      if (!dr.length) return;
      const dAgg = aggregate(dr);
      const ws = buildLotSheet(key, meta, dr, dAgg, `Hướng: ${dir}`);
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName(`Lô ${key} ${dir}`));
    });
    const merged = mergeDirRows(rows);
    if (merged.length) {
      const refMap = mergedRefMap(key);
      const wsGhep = buildLotSheet(key, meta, merged, agg,
        `Đã ghép ${dirs.length} hướng ${dirs.join('+')} · cộng lại thành 1 lô${refMap ? ' · phúc tra theo file 2026 gốc' : ''}`,
        refMap);
      XLSX.utils.book_append_sheet(wb, wsGhep, safeSheetName(`Lô ${key} ghép`));
    }
  } else {
    const ws = buildLotSheet(key, meta, rows, agg, '');
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName('Lô ' + key));
  }

  const ref = ref2026(key) || base;
  const cmp = [
    ['ĐỐI CHIẾU VỚI KIỂM KÊ 0H NGÀY 01/01/2026'],
    [`Lô ${key}${dirs ? ` (cộng cả ${dirs.length} hướng)` : ''}`],
    [],
    ['Chỉ tiêu', '2026', '2027', 'Lệch'],
    ['Tổng điểm trồng', ref ? ref.total : '', agg.dt, ref ? agg.dt - ref.total : ''],
    ['Cây cạo (G)', ref ? ref.g : '', agg.g, ref ? agg.g - ref.g : ''],
    ['Cây +', ref ? ref.plus : '', agg.plus, ref ? agg.plus - ref.plus : ''],
    ['Cây C', ref ? ref.c : '', agg.c, ref ? agg.c - ref.c : ''],
    ['Cây K1', ref ? ref.k1 : '', agg.k1, ref ? agg.k1 - ref.k1 : ''],
    ['Cây K2', ref ? ref.k2 : '', agg.k2, ref ? agg.k2 - ref.k2 : ''],
    ['Hố trống (O)', ref ? ref.o : '', agg.o, ref ? agg.o - ref.o : ''],
    [],
    ['CẢNH BÁO'],
  ];
  if (mergedRefMap(key)) {
    cmp.push(['Nguồn 2026', 'Theo tổng lô ở file 2026 gốc (phúc tra); hướng A/B chỉ tham khảo.']);
  } else if (ref && ref.detail && base && Number(base.total) !== Number(ref.total)) {
    cmp.push(['Nguồn 2026', `Theo bảng chi tiết (phúc tra); bảng tổng hợp ghi ${base.total} cây.`]);
  }
  const issues = st.issues;
  const dups = st.dups;
  const ptIssues = st.ptIssues;
  const tag = x => (x.dir ? `Hướng ${x.dir} · ` : x.merged ? 'Ghép A/B · ' : '');
  if (!issues.length && !dups.length && !ptIssues.length) {
    cmp.push(['Không có lỗi tổng hàng hoặc hàng trùng.']);
  } else {
    issues.forEach(x => cmp.push([`${tag(x)}Hàng ${x.row.hang ?? '?'}`, issueTextVN(x.row)]));
    if (dups.length) cmp.push(['Hàng trùng', dupsLabel(dups)]);
    ptIssues.forEach(x => cmp.push([
      `${tag(x)}Phúc tra hàng ${x.row.hang ?? '?'}`,
      `2026: ${x.pt.ref} · 2027: ${x.row.dt} · lệch ${signed(x.pt.diff)} (≥2 cây — cần kiểm tra lại)`,
    ]));
  }
  if (base && base.mismatch && !(ref && ref.detail)) cmp.push(['Baseline 2026', `File gốc tự lệch ${base.mismatch} cây giữa tổng và 6 cột.`]);
  if (ref && ref.detail && ref.mismatch) cmp.push(['Bảng chi tiết 2026', `Tự lệch ${ref.mismatch} cây giữa tổng và 6 cột (6 cột cộng ${ref.sum}).`]);
  const ws2 = makeSheet(cmp, ['A1:D1'], [22, 16, 16, 16]);
  const gCalc = (Number(agg.dt) || 0) - ['plus', 'c', 'k1', 'k2', 'o'].reduce((s, k) => s + (Number(agg[k]) || 0), 0);
  xlFormula(ws2, 5, 2, 'C5-SUM(C7:C11)', gCalc);
  if (ref) xlFormula(ws2, 5, 3, 'C6-B6', gCalc - (Number(ref.g) || 0));
  XLSX.utils.book_append_sheet(wb, ws2, 'Đối chiếu 2026');
  return wb;
}

function exportAll() {
  const keys = lotsKeys();
  let any = false;
  const summary = [
    ['VƯƠNG QUỐC CAMPUCHIA', '', '', '', '', '', '', '', 'Dân tộc - Tôn giáo - Quốc vương', '', '', '', '', '', ''],
    ['CRCK2 APHIVATH', '', '', '', '', '', '', '', `Kampong Thom, ngày ${todayVNText()}`, '', '', '', '', '', ''],
    ['CAOUTCHOUC CO.,LTD', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Đội sản xuất số 2', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    [],
    ['BẢNG TỔNG HỢP KẾT QUẢ KIỂM KÊ VƯỜN CÂY 0H NGÀY 01/01/2027', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['(Đính kèm thông báo số: …/TB-CRCK ngày …/…/2026)', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    [],
    ['STT', 'ID lô', 'Đội', 'Lô', 'Năm trồng', 'Tuổi cạo', 'Giống', 'Diện tích (ha)', 'Tổng số cây KK', 'Cây cạo 1.1.2027 (cây G)', 'Cây cạo 1.5.2027 (cây +)', 'Cây chưa cạo 2027 (cây C)', 'Cây KMC 2027 (cây K1)', 'Cây không phát triển 2027 (cây K2)', 'Hố trống 2027 (O)'],
  ];
  const total = { area: 0, dt: 0, g: 0, plus: 0, c: 0, k1: 0, k2: 0, o: 0 };
  keys.forEach((key, idx) => {
    const base = BASE_BY_LOT.get(key);
    const st = lotState(key);
    const has = st.entered.length > 0;
    if (has) any = true;
    const age = base && base.age != null ? base.age + 1 : '';
    summary.push([
      idx + 1,
      base ? base.id : '',
      base ? base.doi : 2,
      key,
      base ? base.year : '',
      age,
      base ? base.clone : '',
      base ? base.area : '',
      has ? st.agg.dt : '',
      has ? st.agg.g : '',
      has ? st.agg.plus : '',
      has ? st.agg.c : '',
      has ? st.agg.k1 : '',
      has ? st.agg.k2 : '',
      has ? st.agg.o : '',
    ]);
    if (base) total.area += Number(base.area) || 0;
    if (has) {
      total.dt += st.agg.dt; total.g += st.agg.g; total.plus += st.agg.plus;
      total.c += st.agg.c; total.k1 += st.agg.k1; total.k2 += st.agg.k2; total.o += st.agg.o;
    }
  });
  summary.push(['Tổng cộng', '', '', '', '', '', '', total.area, total.dt, total.g, total.plus, total.c, total.k1, total.k2, total.o]);
  summary.push([]);
  summary.push(['LẬP BIỂU', '', '', '', '', '', '', '', '', 'ĐỘI TRƯỞNG', '', '', '', '', '']);

  if (!any) { toast(t('toastNoExportAll'), 'bad'); return; }

  const ws = makeSheet(
    summary,
    ['A1:H1', 'I1:O1', 'A2:H2', 'I2:O2', 'A3:H3', 'A6:O6', 'A7:O7'],
    [6, 20, 6, 9, 10, 8, 10, 11, 14, 15, 14, 15, 15, 17, 13],
    { 7: '#,##0.00' }
  );
  keys.forEach((key, idx) => {
    const st = lotState(key);
    const rowNo = 10 + idx;
    const g = st.entered.length
      ? st.agg.dt - (st.agg.plus + st.agg.c + st.agg.k1 + st.agg.k2 + st.agg.o)
      : '';
    xlFormula(ws, 9 + idx, 9, `IF(I${rowNo}="","",I${rowNo}-SUM(K${rowNo}:O${rowNo}))`, g);
  });
  const totalNo = 10 + keys.length;
  xlFormula(ws, 9 + keys.length, 9, `I${totalNo}-SUM(K${totalNo}:O${totalNo})`,
    total.dt - (total.plus + total.c + total.k1 + total.k2 + total.o));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tổng hợp');

  const check = [['STT', 'Lô', 'Mức độ', 'Nội dung', '2026', '2027', 'Lệch']];
  let checkNo = 0;
  keys.forEach(key => {
    const st = lotState(key);
    if (!st.entered.length) return;
    const r = st.ref || st.base;
    st.issues.forEach(x => {
      checkNo += 1;
      const dirTag = x.dir ? `Hướng ${x.dir} · ` : '';
      check.push([checkNo, key, 'Lỗi', `${dirTag}Hàng ${x.row.hang ?? '?'}: ${issueTextVN(x.row)}`, r ? r.total : '', st.agg.dt, r ? st.agg.dt - r.total : '']);
    });
    st.dups.forEach(h => {
      checkNo += 1;
      check.push([checkNo, key, 'Lỗi', `Hàng trùng số ${dupsLabel([h])}`, r ? r.total : '', st.agg.dt, r ? st.agg.dt - r.total : '']);
    });
    st.ptIssues.forEach(x => {
      checkNo += 1;
      const dirTag = x.dir ? `Hướng ${x.dir} · ` : '';
      check.push([checkNo, key, 'Phúc tra', `${dirTag}Hàng ${x.row.hang ?? '?'}: 2026 ${x.pt.ref} · 2027 ${x.row.dt} · lệch ${signed(x.pt.diff)} (≥2 cây — cần kiểm tra lại)`, x.pt.ref, x.row.dt, x.pt.diff]);
    });
    if (r && st.delta !== 0 && st.delta !== null) {
      checkNo += 1;
      check.push([checkNo, key, st.meta.done ? 'Cảnh báo' : 'Tạm tính', `Tổng 2027 lệch 2026 ${signed(st.delta)} cây (${pct(st.delta, r.total)})`, r.total, st.agg.dt, st.delta]);
    }
    if (st.base && st.base.mismatch && !(st.ref && st.ref.detail)) {
      checkNo += 1;
      check.push([checkNo, key, 'Baseline', `File 2026 tự lệch ${signed(st.base.mismatch)} cây giữa tổng và 6 cột`, st.base.total, st.agg.dt, st.delta]);
    }
    if (!st.meta.done) {
      checkNo += 1;
      check.push([checkNo, key, 'Thông tin', 'Chưa đánh dấu hoàn tất', r ? r.total : '', st.agg.dt, r ? st.agg.dt - r.total : '']);
    }
  });
  if (check.length === 1) check.push([1, '', '', 'Không có cảnh báo', '', '', '']);
  const wsCheck = makeSheet(check, null, [6, 9, 12, 60, 12, 12, 12]);
  XLSX.utils.book_append_sheet(wb, wsCheck, 'Kiểm tra');

  const progress = [['STT', 'Lô', 'ID lô', 'Đội', 'Diện tích (ha)', 'Số hàng đã nhập', 'Tổng ĐT 2027', 'Tổng 2026', 'Lệch', '% lệch', 'Hoàn tất', 'Hoàn tất lúc', 'Trạng thái', 'Lỗi hàng', 'Phúc tra lệch']];
  keys.forEach((key, idx) => {
    const st = lotState(key);
    const base = st.base;
    const r = st.ref;
    const has = st.entered.length > 0;
    const delta = r && has ? st.agg.dt - r.total : '';
    const ratio = r && has && r.total ? (st.agg.dt - r.total) / r.total : '';
    progress.push([
      idx + 1, key, base ? base.id : '', base ? base.doi : 2, base ? base.area : '',
      st.entered.length, has ? st.agg.dt : '', r ? r.total : '',
      delta, ratio, st.meta.done ? 'Có' : 'Không',
      st.meta.done && st.meta.doneAt ? dateTimeVN(st.meta.doneAt) : '',
      statusInfo(st).label, st.issues.length + st.dups.length, st.ptIssues.length,
    ]);
  });
  const wsProgress = makeSheet(progress, null, [6, 9, 20, 6, 11, 12, 14, 12, 10, 9, 9, 18, 15, 9, 11], { 4: '#,##0.00', 9: '0.00%' });
  XLSX.utils.book_append_sheet(wb, wsProgress, 'Tiến độ');

  downloadWorkbook(wb, `KK2027_TongHop_D2_${todayISO().replace(/-/g, '')}.xlsx`);
}

/* Biểu tổng hợp theo mẫu "2. BIỂU MẪU DÃ NGOẠI VÀ TỔNG HỢP KIỂM KÊ" */
function exportSummaryForm() {
  const keys = lotsKeys().filter(key => lotMeta(key).done)
    .sort((a, b) => ((BASE_BY_LOT.get(a) || {}).stt || 9999) - ((BASE_BY_LOT.get(b) || {}).stt || 9999));
  if (!keys.length) { toast(t('toastNoDoneLots'), 'bad'); return; }
  const now = new Date();
  const dateLine = `Kampong Thom, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  const headers = [
    'STT', 'ID lô', 'Đội', 'Lô', 'Năm trồng', 'Tuổi cạo', 'Giống', 'Diện tích (ha)', 'Tổng số cây KK',
    'Cây cạo 1.1.2027\n(cây G)', 'Cây cạo 1.5.2027\n(cây +)', 'Cây chưa cạo 2027\n(cây C)',
    'Cây KMC 2027\n(cây K1)', 'Cây không phát triển 2027\n(cây K2)', 'Hố trống 2027\n(O)',
  ];
  const aoa = [];
  aoa[0] = [null, null, null, null, null, null, null, null, 'VƯƠNG QUỐC CAMPUCHIA'];
  aoa[1] = [null, null, 'CRCK2 APHIVATH', null, null, null, null, null, 'Dân tộc - Tôn giáo - Quốc vương'];
  aoa[2] = [null, null, 'CAOUTCHOUC CO.,LTD', null, null, null, null, null, dateLine];
  aoa[3] = [null, null, 'Đội sản xuất số 2'];
  aoa[5] = [null, 'BẢNG TỔNG HỢP KẾT QUẢ KIỂM KÊ VƯỜN CÂY 0H NGÀY 01/01/2027'];
  aoa[6] = [null, '(Đính kèm thông báo số: …/TB-CRCK ngày …/…/2026)'];
  aoa[8] = headers;
  const total = { area: 0, dt: 0, g: 0, plus: 0, c: 0, k1: 0, k2: 0, o: 0 };
  const n = keys.length;
  keys.forEach((key, idx) => {
    const base = BASE_BY_LOT.get(key);
    const agg = lotState(key).agg;
    const age = base && base.age != null ? base.age + 1 : '';
    aoa.push([
      idx + 1,
      base ? base.id : '',
      base ? base.doi : 2,
      key,
      base ? base.year : '',
      age,
      base ? base.clone : '',
      base ? base.area : '',
      agg.dt, agg.g, agg.plus, agg.c, agg.k1, agg.k2, agg.o,
    ]);
    if (base) total.area += Number(base.area) || 0;
    total.dt += agg.dt; total.g += agg.g; total.plus += agg.plus;
    total.c += agg.c; total.k1 += agg.k1; total.k2 += agg.k2; total.o += agg.o;
  });
  const totalExcel = 10 + n;
  const signRow = 13 + n;
  aoa.push(['Tổng cộng', null, null, null, null, null, null, total.area, total.dt, total.g, total.plus, total.c, total.k1, total.k2, total.o]);
  aoa.push([]);
  aoa.push([]);
  aoa.push([null, null, 'LẬP BIỂU', null, null, null, null, null, null, null, null, 'ĐỘI TRƯỞNG']);

  const ws = makeSheet(
    aoa,
    ['I1:N1', 'I2:N2', 'I3:N3', 'B6:O6', 'B7:O7', `A${totalExcel}:G${totalExcel}`, `C${signRow}:E${signRow}`, `L${signRow}:N${signRow}`],
    [4.16, 16.5, 6, 4.5, 6, 6.16, 7.83, 9],
    { 7: '#,##0.00' }
  );
  const cols = ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
  const totals = [total.area, total.dt, total.g, total.plus, total.c, total.k1, total.k2, total.o];
  cols.forEach((col, i) => {
    xlFormula(ws, 9 + n, 7 + i, `SUM(${col}10:${col}${totalExcel - 1})`, totals[i]);
  });
  ws[XLSX.utils.encode_cell({ r: 9 + n, c: 7 })].z = '#,##0.00';
  keys.forEach((key, i) => {
    const agg = lotState(key).agg;
    xlFormula(ws, 9 + i, 8, `SUM(J${10 + i}:O${10 + i})`, agg.dt);
    for (let c = 9; c <= 14; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 9 + i, c })];
      if (cell && cell.t === 'n') cell.z = '#,##0';
    }
  });

  const TNR = (sz, bold, italic) => ({ name: 'Times New Roman', sz: sz || 11, bold: !!bold, italic: !!italic, color: { rgb: '000000' } });
  const center = { horizontal: 'center', vertical: 'center' };
  xlCell(ws, 5, 1).s = { font: TNR(12, true), alignment: center };
  xlCell(ws, 6, 1).s = { font: TNR(11, false, true), alignment: { horizontal: 'center' } };
  xlCell(ws, 0, 8).s = { font: TNR(11, true), alignment: { horizontal: 'center' } };
  xlCell(ws, 1, 8).s = { font: TNR(11, true), alignment: { horizontal: 'center' } };
  xlCell(ws, 2, 8).s = { font: TNR(11, false, true), alignment: { horizontal: 'center' } };
  xlCell(ws, 1, 2).s = { font: TNR(11, true), alignment: { horizontal: 'center' } };
  xlCell(ws, 2, 2).s = { font: TNR(11, true), alignment: { horizontal: 'center' } };
  xlCell(ws, 3, 2).s = { font: TNR(11), alignment: { horizontal: 'center' } };
  xlStyleRow(ws, 8, 0, 14, { font: TNR(11, true), alignment: { ...center, wrapText: true }, border: XL_BORDER });
  for (let i = 0; i <= n; i++) {
    xlStyleRow(ws, 9 + i, 0, 14, { font: TNR(11, i === n), alignment: center, border: XL_BORDER });
  }
  xlStyleRow(ws, 9 + n, 8, 14, { font: TNR(11, true), alignment: center, border: XL_BORDER });
  xlCell(ws, 12 + n, 2).s = { font: TNR(11, true), alignment: center };
  xlCell(ws, 12 + n, 11).s = { font: TNR(11, true), alignment: center };
  ws['!rows'] = [];
  ws['!rows'][5] = { hpt: 19.5 };
  ws['!rows'][6] = { hpt: 14.25 };
  ws['!rows'][8] = { hpt: 90 };
  ws['!rows'][9 + n] = { hpt: 18 };
  ws['!margins'] = { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Biểu tổng hợp');
  downloadLandscapeWorkbook(wb, `KK2027_BieuTongHop_D2_${todayISO().replace(/-/g, '')}.xlsx`);
}

/* ============================================================
   Sao lưu / phục hồi / demo
   ============================================================ */
function backupJSON() {
  const payload = {
    app: 'crck2-kiem-ke-2027',
    version: 1,
    exportedAt: new Date().toISOString(),
    baselineYear: 2026,
    data: DB,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `KK2027_backup_${todayISO().replace(/-/g, '')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast(t('backupOk'), 'ok');
}
function restoreJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const data = parsed && parsed.data && parsed.data.lots ? parsed.data : parsed;
      if (!data || typeof data !== 'object' || !data.lots || typeof data.lots !== 'object') {
        throw new Error(t('restoreBadFile'));
      }
      if (!confirm(t('restoreConfirm'))) return;
      DB = { version: 1, lots: data.lots, updatedAt: data.updatedAt || new Date().toISOString() };
      migrateFirstEntry(true);
      clearAllDrafts();
      persist();
      renderHome();
      if (state.view === 'lot') renderLot();
      toast(t('restoreOk'), 'ok');
    } catch (err) {
      alert(t('restoreFail', { err: err.message }));
    }
  };
  reader.readAsText(file, 'utf-8');
}
function demoLot250() {
  const key = '250';
  const lot = ensureLot(key);
  if (lot.rows.some(rowHasData) && !confirm(t('demoConfirm'))) return;
  const demo = [
    { hang: 1, dt: 165, g: 123, plus: 0, c: 0, k1: 32, k2: 6, o: 4 },
    { hang: 2, dt: 161, g: 130, plus: 1, c: 0, k1: 26, k2: 3, o: 1 },
  ];
  demo.forEach(v => {
    const old = lot.rows.find(r => r.hang === v.hang);
    if (old) Object.assign(old, v);
    else lot.rows.push({ uid: uid(), ...v });
  });
  lot.meta.ngay = '2026-11-14';
  lot.meta.nguoi = 'Duy';
  lot.meta.huong = 'ĐN';
  persist();
  renderHome();
  openLot(key);
  toast(t('demoDone'), 'ok');
}
function resetAll() {
  if (!confirm(t('resetConfirm'))) return;
  const typed = prompt(t('resetPrompt'));
  if (typed !== 'XOA') { toast(t('resetCancel'), ''); return; }
  DB = emptyDB();
  clearAllDrafts();
  persist();
  renderHome();
  if (state.view === 'lot') openHome(false);
  toast(t('resetDone'), 'ok');
}

/* ============================================================
   Đồng bộ Google Sheets + mail báo cáo
   ============================================================ */
function buildSyncPayload(reason, lotKey) {
  const keys = lotsKeys();
  const lots = keys.map(key => {
    const st = lotState(key);
    const f = GEO_BY_LOT.get(key);
    return {
      lot: key,
      id: st.base ? st.base.id : '',
      doi: st.base ? st.base.doi : 2,
      kv: f ? f.properties.kv : '',
      area: st.base ? st.base.area : '',
      clone: st.base ? st.base.clone : '',
      year: st.base ? st.base.year : '',
      status: st.level,
      statusLabel: statusLabelVN(st),
      entered: st.entered.length,
      dt: st.entered.length ? st.agg.dt : null,
      baseTotal: st.ref ? st.ref.total : (st.base ? st.base.total : null),
      delta: st.ref && st.entered.length ? st.delta : null,
      done: !!st.meta.done,
      doneAt: st.meta.doneAt || null,
      doneBy: st.meta.doneBy || '',
      updatedAt: (DB.lots[key] && DB.lots[key].updatedAt) || st.meta.doneAt || null,
      clearedAt: st.meta.clearedAt || null,
      nguoi: st.meta.nguoi || '',
      ngay: st.meta.ngay || '',
      huong: st.meta.huong || '',
      dirs: lotDirs(key),
      dirSummary: st.dirStates ? st.dirStates.map(d => ({ dir: d.dir, entered: d.entered.length, dt: d.entered.length ? d.agg.dt : null })) : null,
      ghiChu: st.meta.ghiChu || '',
      rows: st.entered.map(r => {
        const pt = phucTraOf(key, r);
        return {
          uid: r.uid, hang: r.hang, dir: r.dir || '',
          dt: r.dt, g: r.g, plus: r.plus, c: r.c, k1: r.k1, k2: r.k2, o: r.o,
          pt: pt ? pt.ref : null, pd: pt ? pt.diff : null,
        };
      }),
    };
  });
  const entered = lots.filter(l => l.entered > 0).length;
  const done = lots.filter(l => l.done).length;
  const warn = lots.filter(l => l.status === 'warn').length;
  const rows = lots.reduce((s, l) => s + l.entered, 0);
  const dt = lots.reduce((s, l) => s + (l.dt || 0), 0);
  const baselineTotal = BASELINE.reduce((s, l) => s + (l.total || 0), 0);
  const zones = ZONE_ORDER.map(kv => {
    const s = zoneStats(kv);
    return {
      kv, total: s.total, done: s.done.length, doing: s.doing.length,
      warn: s.warn.length, empty: s.empty.length,
      emptyLots: s.empty, warnLots: s.warn,
    };
  });
  const eventLot = reason === 'lot_done' && lotKey ? lots.find(l => l.lot === lotKey) : null;
  if (eventLot) {
    // Đính kèm file KK lô (theo mẫu Xuất Excel lô) để mail gửi về tổng hợp.
    try {
      const wb = buildLotWorkbook(lotKey);
      if (wb) {
        const data = XLSX.write(wb, { type: 'base64', bookType: 'xlsx', compression: true, cellStyles: true });
        if (data && data.length < 8 * 1024 * 1024) {
          eventLot.attachment = {
            name: `KK2027_Lo_${String(lotKey).replace(/[^\w\-]+/g, '_')}.xlsx`,
            data,
          };
        }
      }
    } catch (err) {}
  }
  return {
    app: 'crck2-kiem-ke-2027',
    version: 3,
    device: (syncCfg.device || '').trim(),
    sentAt: new Date().toISOString(),
    today: todayISO(),
    reason,
    event: eventLot ? { type: 'lot_done', lot: eventLot.lot, label: eventLot.statusLabel } : null,
    totals: { entered, done, warn, rows, dt, baselineTotal, delta: dt - baselineTotal },
    zones,
    lots,
  };
}

async function postSync(payload) {
  const url = syncCfg.url.trim();
  if (!url) throw new Error('Chưa cấu hình URL Apps Script.');
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  };
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    if (err && err.name === 'TypeError' && navigator.onLine !== false) {
      // CORS chặn đọc phản hồi: request vẫn có thể đã tới Apps Script.
      // Không gửi lại để tránh trùng mail.
      return { ok: true, uncertain: true };
    }
    throw err;
  }
  if (!res.ok) throw new Error(t('syncHttpError', { code: res.status }));
  let data = null;
  try { data = await res.json(); } catch (err) {}
  if (data && data.ok === false) throw new Error(data.error || t('syncAppError', { err: '' }));
  return data || { ok: true };
}

function updateSyncUi(message) {
  const status = $('#syncStatus');
  const sub = $('#menuSyncSub');
  const connected = !!syncCfg.url;
  if (sub) {
    sub.textContent = !connected
      ? t('syncStatusNone')
      : syncCfg.lastSyncAt
        ? t('syncStatusConnected', { time: dateTimeVN(syncCfg.lastSyncAt) })
        : t('syncStatusConfigured');
  }
  if (!status) return;
  if (message) {
    status.textContent = message;
    status.className = 'sync-status busy';
    return;
  }
  status.className = 'sync-status' + (syncCfg.lastResult.startsWith('Lỗi') ? ' bad' : connected ? ' ok' : '');
  if (!connected) {
    status.textContent = t('syncStatusHelp');
  } else if (syncCfg.lastSyncAt) {
    status.textContent = `${t('syncLast', { time: dateTimeVN(syncCfg.lastSyncAt) })} · ${syncCfg.lastResult || 'OK'}`;
  } else {
    status.textContent = t('syncStatusNotSynced');
  }
}

function scheduleSync() {
  if (!syncCfg.url || !syncCfg.enabled) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncNow('auto'), 5000);
}

async function syncNow(reason = 'manual', lotKey = null) {
  if (!syncCfg.url) {
    if (reason !== 'auto') {
      toast(t('syncNoUrl'), 'bad');
    }
    return false;
  }
  if (reason === 'auto' && !syncCfg.enabled) return false;
  if (syncBusy) {
    if (reason !== 'auto') {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => syncNow(reason, lotKey), 1500);
    }
    return false;
  }
  clearTimeout(syncTimer);
  syncBusy = true;
  updateSyncUi(t('syncSending'));
  try {
    const payload = buildSyncPayload(reason, lotKey);
    const res = await postSync(payload);
    saveSyncCfg({
      lastSyncAt: new Date().toISOString(),
      lastResult: res && res.uncertain
        ? t('syncNoResponse')
        : res && res.sheetUrl ? 'OK · ' + res.sheetUrl : 'OK',
    });
    if (res && res.uncertain) {
      toast(t('syncNoResponseToast'), '');
      return true;
    }
    if (reason === 'test') {
      toast(res && res.mail ? t('syncTestOkMail') : t('syncTestOkSheet'), 'ok');
    } else if (reason === 'lot_done') {
      toast(res && res.mail ? t('syncLotMail', { lot: lotKey }) : t('syncLotSheet', { lot: lotKey }), 'ok');
    } else if (reason === 'manual') {
      toast(res && res.sheetUrl ? t('syncOkUrl') : t('syncOk'), 'ok');
    }
    return true;
  } catch (err) {
    saveSyncCfg({ lastResult: 'Lỗi: ' + err.message });
    if (reason !== 'auto') toast(t('syncErrorToast', { err: err.message }), 'bad');
    else if (/bận|busy/i.test(err.message || '')) setTimeout(() => syncNow('auto'), 10000);
    return false;
  } finally {
    syncBusy = false;
    updateSyncUi();
  }
}

function openSyncDialog() {
  const dlg = $('#syncDialog');
  if (!dlg) return;
  $('#syncUrl').value = syncCfg.url || '';
  const deviceEl = $('#syncDevice');
  if (deviceEl) deviceEl.value = syncCfg.device || '';
  $('#syncEnabled').checked = syncCfg.enabled;
  updateSyncUi();
  updateRemoteUi();
  dlg.showModal();
}

let remoteBusy = false;
let remoteFetched = !!(state.remote && state.remote.at);
function remoteCounts() {
  let doing = 0;
  let done = 0;
  Object.keys(state.remote.lots || {}).forEach(key => {
    const r = state.remote.lots[key];
    if (!r || (!r.done && !(r.entered > 0))) return;
    if (r.done) done += 1;
    else doing += 1;
  });
  return { doing, done };
}
function updateRemoteUi(message) {
  const el = $('#remoteStatus');
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.className = 'sync-status busy';
    return;
  }
  const c = remoteCounts();
  if (!c.doing && !c.done) {
    el.textContent = remoteFetched ? t('remoteEmpty') : t('remoteNone');
    el.className = remoteFetched ? 'sync-status ok' : 'sync-status';
    refreshNotiUi();
    return;
  }
  el.textContent = t('remoteSummary', {
    doing: c.doing,
    done: c.done,
    time: state.remote.at ? dateTimeVN(state.remote.at) : '—',
  });
  el.className = 'sync-status ok';
  refreshNotiUi();
}
async function pullRemote(manual) {
  if (!syncCfg.url) {
    if (manual) toast(t('syncNoUrl'), 'bad');
    updateRemoteUi();
    return;
  }
  if (remoteBusy) return;
  remoteBusy = true;
  if (manual) updateRemoteUi(t('remotePulling'));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const u = syncCfg.url.trim();
    const res = await fetch(u + (u.indexOf('?') >= 0 ? '&' : '?') + 'action=progress', {
      redirect: 'follow',
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(t('syncHttpError', { code: res.status }));
    const data = await res.json();
    if (!data || data.ok === false) throw new Error((data && data.error) || t('syncAppError', { err: '' }));
    if (!Array.isArray(data.lots)) throw new Error(t('remoteOldScript'));
    const lots = {};
    (data.lots || []).forEach(l => {
      if (!l || !l.lot) return;
      const entered = Number(l.entered) || 0;
      const done = !!l.done;
      if (!entered && !done) return;
      lots[l.lot] = {
        status: l.status === 'done' || l.status === 'doing' || l.status === 'warn' ? l.status : (done ? 'done' : 'doing'),
        kv: l.kv || '',
        entered,
        done,
        dt: l.dt == null ? null : Number(l.dt),
        delta: l.delta == null ? null : Number(l.delta),
        doneAt: l.doneAt || '',
        nguoi: l.nguoi || '',
        updatedAt: l.updatedAt || '',
        updatedAtDisplay: l.updatedAtDisplay || '',
      };
    });
    state.remote = { at: data.atIso || data.at || new Date().toISOString(), lots };
    remoteFetched = true;
    try { localStorage.setItem(REMOTE_KEY, JSON.stringify(state.remote)); } catch (err) {}
    if (mapCtx) {
      applyZoneStyles();
      renderZones();
    }
    if (manual) toast(t('remotePulled', { n: Object.keys(lots).length }), 'ok');
  } catch (err) {
    if (manual) toast(t('remotePullFail', { err: err.message }), 'bad');
  } finally {
    clearTimeout(timer);
    remoteBusy = false;
    updateRemoteUi();
  }
}

const NOTI_KEY = 'crck2.kk2027.noti.v1';
function readNotiSeen() {
  try {
    const d = JSON.parse(localStorage.getItem(NOTI_KEY) || '{}');
    return d && typeof d === 'object' ? d : {};
  } catch (err) { return {}; }
}
let notiSeen = readNotiSeen();
function saveNotiSeen(map) {
  try { localStorage.setItem(NOTI_KEY, JSON.stringify(map)); } catch (err) {}
}
function sameLocalDay(iso, now) {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime())
    && d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}
function notiItems() {
  const remote = (state.remote && state.remote.lots) || {};
  const now = new Date();
  const items = [];
  Object.keys(remote).forEach(key => {
    const r = remote[key];
    if (!r || !(Number(r.entered) > 0) || !r.updatedAt) return;
    if (!sameLocalDay(r.updatedAt, now)) return;
    const local = DB.lots[key];
    if (local && local.updatedAt === r.updatedAt) return;
    items.push({
      key, kv: r.kv || '', nguoi: r.nguoi || '', at: r.updatedAt,
      entered: Number(r.entered) || 0, dt: r.dt, status: r.status, done: !!r.done,
      unread: notiSeen[key] !== r.updatedAt,
    });
  });
  items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return items;
}
function refreshNotiUi() {
  const btn = $('#btnNoti');
  if (!btn) return;
  const show = !!syncCfg.url;
  btn.hidden = !show;
  if (!show) return;
  const n = notiItems().filter(x => x.unread).length;
  const badge = $('#notiBadge');
  if (badge) {
    badge.hidden = n === 0;
    badge.textContent = n > 9 ? '9+' : String(n);
  }
  btn.classList.toggle('has-unread', n > 0);
  const label = n ? `${t('notiAria')} (${n})` : t('notiAria');
  btn.setAttribute('aria-label', label);
  btn.title = label;
}
function renderNotiList() {
  const host = $('#notiList');
  if (!host) return;
  const items = notiItems();
  if (!items.length) {
    const msg = state.remote && state.remote.at ? t('notiEmpty') : t('notiNotSynced');
    host.innerHTML = `<p class="noti-empty">${esc(msg)}</p>`;
    return;
  }
  host.innerHTML = items.map(it => {
    const stateText = it.done ? t('notiStatusDone') : (it.status === 'warn' ? t('notiStatusWarn') : t('notiStatusDoing'));
    const stateCls = it.done ? 'st-done' : (it.status === 'warn' ? 'st-warn' : 'st-doing');
    const meta = [`${esc(it.nguoi || '—')} · ${timeHM(it.at)}`, t('notiRows', { n: fmt(it.entered) })];
    if (it.dt != null) meta.push(`${fmt(it.dt)} ${esc(t('notiTree'))}`);
    return `<button class="noti-item${it.unread ? ' is-new' : ''}" type="button" data-noti-lot="${esc(it.key)}">
      <span class="noti-item-main">
        <span class="noti-lot">${esc(t('notiLot', { lot: it.key }))}${it.kv ? `<span class="noti-kv">${esc(it.kv)}</span>` : ''}${it.unread ? `<span class="noti-new">${esc(t('notiNew'))}</span>` : ''}</span>
        <span class="noti-sub">${meta.join(' · ')}</span>
      </span>
      <span class="noti-state ${stateCls}">${esc(stateText)}</span>
    </button>`;
  }).join('');
}
function markNotiSeen() {
  const items = notiItems();
  if (!items.length) return;
  const map = Object.assign({}, notiSeen);
  items.forEach(it => { map[it.key] = it.at; });
  notiSeen = map;
  saveNotiSeen(map);
}

/* Thống kê người nhập lô đầu tiên */
// Lô nhập trước bản 69 không lưu người nhập: lấy máy ghi lô sớm nhất trong Nhật ký.
const HISTORY_STATS_DAYS = 365;
function historyEntryLots(e) {
  const out = [];
  if (e.lot != null && String(e.lot).trim()) out.push(String(e.lot).trim());
  String(e.changed || '').split(',').map(s => s.trim()).filter(Boolean).forEach(s => out.push(s));
  return out;
}
let entrantsFromHistory = { ref: null, map: new Map() };
function historyEntrants() {
  const entries = statsHistory.entries;
  if (entrantsFromHistory.ref === entries) return entrantsFromHistory.map;
  const map = new Map();
  entries.forEach(e => {
    const name = String(e.device || e.nguoi || '').trim();
    const stamp = historyStamp(e.at);
    if (!name || !stamp) return;
    historyEntryLots(e).forEach(key => {
      const cur = map.get(key);
      if (!cur || stamp < cur.stamp) map.set(key, { name, stamp });
    });
  });
  entrantsFromHistory = { ref: entries, map };
  return map;
}
function entrantName(key, meta) {
  const m = meta || lotMeta(key);
  if (m.firstBy && m.firstBy !== UNKNOWN_ENTRANT) return m.firstBy;
  const h = historyEntrants().get(String(key));
  if (h) return h.name;
  return (m.nguoi || '').trim() || UNKNOWN_ENTRANT;
}
// Nhật ký riêng cho thống kê (1 năm), không đụng bộ lọc ngày của hộp Nhật ký.
let statsHistory = { at: '', entries: [], error: '' };
let statsHistoryBusy = false;
async function loadStatsHistory(force) {
  if (statsHistoryBusy) return;
  const u = syncCfg.url.trim();
  if (!u) return;
  if (!force && statsHistory.at) return;
  statsHistoryBusy = true;
  renderStats();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const url = u + (u.indexOf('?') >= 0 ? '&' : '?') + 'action=history&days=' + HISTORY_STATS_DAYS;
    const res = await fetch(url, { redirect: 'follow', cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error(t('syncHttpError', { code: res.status }));
    const data = await res.json();
    if (!data || data.ok === false) throw new Error((data && data.error) || t('syncAppError', { err: '' }));
    if (!Array.isArray(data.entries)) throw new Error(t('remoteOldScript'));
    statsHistory = { at: data.at || '', entries: data.entries, error: '' };
  } catch (err) {
    statsHistory = { at: '', entries: [], error: err.message };
  } finally {
    clearTimeout(timer);
    statsHistoryBusy = false;
    renderStats();
  }
}
function statsGroups() {
  const groups = new Map();
  const add = (name, item) => {
    const label = (name || '').trim() || UNKNOWN_ENTRANT;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  };
  lotsKeys().forEach(key => {
    const st = lotState(key);
    if (!st.entered.length) return;
    const f = GEO_BY_LOT.get(key);
    add(entrantName(key, st.meta), {
      key, kv: f ? f.properties.kv : '', level: st.level, dt: st.agg.dt,
      rows: st.entered.length,
      at: st.meta.firstAt || (DB.lots[key] && DB.lots[key].updatedAt) || null,
      remote: false,
    });
  });
  // Lô chỉ có trên Google (máy này chưa nhập) vẫn tính cho người nhập trên máy kia.
  const rem = (state.remote && state.remote.lots) || {};
  Object.keys(rem).forEach(key => {
    const local = DB.lots[key];
    if (local && lotRows(key).some(rowHasData)) return;
    const r = rem[key];
    if (!r || !(Number(r.entered) > 0)) return;
    const h = historyEntrants().get(String(key));
    add(String(r.nguoi || '').trim() || (h && h.name), {
      key, kv: r.kv || '', level: r.done ? 'done' : (r.status === 'warn' ? 'warn' : 'doing'),
      dt: r.dt == null ? null : Number(r.dt), rows: Number(r.entered) || 0,
      at: r.updatedAt || null, atLabel: r.updatedAtDisplay || '', remote: true,
    });
  });
  return [...groups.entries()].map(([name, items]) => ({
    name,
    items: items.sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))),
  })).sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name));
}
function renderStats() {
  const host = $('#statsPeople');
  const sumHost = $('#statsSummary');
  if (!host || !sumHost) return;
  const refreshBtn = $('#btnStatsRefresh');
  if (refreshBtn) refreshBtn.hidden = !syncCfg.url;
  const groups = statsGroups();
  const lots = groups.reduce((s, g) => s + g.items.length, 0);
  const trees = groups.reduce((s, g) => s + g.items.reduce((a, it) => a + (Number(it.dt) || 0), 0), 0);
  sumHost.innerHTML = [
    t('statsTotalPeople', { n: fmt(groups.length) }),
    t('statsTotalLots', { n: fmt(lots) }),
    t('statsTotalTrees', { n: fmt(trees) }),
  ].map(x => `<span class="stats-pill">${esc(x)}</span>`).join('');
  const noteEl = $('#statsNote');
  if (noteEl) {
    const note = statsHistoryBusy ? t('statsLoadingHistory')
      : (statsHistory.error ? t('statsHistoryError', { err: statsHistory.error }) : '');
    noteEl.hidden = !note;
    noteEl.textContent = note;
    noteEl.classList.toggle('bad', !!statsHistory.error);
  }
  if (!groups.length) {
    host.innerHTML = `<p class="noti-empty">${esc(t('statsEmpty'))}</p>`;
    return;
  }
  host.innerHTML = groups.map(g => {
    const nameLabel = g.name === UNKNOWN_ENTRANT ? t('statsUnknown') : g.name;
    const chips = g.items.map(it => {
      const when = it.at ? dateTimeVN(it.at) : (it.atLabel || '');
      const tip = [t('notiRows', { n: fmt(it.rows) })];
      if (it.dt != null) tip.push(`${fmt(it.dt)} ${t('notiTree')}`);
      if (when) tip.push(when);
      tip.push(it.level === 'done' ? t('notiStatusDone') : (it.level === 'warn' ? t('notiStatusWarn') : t('notiStatusDoing')));
      return `<span class="stats-lot" title="${esc(tip.join(' · '))}">
        ${esc(t('notiLot', { lot: it.key }))}${it.kv ? `<span class="noti-kv">${esc(it.kv)}</span>` : ''}${it.remote ? `<span class="noti-kv">${esc(t('statsFromSheet'))}</span>` : ''}
      </span>`;
    }).join('');
    return `<div class="stats-person">
      <div class="stats-row"><span class="stats-name">${esc(nameLabel)}</span><span class="stats-nums">${esc(`${fmt(g.items.length)} ${t('statsLotUnit')}`)}</span></div>
      <div class="stats-lots">${chips}</div>
    </div>`;
  }).join('');
}
function openStatsDialog() {
  renderStats();
  const dlg = $('#statsDialog');
  if (dlg && !dlg.open) dlg.showModal();
  loadStatsHistory(false);
  pullRemote(false).then(renderStats).catch(() => {});
}
function openNoti() {
  const dlg = $('#notiDialog');
  if (!dlg) return;
  renderNotiList();
  markNotiSeen();
  refreshNotiUi();
  setNotiTab(historyTab);
  if (!dlg.open) dlg.showModal();
  if (historyTab === 'today') {
    pullRemote(false).then(() => {
      if (!dlg.open || historyTab !== 'today') return;
      renderNotiList();
      markNotiSeen();
      refreshNotiUi();
    });
  }
}

/* ============================================================
   Lịch sử đồng bộ (tab Nhật ký)
   ============================================================ */
let historyTab = 'today';
let historyDays = 30;
let historyDevice = '';
let historyBusy = false;
let historyData = { at: '', entries: [], error: '' };
const REASON_KM = {
  'Đồng bộ tay': 'ធ្វើសមកាលដោយដៃ',
  'Tự động': 'ស្វ័យប្រវត្តិ',
  'Lô hoàn tất': 'ដីឡូតិ៍រួចរាល់',
  'Kiểm tra kết nối': 'ពិនិត្យការភ្ជាប់',
};

function historyReasonLabel(reason) {
  const r = String(reason || '');
  return state.lang === 'km' ? (REASON_KM[r] || r) : r;
}

function historyTime(at) {
  const m = String(at || '').match(/(\d{2}):(\d{2})/);
  return m ? m[1] + ':' + m[2] : String(at || '—');
}

function historyMinutes(at) {
  const m = String(at || '').match(/(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

function historyStamp(at) {
  const m = String(at || '').match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return 0;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0)).getTime();
}

function historyMergeRun(prev, e) {
  prev.runs += 1;
  prev.fromAt = e.at;
  prev.edits = (Number(prev.edits) || 0) + (Number(e.edits) || 0);
  const lots = new Map();
  (prev.editLots || []).concat(e.editLots || []).forEach(x => {
    const k = String(x.lot);
    const old = lots.get(k);
    lots.set(k, { lot: x.lot, n: (old ? old.n : 0) + (Number(x.n) || 0) });
  });
  prev.editLots = [...lots.values()].sort((a, b) => b.n - a.n).slice(0, 8);
  const devs = prev.editDevices || [];
  (e.editDevices || []).forEach(d => { if (d && !devs.includes(d)) devs.push(d); });
  prev.editDevices = devs.slice(0, 4);
  const changed = new Map();
  (String(prev.changed || '') + ', ' + String(e.changed || '')).split(',')
    .map(s => s.trim()).filter(Boolean).forEach(s => changed.set(s, s));
  prev.changed = [...changed.keys()].join(', ');
}

// Gộp các lần tự đồng bộ trong 15 phút của cùng máy để lịch sử không bị hàng trăm dòng/ngày.
function historyGroupAuto(entries) {
  const byDevice = new Map();
  entries.forEach(e => {
    const key = (e.day || '') + '|' + (e.device || '');
    if (!byDevice.has(key)) byDevice.set(key, []);
    byDevice.get(key).push(e);
  });
  const out = [];
  byDevice.forEach(list => {
    let cur = null;
    list.forEach(e => {
      const gap = cur ? historyMinutes(cur.at) - historyMinutes(e.at) : NaN;
      if (cur && cur.reason === 'Tự động' && e.reason === 'Tự động'
        && cur.device && gap >= 0 && gap <= 15) {
        historyMergeRun(cur, e);
        return;
      }
      cur = Object.assign({}, e, { runs: 1, fromAt: '' });
      out.push(cur);
    });
  });
  out.sort((a, b) => historyStamp(b.at) - historyStamp(a.at));
  return out;
}

const WEEKDAY_KM = ['ថ្ងៃអាទិត្យ', 'ថ្ងៃចន្ទ', 'ថ្ងៃអង្គារ', 'ថ្ងៃពុធ', 'ថ្ងៃព្រហស្បតិ៍', 'ថ្ងៃសុក្រ', 'ថ្ងៃសៅរ៍'];

function historyDayLabel(day) {
  const m = String(day || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(day || '');
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  let wd = '';
  if (state.lang === 'km') {
    wd = WEEKDAY_KM[dt.getDay()] || '';
  } else {
    try {
      // Chromium một số bản thiếu dữ liệu locale Khmer nên chỉ dựa vào Intl cho tiếng Việt.
      wd = dt.toLocaleDateString('vi-VN', { weekday: 'long' });
    } catch (err) { wd = ''; }
  }
  return (wd ? wd.charAt(0).toUpperCase() + wd.slice(1) + ', ' : '') + `${m[3]}/${m[2]}/${m[1]}`;
}

function historyDevices() {
  const set = new Set();
  (historyData.entries || []).forEach(e => {
    if (e.device) set.add(e.device);
    if (e.nguoi) set.add(e.nguoi);
    (e.editDevices || []).forEach(d => { if (d) set.add(d); });
  });
  return [...set].sort((a, b) => a.localeCompare(b));
}

function historyItemHtml(e) {
  const devs = [];
  if (e.device) devs.push(e.device);
  if (!(Number(e.runs) > 1)) (e.editDevices || []).forEach(d => { if (d && !devs.includes(d)) devs.push(d); });
  if (!devs.length && e.nguoi) devs.push(e.nguoi);
  const dev = devs.length ? devs.join(', ') : t('historyNoDevice');
  const bits = [];
  if (e.lot) {
    bits.push(t('historyLot', { lot: e.lot }));
    if (e.kv) bits.push(e.kv);
    if (e.status) bits.push(e.status);
    if (e.dt != null) {
      bits.push('2027 ' + fmt(e.dt) + (e.base != null ? ' · 2026 ' + fmt(e.base) : ''));
    }
    if (e.delta != null && !e.status) bits.push(t('historyDelta') + ' ' + (e.delta > 0 ? '+' : '') + fmt(e.delta));
  } else if (e.changed) {
    const n = String(e.changed).split(',').filter(s => s.trim()).length;
    if (n) bits.push(t('historySync', { n: fmt(n) }));
  }
  if (e.changed && !e.lot) bits.push(t('historyChanged', { list: `<span class="noti-hist-changed">${esc(e.changed)}</span>` }));
  if (Number(e.edits) > 0) {
    let line = t('historyEdits', { n: fmt(e.edits) });
    const lots = (e.editLots || [])
      .filter(x => !e.lot || String(x.lot) !== String(e.lot))
      .map(x => (Number(x.n) > 1 ? `${x.lot} (${x.n})` : x.lot))
      .join(', ');
    if (lots) line += ' · ' + t('historyChanged', { list: `<span class="noti-hist-changed">${esc(lots)}</span>` });
    line += ' · ' + t('historyFromImport');
    bits.push(line);
  }
  if (!bits.length) bits.push(t(e.device ? 'historyNoChanges' : 'historySparse'));
  const timeLabel = e.fromAt ? historyTime(e.fromAt) + '–' + historyTime(e.at) : historyTime(e.at);
  const reason = historyReasonLabel(e.reason) + (Number(e.runs) > 1 ? ' · ' + t('historyRuns', { n: fmt(e.runs) }) : '');
  return `<div class="noti-item noti-hist">
    <span class="noti-item-main">
      <span class="noti-lot">${esc(timeLabel)}<span class="noti-kv">${esc(dev)}</span></span>
      <span class="noti-sub">${esc(reason)} · ${bits.join(' · ')}</span>
    </span>
  </div>`;
}

function renderHistory() {
  const host = $('#notiHistory');
  if (!host) return;
  const sel = $('#notiHistoryDevice');
  if (sel) {
    const devices = historyDevices();
    if (historyDevice && !devices.includes(historyDevice)) historyDevice = '';
    sel.innerHTML = `<option value="">${esc(t('historyAllDevices'))}</option>`
      + devices.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
    sel.value = historyDevice;
  }
  if (historyData.error) {
    host.innerHTML = `<p class="noti-empty">${esc(t('historyError', { err: historyData.error }))}</p>`;
    return;
  }
  if (!historyData.at) {
    host.innerHTML = `<p class="noti-empty">${esc(t('historyLoading'))}</p>`;
    return;
  }
  const entries = historyGroupAuto(historyData.entries.filter(e => !historyDevice || (e.device || e.nguoi || '') === historyDevice));
  if (!entries.length) {
    host.innerHTML = `<p class="noti-empty">${esc(t('historyEmpty'))}</p>`;
    return;
  }
  const groups = new Map();
  entries.forEach(e => {
    const key = e.day || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  });
  host.innerHTML = [...groups.keys()].map(day => `<div class="noti-day">
    <div class="noti-day-head">${esc(historyDayLabel(day))}</div>
    ${groups.get(day).map(historyItemHtml).join('')}
  </div>`).join('');
}

async function loadHistory(force) {
  if (historyBusy) return;
  if (!syncCfg.url) {
    historyData = { at: '', entries: [], error: t('syncNoUrl') };
    renderHistory();
    return;
  }
  historyBusy = true;
  if (force || !historyData.at) {
    historyData = { at: '', entries: historyData.entries, error: '' };
    renderHistory();
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const u = syncCfg.url.trim();
    const url = u + (u.indexOf('?') >= 0 ? '&' : '?') + 'action=history&days=' + historyDays;
    const res = await fetch(url, { redirect: 'follow', cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error(t('syncHttpError', { code: res.status }));
    const data = await res.json();
    if (!data || data.ok === false) throw new Error((data && data.error) || t('syncAppError', { err: '' }));
    if (!Array.isArray(data.entries)) throw new Error(t('remoteOldScript'));
    historyData = { at: data.at || '', entries: data.entries, error: '' };
  } catch (err) {
    historyData = { at: '', entries: [], error: err.message };
  } finally {
    clearTimeout(timer);
    historyBusy = false;
    renderHistory();
  }
}

function updateNotiChrome() {
  const isHist = historyTab === 'history';
  const title = $('#notiTitle');
  const eyebrow = $('#notiEyebrow');
  const footToday = $('#notiFootToday');
  const footHist = $('#notiFootHistory');
  if (title) title.textContent = t(isHist ? 'historyTitle' : 'notiTitle');
  if (eyebrow) eyebrow.textContent = t(isHist ? 'historyEyebrow' : 'notiEyebrow');
  if (footToday) footToday.hidden = isHist;
  if (footHist) footHist.hidden = !isHist;
}

function setNotiTab(tab) {
  historyTab = tab === 'history' ? 'history' : 'today';
  const isHist = historyTab === 'history';
  updateNotiChrome();
  $$('[data-noti-tab]').forEach(btn => {
    const on = btn.dataset.notiTab === historyTab;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const list = $('#notiList');
  const hist = $('#notiHistory');
  const bar = $('#notiHistoryBar');
  const leadToday = $('#notiLeadToday');
  const leadHist = $('#notiLeadHistory');
  if (list) list.hidden = isHist;
  if (hist) hist.hidden = !isHist;
  if (bar) bar.hidden = !isHist;
  if (leadToday) leadToday.hidden = isHist;
  if (leadHist) leadHist.hidden = !isHist;
  const daysSel = $('#notiHistoryDays');
  if (daysSel) daysSel.value = String(historyDays);
  if (isHist) loadHistory(false);
}

let detailBusy = false;
const DETAIL_STATUS_KM = {
  'Thiếu tổng ĐT': 'ខ្វះសរុប',
  'Lệch tổng': 'សរុបមិនត្រូវ',
  'Thiếu số hàng': 'ខ្វះលេខជួរ',
  'Trùng hàng': 'ជួរស្ទួន',
  'Phúc tra ≥2': 'ផ្ទៀងផ្ទាត់ ≥2',
};

function detailStatusText(status) {
  const s = String(status || '');
  if (!s) return '—';
  if (state.lang !== 'km') return s;
  return s.split('; ').map(part => DETAIL_STATUS_KM[part] || part).join(' · ');
}

function detailCell(v) {
  if (v === '' || v == null) return '—';
  const n = Number(v);
  return Number.isFinite(n) ? fmt(n) : '—';
}

function setDetailStatus(text, bad) {
  const el = $('#detailStatusLine');
  if (!el) return;
  el.textContent = text || '';
  el.className = 'muted' + (bad ? ' bad' : '');
}

function detailLotList() {
  const lots = (state.remoteDetail && Array.isArray(state.remoteDetail.lots)) ? state.remoteDetail.lots.slice() : [];
  return lots.sort((a, b) => String(a.lot).localeCompare(String(b.lot), 'vi', { numeric: true }));
}

function fillDetailLotSelect() {
  const sel = $('#detailLot');
  if (!sel) return;
  const lots = detailLotList();
  sel.innerHTML = lots.map(l => {
    const label = l.kv
      ? t('detailOptionKv', { lot: l.lot, kv: l.kv, n: (l.rows || []).length })
      : t('detailOption', { lot: l.lot, n: (l.rows || []).length });
    return `<option value="${esc(l.lot)}">${esc(label)}</option>`;
  }).join('');
  const current = [state.detailLot, state.lot].find(key => key && lots.some(l => l.lot === key)) || (lots[0] && lots[0].lot) || '';
  sel.value = current;
  sel.disabled = !lots.length;
  state.detailLot = current || null;
}

function renderDetailLot() {
  const lot = detailLotList().find(l => l.lot === state.detailLot);
  const rows = (lot && Array.isArray(lot.rows)) ? lot.rows : [];
  const body = $('#detailBody');
  const empty = $('#detailEmpty');
  if (!body || !empty) return;

  const sums = { dt: 0, g: 0, plus: 0, c: 0, k1: 0, k2: 0, o: 0, pt: 0, pd: 0 };
  let warn = 0;
  body.innerHTML = rows.map(r => {
    FIELDS.forEach(k => { sums[k] += Number(r[k]) || 0; });
    sums.pt += Number(r.pt) || 0;
    sums.pd += Number(r.pd) || 0;
    const status = String(r.status || '');
    const isWarn = !!status && status !== 'OK';
    if (isWarn) warn += 1;
    const cls = isWarn ? (status.indexOf('Phúc tra') >= 0 ? 'detail-pt' : 'detail-warn') : '';
    const pdVal = r.pd === '' || r.pd == null ? '—' : signed(r.pd);
    const pdCls = r.pd !== '' && r.pd != null && Math.abs(Number(r.pd)) >= PHUC_TRA_MIN ? ' class="pd-warn"' : '';
    const dirTag = r.dir ? `<span class="dir-tag">${esc(r.dir)}</span> ` : '';
    return `<tr class="${cls}">
      <td>${dirTag}${r.hang == null ? '—' : esc(r.hang)}</td>
      <td>${detailCell(r.dt)}</td>
      <td>${detailCell(r.g)}</td>
      <td>${detailCell(r.plus)}</td>
      <td>${detailCell(r.c)}</td>
      <td>${detailCell(r.k1)}</td>
      <td>${detailCell(r.k2)}</td>
      <td>${detailCell(r.o)}</td>
      <td>${detailCell(r.pt)}</td>
      <td${pdCls}>${pdVal}</td>
      <td><span class="st ${isWarn ? 'st-warn' : 'st-ok'}">${esc(detailStatusText(status))}</span></td>
    </tr>`;
  }).join('');

  empty.hidden = rows.length > 0;
  empty.className = 'detail-empty';
  empty.textContent = t('detailEmpty');
  ['dt', 'g', 'plus', 'c', 'k1', 'k2', 'o'].forEach(k => {
    const el = $('#detailSum' + k.charAt(0).toUpperCase() + k.slice(1));
    if (el) el.textContent = fmt(sums[k]);
  });
  const sumPt = $('#detailSumPt');
  const sumPd = $('#detailSumPd');
  if (sumPt) sumPt.textContent = rows.length ? fmt(sums.pt) : '0';
  if (sumPd) sumPd.textContent = rows.length ? signed(sums.pd) : '0';

  const remoteSet = new Set(detailLotList().map(l => l.lot));
  const localOnly = Object.keys(DB.lots)
    .filter(k => !remoteSet.has(k) && (DB.lots[k].rows || []).some(rowHasData))
    .map(k => ({ k, n: (DB.lots[k].rows || []).filter(rowHasData).length }))
    .sort((a, b) => collator.compare(a.k, b.k));
  const localOnlyBanner = () => {
    if (!localOnly.length) return '';
    const list = localOnly.slice(0, 5)
      .map(x => t('detailLocalOnlyItem', { lot: esc(x.k), n: x.n }))
      .join(', ') + (localOnly.length > 5 ? '…' : '');
    return `<span class="warn">${t('detailLocalOnly', { list })}</span>`;
  };

  if (!lot) {
    setDetailStatus('');
    const box = $('#detailSummary');
    if (box) box.innerHTML = localOnlyBanner();
    return;
  }
  setDetailStatus(t('detailUpdated', { time: dateTimeVN(lot.updatedAt || state.remoteDetail.at) }));
  const bits = [
    t('detailRowsCount', { n: `<b>${fmt(rows.length)}</b>` }),
    warn
      ? t('detailWarnCount', { n: `<b class="warn">${fmt(warn)}</b>` })
      : t('detailNoWarn'),
  ];
  if (lot.device) bits.push(t('detailDevice', { device: `<b>${esc(lot.device)}</b>` }));
  if (lot.nguoi) bits.push(t('detailNguoi', { nguoi: `<b>${esc(lot.nguoi)}</b>` }));
  const banner = localOnlyBanner();
  if (banner) bits.push(banner);
  const summaryEl = $('#detailSummary');
  if (summaryEl) summaryEl.innerHTML = bits.map(b => `<span>${b}</span>`).join('');
}

async function loadRemoteDetail() {
  if (detailBusy) return;
  const url = syncCfg.url.trim();
  const empty = $('#detailEmpty');
  if (!url) {
    setDetailStatus(t('syncNoUrl'), true);
    if (empty) { empty.hidden = false; empty.className = 'detail-empty bad'; empty.textContent = t('syncNoUrl'); }
    return;
  }
  detailBusy = true;
  setDetailStatus(t('detailLoading'));
  const btn = $('#btnDetailRefresh');
  if (btn) btn.disabled = true;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const u = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'action=detail';
    const res = await fetch(u, { redirect: 'follow', cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error(t('syncHttpError', { code: res.status }));
    const data = await res.json();
    if (!data || data.ok === false) throw new Error((data && data.error) || t('syncAppError', { err: '' }));
    if (!Array.isArray(data.lots)) throw new Error(t('remoteOldScript'));
    state.remoteDetail = { at: data.atIso || new Date().toISOString(), sheetUrl: data.sheetUrl || '', lots: data.lots };
    fillDetailLotSelect();
    renderDetailLot();
  } catch (err) {
    setDetailStatus(t('detailError', { err: err.message }), true);
    const hasOld = !!(state.remoteDetail && state.remoteDetail.lots && state.remoteDetail.lots.length);
    if (empty && !hasOld) { empty.hidden = false; empty.className = 'detail-empty bad'; empty.textContent = t('detailError', { err: err.message }); }
  } finally {
    clearTimeout(timer);
    detailBusy = false;
    if (btn) btn.disabled = false;
  }
}

async function openDetailDialog(lotKey) {
  const dlg = $('#detailDialog');
  if (!dlg) return;
  state.detailLot = lotKey || (state.view === 'lot' ? state.lot : null) || state.detailLot;
  if (!dlg.open) dlg.showModal();
  await loadRemoteDetail();
}

/* ============================================================
   Mở lô: tải bản mới nhất từ Google Sheet
   ============================================================ */
function draftHasChanges(key, dk, d) {
  if (!d) return false;
  if (d.review) return true;
  const lot = DB.lots[key];
  if (!lot) return false;
  const dir = dk.indexOf(key + '#') === 0 ? dk.slice(key.length + 1) : '';
  const rows = dir ? rowsInDir(key, dir) : lot.rows;
  if (String(d.ngay ?? '') !== String(lot.meta.ngay ?? '')) return true;
  if (String(d.nguoi ?? '').trim() !== String(lot.meta.nguoi ?? '').trim()) return true;
  return (d.cards || []).some(c => {
    const vals = c.vals || {};
    const hasAny = FIELDS.some(f => String(vals[f] ?? '').trim()) || String(c.hang ?? '').trim();
    if (!hasAny) return false;
    const hang = parseHang(c.hang);
    if (!Number.isInteger(hang)) return true;
    const row = rows.find(r => r.hang === hang);
    if (!row) return true;
    return FIELDS.some(f => String(vals[f] ?? '') !== String(row[f] ?? ''));
  });
}

function lotDrafts(key) {
  const drafts = readDrafts();
  return Object.keys(drafts)
    .filter(k => k === key || k.startsWith(key + '#'))
    .map(k => [k, drafts[k]]);
}

function pruneUnchangedDrafts(key) {
  const entries = lotDrafts(key);
  const keep = entries.filter(([k, d]) => draftHasChanges(key, k, d));
  if (keep.length === entries.length) return;
  const drafts = readDrafts();
  entries.filter(([k, d]) => !draftHasChanges(key, k, d)).forEach(([k]) => delete drafts[k]);
  writeDrafts(drafts);
}

function lotHasDraft(key) {
  return lotDrafts(key).some(([k, d]) => draftHasChanges(key, k, d));
}

function discardLotDrafts(key) {
  const drafts = readDrafts();
  lotDrafts(key).forEach(([k]) => delete drafts[k]);
  writeDrafts(drafts);
}

function lotInputFocused() {
  const el = document.activeElement;
  const view = $('#view-lot');
  return !!(el && view && view.contains(el) && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

function lotRemoteSet(key, level, text, retry) {
  state.lotRemoteNote = text ? { key, level: level || 'info', text, retry: retry || '' } : null;
  renderLotRemoteNote();
}

function renderLotRemoteNote() {
  const host = $('#lotRemoteNote');
  if (!host) return;
  const n = state.lotRemoteNote;
  if (!n || state.view !== 'lot' || state.lot !== n.key) {
    host.hidden = true;
    host.innerHTML = '';
    return;
  }
  host.hidden = false;
  const btnLabel = n.retry === 'discard' ? t('lotRemoteDiscard') : t('detailRefresh');
  const btnId = n.retry === 'discard' ? 'btnLotRemoteDiscard' : 'btnLotRemoteRetry';
  host.innerHTML = `<div class="alert ${n.level}">
    <div class="alert-body">${esc(n.text)}</div>
    ${n.retry ? `<button type="button" class="btn btn-sm" id="${btnId}">${esc(btnLabel)}</button>` : ''}
  </div>`;
  const btn = document.getElementById(btnId);
  if (btn && n.retry === 'discard') {
    btn.addEventListener('click', () => {
      if (!confirm(t('lotRemoteDiscardConfirm'))) return;
      discardLotDrafts(n.key);
      state.lotRemoteNote = null;
      pullRemoteLot(n.key);
    });
  } else if (btn) {
    btn.addEventListener('click', () => pullRemoteLot(n.key));
  }
}

function remoteRowKey(row) {
  return String(row.dir || '') + '|' + (row.hang == null ? '' : String(row.hang));
}

function applyRemoteLot(key, remote, meta, remoteAt, device) {
  const lot = ensureLot(key);
  const byKey = new Map();
  (lot.rows || []).forEach(r => {
    const k = remoteRowKey(r);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(r);
  });
  lot.rows = (remote.rows || []).map(r => {
    const k = remoteRowKey(r);
    const list = byKey.get(k);
    const old = list && list.length ? list.shift() : null;
    const row = {
      uid: (old && old.uid) || uid(),
      hang: r.hang == null ? null : Number(r.hang),
      dir: String(r.dir || ''),
    };
    FIELDS.forEach(f => { row[f] = r[f] == null ? '' : r[f]; });
    return row;
  });
  if (meta) {
    lot.meta.done = !!meta.done;
    if (meta.doneAt) lot.meta.doneAt = meta.doneAt;
    if (meta.nguoi) lot.meta.nguoi = meta.nguoi;
    if (meta.ngay) lot.meta.ngay = meta.ngay;
  }
  lot.updatedAt = remoteAt || new Date().toISOString();
  if (!lot.meta.firstBy && lot.rows.some(rowHasData)) {
    const who = String((meta && meta.nguoi) || lot.meta.nguoi || device || '').trim();
    if (who) {
      lot.meta.firstBy = who;
      lot.meta.firstAt = lot.updatedAt;
    }
  }
  persist({ quiet: true });

  const dev = String(device || (meta && meta.nguoi) || '').trim();
  const timeText = (remoteAt && dateTimeVN(remoteAt)) || remote.updatedAtDisplay || '—';
  const same = dev && syncCfg.device && dev.toLowerCase() === syncCfg.device.trim().toLowerCase();
  if (dev && !same) {
    lotRemoteSet(key, 'warn', t('lotRemoteConflict', { device: dev, time: timeText }));
  } else if (dev) {
    lotRemoteSet(key, 'ok', t('lotRemoteUpdated', { device: dev, time: timeText }));
  } else {
    lotRemoteSet(key, 'info', t('lotRemoteUpdatedNoDev', { time: timeText }));
  }
  if (state.view === 'lot' && state.lot === key) renderLot();
}

async function fetchRemoteLotMeta(base, key, signal) {
  const u = base + (base.indexOf('?') >= 0 ? '&' : '?') + 'action=progress';
  const res = await fetch(u, { redirect: 'follow', cache: 'no-store', signal });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || data.ok === false || !Array.isArray(data.lots)) return null;
  return data.lots.find(l => String(l.lot) === String(key)) || null;
}

async function pullRemoteLot(key) {
  if (!key || !syncCfg.url || navigator.onLine === false) return;
  const token = ++state.lotRemoteSeq;
  const lotAtStart = (DB.lots[key] && DB.lots[key].updatedAt) || '';
  pruneUnchangedDrafts(key);
  const quickDlg = $('#quickDialog');
  if (lotHasDraft(key) || (quickDlg && quickDlg.open && state.quickLot === key)) {
    const draft = lotHasDraft(key);
    lotRemoteSet(key, 'warn', t(draft ? 'lotRemoteDraft' : 'lotRemoteEditing'), draft ? 'discard' : '');
    return;
  }
  lotRemoteSet(key, 'info', t('lotRemoteLoading'));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  const base = syncCfg.url.trim();
  try {
    const u = base + (base.indexOf('?') >= 0 ? '&' : '?')
      + 'action=detail&lot=' + encodeURIComponent(key);
    const res = await fetch(u, { redirect: 'follow', cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error(t('syncHttpError', { code: res.status }));
    const data = await res.json();
    if (!data || data.ok === false) throw new Error((data && data.error) || t('syncAppError', { err: '' }));
    if (!Array.isArray(data.lots)) throw new Error(t('remoteOldScript'));
    if (token !== state.lotRemoteSeq || state.view !== 'lot' || state.lot !== key) return;
    const remote = data.lots.find(l => String(l.lot) === String(key));
    if (!remote || !(remote.rows || []).length) {
      lotRemoteSet(key, '', '');
      return;
    }
    const remoteAt = String(remote.updatedAt || '');
    const remoteTs = Date.parse(remoteAt) || 0;
    if (!remoteTs) {
      lotRemoteSet(key, '', '');
      return;
    }
    const localAt = (DB.lots[key] && DB.lots[key].updatedAt) || '';
    const localTs = Date.parse(localAt) || 0;
    if (localAt && localTs >= remoteTs) {
      if (localTs > remoteTs) lotRemoteSet(key, 'warn', t('lotRemoteLocalNewer'));
      else lotRemoteSet(key, '', '');
      return;
    }
    if (lotHasDraft(key)) {
      lotRemoteSet(key, 'warn', t('lotRemoteDraft'), 'discard');
      return;
    }
    if ((quickDlg && quickDlg.open && state.quickLot === key) || lotInputFocused()) {
      lotRemoteSet(key, 'warn', t('lotRemoteEditing'));
      return;
    }
    let meta = null;
    try { meta = await fetchRemoteLotMeta(base, key, ctrl.signal); } catch (err) { meta = null; }
    if (token !== state.lotRemoteSeq || state.view !== 'lot' || state.lot !== key) return;
    if (((DB.lots[key] && DB.lots[key].updatedAt) || '') !== lotAtStart) return;
    if (lotHasDraft(key) || (quickDlg && quickDlg.open && state.quickLot === key) || lotInputFocused()) {
      const draft = lotHasDraft(key);
      lotRemoteSet(key, 'warn', t(draft ? 'lotRemoteDraft' : 'lotRemoteEditing'), draft ? 'discard' : '');
      return;
    }
    applyRemoteLot(key, remote, meta, remoteAt, remote.device);
  } catch (err) {
    if (token !== state.lotRemoteSeq) return;
    if (state.view === 'lot' && state.lot === key && navigator.onLine !== false) {
      lotRemoteSet(key, 'warn', t('lotRemoteError', { err: err.message }), true);
    }
  } finally {
    clearTimeout(timer);
  }
}

function syncUrlFromInput() {
  const url = $('#syncUrl').value.trim();
  if (!url) { toast(t('syncPasteFirst'), 'bad'); return null; }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec/.test(url)) {
    toast(t('syncUrlFormat'), 'bad');
    return null;
  }
  return url;
}

function setupSyncUi() {
  const dlg = $('#syncDialog');
  if (!dlg) return;
  $('#menuSync').addEventListener('click', () => { $('#menuDialog').close(); openSyncDialog(); });
  $('#btnSyncClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  $('#btnSyncSave').addEventListener('click', () => {
    const raw = $('#syncUrl').value.trim();
    if (raw && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec/.test(raw)) {
      toast(t('syncUrlFormat'), 'bad');
      return;
    }
    saveSyncCfg({ url: raw, enabled: $('#syncEnabled').checked, device: $('#syncDevice').value.trim() });
    toast(raw ? t('syncSaved') : t('syncDisabled'), 'ok');
  });
  $('#syncDevice').addEventListener('input', e => {
    saveSyncCfg({ device: e.target.value.trim().slice(0, 40) });
  });
  $('#btnSyncTest').addEventListener('click', async () => {
    const url = syncUrlFromInput();
    if (!url) return;
    saveSyncCfg({ url, enabled: $('#syncEnabled').checked, device: $('#syncDevice').value.trim() });
    await syncNow('test');
  });
  $('#btnSyncNow').addEventListener('click', async () => {
    const url = syncUrlFromInput();
    if (!url) return;
    saveSyncCfg({ url, enabled: $('#syncEnabled').checked, device: $('#syncDevice').value.trim() });
    await syncNow('manual');
  });
  $('#btnSyncPull').addEventListener('click', async () => {
    const url = syncUrlFromInput();
    if (!url) return;
    saveSyncCfg({ url, enabled: $('#syncEnabled').checked, device: $('#syncDevice').value.trim() });
    await pullRemote(true);
  });
  $('#btnCopyScript').addEventListener('click', async () => {
    try {
      const res = await fetch('./apps-script/Code.gs');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      toast(t('copyOk'), 'ok');
    } catch (err) {
      toast(t('copyFail'), 'bad');
    }
  });
  updateSyncUi();
  updateRemoteUi();
}

/* ============================================================
   Menu & dialog
   ============================================================ */
function setupDialogs() {
  const quick = $('#quickDialog');
  $('#btnQuickClose').addEventListener('click', () => { saveQuickDraft(); quick.close(); });
  quick.addEventListener('cancel', saveQuickDraft);
  $('#btnQuickPrev').addEventListener('click', () => stepQuickSheet(-1));
  $('#btnQuickNext').addEventListener('click', () => stepQuickSheet(1));
  $('#btnQuickReturn').addEventListener('click', () => navigateQuickSheet(null));
  $('#quickPages').addEventListener('focusin', e => {
    const card = e.target.closest('.qcard');
    if (!state.quickReview && card && e.target.matches('input')) {
      state.quickFocus = { index: Number(card.dataset.idx), field: e.target.dataset.field || 'hang' };
      saveQuickDraft();
    }
  });
  $$('[data-quicklang]').forEach(btn => {
    btn.addEventListener('click', () => {
      setLang(btn.dataset.quicklang);
      if (state.quickFrom === 'home') {
        populateQuickZoneSelect();
        const keys = populateQuickLotSelect(state.quickZone);
        $('#quickLot').value = keys.includes(state.quickLot) ? state.quickLot : (keys[0] || '');
      }
    });
  });
  $$('#quickDialog [data-gmode]').forEach(btn => {
    btn.addEventListener('click', () => setGAuto(btn.dataset.gmode === 'auto'));
  });
  $('#quickDirBtns').addEventListener('click', e => {
    const btn = e.target.closest('button[data-qdir]');
    if (btn) switchQuickDir(btn.dataset.qdir);
  });
  $('#quickZone').addEventListener('change', e => {
    saveQuickDraft();
    state.quickZone = e.target.value;
    state.quickSeed = null;
    const keys = populateQuickLotSelect(state.quickZone);
    const next = keys.includes(state.quickLot) ? state.quickLot : (keys[0] || '');
    $('#quickLot').value = next;
    setQuickLot(next, true);
    setTimeout(focusQuickCard, 40);
  });
  $('#quickLot').addEventListener('change', e => {
    saveQuickDraft();
    state.quickSeed = null;
    setQuickLot(e.target.value, true);
    setTimeout(focusQuickCard, 40);
  });
  $('#quickPages').addEventListener('input', e => {
    if (e.target.matches('input')) {
      e.target.closest('.qcard').dataset.recalculate = 'true';
      refreshQuickChecks();
      refreshQuickSummary();
      saveQuickDraft();
    }
  });
  [['#quickNgay', 'ngay'], ['#quickNguoi', 'nguoi']].forEach(([selector, field]) => {
    $(selector).addEventListener('input', () => {
      if (state.quickReview) {
        state.quickReview.metaChanged = { ...state.quickReview.metaChanged, [field]: true };
      }
      saveQuickDraft();
    });
  });
  $('#quickPages').addEventListener('click', e => {
    const btn = e.target.closest('[data-act="qcalc"]');
    if (!btn) return;
    const card = btn.closest('.qcard');
    const r = readQuickCard(card);
    card.querySelector('.dt-input').value = r.sum;
    card.dataset.recalculate = 'true';
    refreshQuickChecks();
    refreshQuickSummary();
    saveQuickDraft();
  });
  quick.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('input')) {
      e.preventDefault();
      focusNextQuickInput(e.target);
      return;
    }
    if (e.target.closest('#quickPages') && e.target.matches('input')
      && (e.key === 'ArrowUp' || e.key === 'ArrowDown')
      && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      focusInputStep(quickInputsInOrder(), e.target, e.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    if ((e.key === ' ' || e.code === 'Space') && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.target.closest('input[type="text"], input[type="date"], textarea, select, button')) return;
      e.preventDefault();
      saveQuick('next');
    }
  });
  $('#btnQuickSave').addEventListener('click', () => saveQuick('pause'));
  $('#btnQuickSaveNext').addEventListener('click', () => saveQuick('next'));

  const menu = $('#menuDialog');
  $('#btnMenu').addEventListener('click', () => menu.showModal());
  $('#btnLangToggle').addEventListener('click', () => setLang(state.lang === 'km' ? 'vi' : 'km'));
  $('#btnMenuClose').addEventListener('click', () => menu.close());
  $('#menuLang').addEventListener('click', () => {
    menu.close();
    const dlg = $('#langDialog');
    if (dlg && !dlg.open) dlg.showModal();
  });
  $$('#langDialog [data-lang]').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
  const langDlg = $('#langDialog');
  langDlg.addEventListener('close', () => setTimeout(maybePromptName, 80));
  const nameDlg = $('#nameDialog');
  const nameInput = $('#nameInput');
  const btnNameSave = $('#btnNameSave');
  nameDlg.addEventListener('click', e => { if (e.target === nameDlg) nameDlg.close(); });
  nameDlg.addEventListener('close', () => {
    if (!userName()) toast(t('nameLaterToast'), '');
  });
  nameInput.addEventListener('input', () => {
    btnNameSave.disabled = !nameInput.value.trim();
    const err = $('#nameError');
    if (err) err.hidden = true;
  });
  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.repeat && !e.isComposing) {
      e.preventDefault();
      saveUserName();
    }
  });
  btnNameSave.addEventListener('click', saveUserName);
  $('#btnNameLater').addEventListener('click', () => nameDlg.close());
  $('#menuExport').addEventListener('click', () => { menu.close(); exportAll(); });
  $('#menuBackup').addEventListener('click', () => { menu.close(); backupJSON(); });
  $('#menuRestore').addEventListener('click', () => { menu.close(); $('#fileRestore').click(); });
  $('#menuDemo').addEventListener('click', () => { menu.close(); demoLot250(); });
  $('#menuDetail').addEventListener('click', () => {
    menu.close();
    openDetailDialog(state.view === 'lot' ? state.lot : null);
  });
  $('#menuReset').addEventListener('click', () => { menu.close(); resetAll(); });
  const detailDlg = $('#detailDialog');
  $('#btnDetailLot').addEventListener('click', () => openDetailDialog(state.lot));
  $('#btnDetailClose').addEventListener('click', () => detailDlg.close());
  $('#btnDetailRefresh').addEventListener('click', () => loadRemoteDetail());
  const statsDlg = $('#statsDialog');
  $('#btnStats').addEventListener('click', openStatsDialog);
  $('#btnStatsClose').addEventListener('click', () => statsDlg.close());
  statsDlg.addEventListener('click', (e) => { if (e.target === statsDlg) statsDlg.close(); });
  $('#btnStatsRefresh').addEventListener('click', async () => {
    const btn = $('#btnStatsRefresh');
    btn.disabled = true;
    await Promise.all([pullRemote(false), loadStatsHistory(true)]);
    renderStats();
    btn.disabled = false;
  });
  const check2Dlg = $('#check2Dialog');
  $('#btnCheck2').addEventListener('click', openCheck2);
  $('#check2RowsBody').addEventListener('change', onCheck2RowChange);
  $('#check2RowsBody').addEventListener('click', onCheck2RowAction);
  $('#check2RowsBody').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('input.c2-in')) { e.preventDefault(); e.target.blur(); }
  });
  $('#btnCheck2Close').addEventListener('click', () => check2Dlg.close());
  check2Dlg.addEventListener('click', (e) => { if (e.target === check2Dlg) check2Dlg.close(); });
  window.addEventListener('resize', () => { if (check2Dlg.open) measureCheck2Head(); });
  const notiDlg = $('#notiDialog');
  $('#btnNoti').addEventListener('click', openNoti);
  $('#btnNotiClose').addEventListener('click', () => notiDlg.close());
  $('#btnNotiRefresh').addEventListener('click', async () => {
    const btn = $('#btnNotiRefresh');
    btn.disabled = true;
    if (historyTab === 'history') {
      await loadHistory(true);
    } else {
      await pullRemote(false);
      renderNotiList();
      markNotiSeen();
      refreshNotiUi();
    }
    btn.disabled = false;
  });
  $$('[data-noti-tab]').forEach(btn => {
    btn.addEventListener('click', () => setNotiTab(btn.dataset.notiTab));
  });
  $('#notiHistoryDays').addEventListener('change', e => {
    historyDays = Number(e.target.value) || 30;
    loadHistory(true);
  });
  $('#notiHistoryDevice').addEventListener('change', e => {
    historyDevice = e.target.value;
    renderHistory();
  });
  $('#notiList').addEventListener('click', e => {
    const item = e.target.closest('[data-noti-lot]');
    if (!item) return;
    notiDlg.close();
    openDetailDialog(item.dataset.notiLot);
  });
  $('#detailLot').addEventListener('change', e => {
    state.detailLot = e.target.value;
    renderDetailLot();
  });
  $('#fileRestore').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) restoreJSON(f);
    e.target.value = '';
  });
  [$('#btnBackup'), $('#btnRestore')].forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      if (idx === 0) backupJSON();
      else $('#fileRestore').click();
    });
  });
  [quick, menu, detailDlg].forEach(dlg => {
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  });
}

/* ============================================================
   PWA
   ============================================================ */
let deferredPrompt = null;
function setupPWA() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = $('#menuInstall');
    if (btn) btn.hidden = false;
  });
  const install = $('#menuInstall');
  if (install) {
    install.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      install.hidden = true;
      $('#menuDialog').close();
    });
  }
}

/* ============================================================
   Khởi động
   ============================================================ */
function init() {
  migrateFirstEntry();
  setupHomeEvents();
  setupDialogs();
  setupSyncUi();
  setupPWA();
  syncLanguageUi();
  refreshNotiUi();
  window.addEventListener('popstate', routeFromHash);
  routeFromHash();
  if (!state.langChosen) {
    const dlg = $('#langDialog');
    if (dlg) setTimeout(() => { if (!state.langChosen) dlg.showModal(); }, 250);
  }
  setTimeout(maybePromptName, 500);
  if (syncCfg.url && DB.updatedAt && (!syncCfg.lastSyncAt || new Date(DB.updatedAt) > new Date(syncCfg.lastSyncAt))) {
    syncTimer = setTimeout(() => syncNow('auto'), 2500);
  }
  if (syncCfg.url) setTimeout(() => pullRemote(false), 1800);
}
init();

})();
