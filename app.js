/* مكتبة إدارة الأعمال الطلابية — فهرس ثابت يولده GitHub Actions من مجلد debo */
const ROOT = 'debo';
const MANIFEST_URL = 'debo-index.json';
const state = { entries: [], currentPath: ROOT, query: '', filter: 'all', loading: false };
const el = {
  grid: document.getElementById('fileGrid'), search: document.getElementById('searchInput'),
  count: document.getElementById('countAll'), result: document.getElementById('resultCount'),
  status: document.getElementById('statusLine'), empty: document.getElementById('emptyState'),
  emptyTitle: document.getElementById('emptyTitle'), emptyDescription: document.getElementById('emptyDescription'),
  breadcrumb: document.getElementById('breadcrumb'), refresh: document.getElementById('refreshButton'),
  loadMoreWrap: document.getElementById('loadMoreWrap'), loadMoreButton: document.getElementById('loadMoreButton')
};
function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();
}
function isFolder(item) { return item.type === 'folder'; }
function classify(item) {
  if (isFolder(item)) return { key: 'folder', label: 'مجلد', icon: 'folder' };
  const name = item.name || '';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (ext === 'pdf') return { key: 'application/pdf', label: 'PDF', icon: 'pdf' };
  if (['doc','docx','rtf','txt','odt'].includes(ext)) return { key: 'docs', label: 'مستند', icon: 'doc' };
  if (['xls','xlsx','csv','ods'].includes(ext)) return { key: 'sheets', label: 'جدول', icon: 'sheet' };
  if (['ppt','pptx','odp'].includes(ext)) return { key: 'presentations', label: 'عرض تقديمي', icon: 'slide' };
  if (['mp4','mp3','mov','m4v','wav','webm','ogg'].includes(ext)) return { key: 'media', label: 'وسائط', icon: 'other' };
  if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return { key: 'images', label: 'صورة', icon: 'other' };
  return { key: 'other', label: ext ? ext.toUpperCase() : 'ملف', icon: 'other' };
}
function iconMarkup(kind) {
  const symbols = {
    folder: '<svg viewBox="0 0 24 24"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4l2 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Z"/></svg>',
    pdf: '<svg viewBox="0 0 24 24"><path d="M6 3h8l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M7 16h10M7 12h5"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M6 3h8l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M8 13h8M8 17h6"/></svg>',
    sheet: '<svg viewBox="0 0 24 24"><path d="M6 3h8l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M8 12h8M8 16h8M12 12v7"/></svg>',
    slide: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v4M8 21h8M7 8h10M7 12h6"/></svg>',
    other: '<svg viewBox="0 0 24 24"><path d="M6 3h8l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5"/></svg>'
  };
  return symbols[kind] || symbols.other;
}
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function formatSize(bytes) {
  if (!Number.isFinite(Number(bytes))) return '';
  const n = Number(bytes); if (n < 1024) return `${n} بايت`;
  if (n < 1024**2) return `${(n/1024).toFixed(0)} ك.ب`;
  if (n < 1024**3) return `${(n/1024**2).toFixed(1)} م.ب`;
  return `${(n/1024**3).toFixed(1)} ج.ب`;
}
function urlFor(path) {
  // encode each path segment separately so spaces and Arabic names work on GitHub Pages.
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
}
function setStatus(message, mode='') {
  el.status.className = `status-line ${mode}`.trim();
  el.status.innerHTML = `<span class="status-dot"></span><span>${escapeHTML(message)}</span>`;
}
function currentItems() {
  const q = normalize(state.query);
  let items;
  if (q) {
    items = state.entries.filter(item => normalize(`${item.name} ${item.path}`).includes(q));
  } else {
    items = state.entries.filter(item => item.parent === state.currentPath);
  }
  return items.filter(item => {
    const kind = classify(item);
    return state.filter === 'all' || kind.key === state.filter;
  }).sort((a,b) => {
    if (isFolder(a) !== isFolder(b)) return isFolder(a) ? -1 : 1;
    return a.name.localeCompare(b.name, 'ar', { numeric: true, sensitivity: 'base' });
  });
}
function renderBreadcrumb() {
  const parts = state.currentPath.split('/').filter(Boolean);
  let path = '';
  const crumbs = [{ name: 'المجلد الرئيسي', path: ROOT }];
  for (const part of parts.slice(1)) { path += (path ? '/' : ROOT + '/') + part; crumbs.push({name:part,path}); }
  el.breadcrumb.innerHTML = crumbs.map((crumb, index) => {
    const last = index === crumbs.length - 1;
    return `${index ? '<span class="breadcrumb-sep">/</span>' : ''}${last ? `<span>${escapeHTML(crumb.name)}</span>` : `<button type="button" data-path="${escapeHTML(crumb.path)}">${escapeHTML(crumb.name)}</button>`}`;
  }).join('');
}
function render() {
  const items = currentItems();
  el.grid.innerHTML = '';
  el.grid.hidden = items.length === 0;
  el.empty.hidden = items.length !== 0;
  el.count.textContent = String(state.entries.length);
  el.result.textContent = `${items.length} عنصر`;
  el.loadMoreWrap.hidden = true;
  if (!items.length) {
    if (state.query) { el.emptyTitle.textContent = 'مش لاقيين نتيجة'; el.emptyDescription.textContent = 'جرّب كلمة بحث مختلفة أو راجع تهجئة اسم الملف.'; }
    else { el.emptyTitle.textContent = 'المجلد ده فاضي حاليًا'; el.emptyDescription.textContent = 'أضف ملفات أو مجلدات داخل debo في مستودع GitHub، وبعد النشر هتظهر هنا تلقائيًا.'; }
  }
  for (const item of items) {
    const kind = classify(item);
    const card = document.createElement('article'); card.className = 'file-card';
    const size = item.type === 'file' ? formatSize(item.size) : '';
    const location = state.query && item.parent !== state.currentPath ? `<span class="file-location">${escapeHTML(item.parent.replace(/^debo\/?/, '').replaceAll('/', ' / '))}</span>` : '';
    const actions = isFolder(item)
      ? `<button class="file-action" type="button" data-open-folder="${escapeHTML(item.path)}" aria-label="فتح المجلد" title="فتح المجلد"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>`
      : `<a class="file-action" href="${escapeHTML(urlFor(item.path))}" target="_blank" rel="noopener noreferrer" aria-label="فتح الملف في تبويب جديد" title="فتح الملف"><svg viewBox="0 0 24 24"><path d="M14 3h7v7M21 3 10 14M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a><a class="file-action" href="${escapeHTML(urlFor(item.path))}" download="${escapeHTML(item.name)}" aria-label="تحميل الملف" title="تحميل الملف"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg></a>`;
    card.innerHTML = `<div class="file-type-icon type-${kind.icon}">${iconMarkup(kind.icon)}</div><div class="file-details"><div class="file-name" title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</div><div class="file-meta"><span class="file-extension">${escapeHTML(kind.label)}</span>${size ? `<span>·</span><span>${escapeHTML(size)}</span>` : ''}${location}</div></div><div class="file-actions">${actions}</div>`;
    if (isFolder(item)) card.classList.add('folder-card');
    el.grid.appendChild(card);
  }
}
async function loadIndex() {
  if (state.loading) return;
  state.loading = true; el.refresh.disabled = true; setStatus('جارٍ تحميل فهرس الملفات...', 'loading');
  try {
    const response = await fetch(`${MANIFEST_URL}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.entries = Array.isArray(data.entries) ? data.entries : [];
    renderBreadcrumb(); render();
    setStatus(`المكتبة جاهزة — ${state.entries.length} ملف ومجلد.`, '');
  } catch (error) {
    console.error(error);
    setStatus('تعذر تحميل فهرس الملفات. تأكد من نشر الموقع باستخدام GitHub Actions.', 'error');
    el.grid.hidden = true; el.empty.hidden = false;
    el.emptyTitle.textContent = 'الفهرس غير موجود بعد';
    el.emptyDescription.textContent = 'تأكد من رفع مجلد debo وتفعيل GitHub Pages من Settings ثم Pages ثم GitHub Actions. بعد أول نشر ستظهر الملفات تلقائيًا.';
  } finally { state.loading = false; el.refresh.disabled = false; }
}
function openFolder(path) { state.currentPath = path; state.query = ''; el.search.value = ''; state.filter = 'all'; document.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all')); renderBreadcrumb(); render(); setStatus(`عرض محتويات: ${path.split('/').at(-1)}`, ''); }
function goToPath(path) { state.currentPath = path; state.query = ''; el.search.value = ''; renderBreadcrumb(); render(); setStatus(`عرض محتويات: ${path.split('/').at(-1)}`, ''); }
el.search.addEventListener('input', event => { state.query = event.target.value; render(); });
document.querySelectorAll('.filter-chip').forEach(button => button.addEventListener('click', () => { state.filter = button.dataset.filter; document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.toggle('active', chip === button)); render(); }));
el.refresh.addEventListener('click', loadIndex);
el.breadcrumb.addEventListener('click', event => { const button = event.target.closest('[data-path]'); if (button) goToPath(button.dataset.path); });
el.grid.addEventListener('click', event => { const button = event.target.closest('[data-open-folder]'); if (button) openFolder(button.dataset.openFolder); });
const menuToggle = document.getElementById('menuToggle'); const mainNav = document.getElementById('mainNav');
if (menuToggle && mainNav) menuToggle.addEventListener('click', () => { const expanded = menuToggle.getAttribute('aria-expanded') === 'true'; menuToggle.setAttribute('aria-expanded', String(!expanded)); mainNav.classList.toggle('open', !expanded); });
if (document.getElementById('currentYear')) document.getElementById('currentYear').textContent = new Date().getFullYear();
const backToTop = document.getElementById('backToTop'); if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));
loadIndex();
