(() => {
  const STORAGE_KEY = 'mortgagehub-demo-cases-v1';
  const SETTINGS_KEY = 'mortgagehub-demo-settings-v1';
  const BANK_LIST_KEY = 'mortgagehub-demo-banks-v1';
  // Initial list based on Taiwan Banking Bureau's home-purchase loan information table.
  // The first 16 are presented as a quick shortlist, not as a lending or approval ranking.
  const DEFAULT_BANKS = ['土地銀行', '台灣銀行', '合作金庫', '第一銀行', '華南銀行', '兆豐銀行', '國泰世華', '中國信託', '玉山銀行', '台北富邦', '台新銀行', '永豐銀行', '元大銀行', '彰化銀行', '上海商銀', '台灣企銀', '高雄銀行', '渣打銀行', '滙豐銀行', '星展銀行', '王道銀行', '台中銀行', '京城銀行', '華泰銀行', '新光銀行', '陽信銀行', '瑞興銀行', '板信銀行', '三信銀行', '聯邦銀行', '遠東銀行', '凱基銀行', '安泰銀行', '將來銀行'];
  const COMMON_BANKS = DEFAULT_BANKS.slice(0, 16);
  let banks = loadBanks();
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const dateOffset = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return localDate(d); };
  const localDate = (date) => { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; };
  const daysBetween = (dateString) => { if (!dateString) return Infinity; const target = new Date(`${dateString}T00:00:00`); const now = new Date(); now.setHours(0, 0, 0, 0); return Math.round((target - now) / 86400000); };
  const prettyDate = (dateString, year = false) => { if (!dateString) return '未設定'; const d = new Date(`${dateString}T00:00:00`); return new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', ...(year ? { year: 'numeric' } : {}) }).format(d); };
  const seedData = () => [
    { id: crypto.randomUUID(), name: '林先生・桃園藝文特區', address: '桃園市桃園區中正路', broker: '陳怡君', price: 1680, created: dateOffset(-3), banks: [
      { name: '台灣銀行', inquiryDate: dateOffset(-3), dueDate: dateOffset(1), status: 'waiting' },
      { name: '土地銀行', inquiryDate: dateOffset(-3), dueDate: dateOffset(2), status: 'waiting' },
      { name: '第一銀行', inquiryDate: dateOffset(-3), dueDate: dateOffset(-1), status: 'replied', valuationMin: 1630, valuationMax: 1630, loanMin: 1304, loanMax: 1304, mortgageRatio: 80, supplementalRatio: 0, mortgageRate: '2.35%', supplementalRate: '', years: '30 年', note: '需檢附收入證明' }
    ], brokerStatus: 'pending', brokerReply: '', brokerRepliedAt: '', state: 'active' },
    { id: crypto.randomUUID(), name: '張小姐・新竹關埔', address: '新竹市東區慈雲路', broker: '王建宏', price: 2280, created: dateOffset(-6), banks: [
      { name: '土地銀行', inquiryDate: dateOffset(-6), dueDate: dateOffset(3), status: 'replied', valuationMin: 2200, valuationMax: 2200, loanMin: 1870, loanMax: 1870, mortgageRatio: 70, supplementalRatio: 15, mortgageRate: '2.28%', supplementalRate: '4.5%', years: '30 年', note: '' },
      { name: '玉山銀行', inquiryDate: dateOffset(-6), dueDate: dateOffset(2), status: 'replied', valuationMin: 2150, valuationMax: 2150, loanMin: 1720, loanMax: 1720, mortgageRatio: 80, supplementalRatio: 0, mortgageRate: '2.45%', supplementalRate: '', years: '30 年', note: '可再補充薪轉資料評估' },
      { name: '兆豐銀行', inquiryDate: dateOffset(-6), dueDate: dateOffset(1), status: 'waiting' }
    ], brokerStatus: 'replied', brokerReply: '目前土地銀行估價約 2,200 萬，可貸額度約 1,870 萬；玉山銀行初估約 2,150 萬。', brokerRepliedAt: dateOffset(-1), state: 'active' },
    { id: crypto.randomUUID(), name: '黃先生・板橋江子翠', address: '新北市板橋區文化路二段', broker: '林佩珊', price: 1980, created: dateOffset(-12), banks: [
      { name: '合作金庫', inquiryDate: dateOffset(-12), dueDate: dateOffset(-5), status: 'replied', valuationMin: 1920, valuationMax: 1920, loanMin: 1536, loanMax: 1536, mortgageRatio: 80, supplementalRatio: 0, mortgageRate: '2.40%', supplementalRate: '', years: '30 年', note: '' },
      { name: '國泰世華', inquiryDate: dateOffset(-12), dueDate: dateOffset(-4), status: 'replied', valuationMin: 1950, valuationMax: 1950, loanMin: 1657, loanMax: 1657, mortgageRatio: 70, supplementalRatio: 15, mortgageRate: '2.50%', supplementalRate: '4.8%', years: '30 年', note: '依個人條件核定' }
    ], brokerStatus: 'pending', brokerReply: '', brokerRepliedAt: '', state: 'active' }
  ];
  let cases = loadCases();
  let settings = loadSettings();
  let currentView = 'dashboard';
  let currentFilter = 'all';
  let searchTerm = '';

  function loadCases() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored).map(c => ({ ...c, banks: (c.banks || []).map(b => {
        const legacyAmount = (value) => value == null || value === '' ? null : Number(value);
        const valuationMin = b.valuationMin ?? legacyAmount(b.valuation);
        const loanMin = b.loanMin ?? legacyAmount(b.loan);
        const mortgageRatio = b.mortgageRatio ?? (Number(b.ratio) || 0);
        const hasValuation = valuationMin != null || b.valuationMax != null;
        const hasLoan = loanMin != null || b.loanMax != null;
        return { ...b, valuationMin, valuationMax: b.valuationMax ?? valuationMin, loanMin, loanMax: b.loanMax ?? loanMin, mortgageRatio, supplementalRatio: b.supplementalRatio ?? 0, mortgageRate: b.mortgageRate ?? b.rate ?? '', supplementalRate: b.supplementalRate ?? '', status: hasValuation || hasLoan ? b.status : 'waiting' };
      }) }));
      const initial = seedData(); localStorage.setItem(STORAGE_KEY, JSON.stringify(initial)); return initial;
    }
    catch { return seedData(); }
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(cases)); }
  function loadBanks() {
    try {
      const saved = JSON.parse(localStorage.getItem(BANK_LIST_KEY) || 'null');
      return Array.isArray(saved) ? [...new Set([...DEFAULT_BANKS, ...saved].map(name => String(name).trim()).filter(Boolean))] : [...DEFAULT_BANKS];
    } catch { return [...DEFAULT_BANKS]; }
  }
  function saveBanks() { localStorage.setItem(BANK_LIST_KEY, JSON.stringify(banks)); }
  function addBankToList(name) {
    const cleanName = String(name || '').trim();
    if (!cleanName) { showToast('請輸入銀行名稱'); return false; }
    if (banks.some(bank => bank.toLocaleLowerCase() === cleanName.toLocaleLowerCase())) { showToast('這家銀行已在清單中'); return false; }
    banks.push(cleanName); saveBanks(); return true;
  }
  function loadSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      if ((stored.fontScaleVersion || 1) < 2) {
        const oldScale = Number(stored.fontScale) || 1;
        stored.fontScale = Math.min(1.5, Math.max(0.8, Math.round((oldScale / 1.2) * 10) / 10));
        stored.fontScaleVersion = 2;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ displayName: '林地政士', ...stored }));
      }
      return { displayName: '林地政士', fontScale: 1, fontScaleVersion: 2, ...stored };
    } catch { return { displayName: '林地政士', fontScale: 1, fontScaleVersion: 2 }; }
  }
  function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  function applySettings() {
    const name = (settings.displayName || '林地政士').trim() || '林地政士';
    const scale = Math.min(1.5, Math.max(0.8, Number(settings.fontScale) || 1)); document.documentElement.style.setProperty('--font-scale', scale.toFixed(2));
    $('#profileName').textContent = name; $('#greetingName').textContent = name;
    $$('.profile-avatar').forEach(node => { node.textContent = [...name][0] || '林'; });
  }
  function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function allBankItems() { return cases.flatMap(c => c.banks.map(b => ({ ...b, caseId: c.id, caseName: c.name, broker: c.broker, caseState: c.state }))); }
  function waitingItems() { return allBankItems().filter(b => b.status === 'waiting' && b.caseState === 'active'); }
  function reminderItems() { return waitingItems().filter(b => daysBetween(b.dueDate) <= 2).sort((a, b) => daysBetween(a.dueDate) - daysBetween(b.dueDate)); }
  function caseProgress(c) { const total = c.banks.length; const replied = c.banks.filter(b => b.status === 'replied').length; return { total, replied, percent: total ? Math.round(replied / total * 100) : 0 }; }
  function earliestDue(c) { const pending = c.banks.filter(b => b.status === 'waiting' && b.dueDate); return pending.length ? pending.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0].dueDate : ''; }
  function dueText(date) { const days = daysBetween(date); if (days < 0) return `逾期 ${Math.abs(days)} 天`; if (days === 0) return '今天到期'; if (days === 1) return '明天到期'; return `${days} 天後`; }
  function dueClass(date) { return daysBetween(date) <= 2 ? 'soon' : ''; }
  function statusHtml(status, label) { return `<span class="status-badge ${status === 'replied' ? 'done' : status === 'pending' ? 'pending' : 'neutral'}">${escapeHtml(label)}</span>`; }
  function amountText(min, max) {
    if (min == null && max == null) return '—';
    const low = min == null ? max : min; const high = max == null ? low : max;
    return low === high ? `${Number(low).toLocaleString()} 萬` : `${Number(low).toLocaleString()}–${Number(high).toLocaleString()} 萬`;
  }
  function rangeUpper(b, prefix) { const max = b[`${prefix}Max`]; const min = b[`${prefix}Min`]; return Number(max ?? min) || 0; }
  function ratioText(b) { const mortgage = Number(b.mortgageRatio) || 0; const supplemental = Number(b.supplementalRatio) || 0; return `${mortgage}% + ${supplemental}%（共 ${mortgage + supplemental}%）`; }
  function bankProgress(c) { const p = caseProgress(c); return `<div class="progress-label"><div class="progress-track"><div class="progress-fill" style="width:${p.percent}%"></div></div><span class="progress-text">${p.replied}/${p.total} 家</span></div>`; }
  function bankChips(c) { const names = c.banks.slice(0, 2).map(b => `<span class="bank-chip">${escapeHtml(b.name.replace('銀行',''))}</span>`).join(''); const extra = c.banks.length > 2 ? `<span class="bank-chip more-chip">+${c.banks.length - 2}</span>` : ''; return `<div class="bank-chips">${names}${extra}</div>`; }
  function brokerCell(c) { return c.brokerStatus === 'replied' ? statusHtml('replied', '已回覆') : statusHtml('pending', '待回覆'); }
  function caseRow(c) {
    const due = earliestDue(c);
    const stateLabel = c.state === 'completed' ? `已完成 · ${prettyDate(c.completedAt)}` : '進行中';
    return `<tr class="case-clickable" data-case-row="${c.id}" tabindex="0" role="link" aria-label="開啟案件：${escapeHtml(c.name)}"><td><div class="case-name"><span class="property-mark">⌂</span><span><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.address || '尚未填寫地址')}</small><small>${stateLabel}</small></span></div></td><td class="case-price">${c.price ? `${Number(c.price).toLocaleString()} 萬` : '—'}</td><td>${bankChips(c)}</td><td>${bankProgress(c)}</td><td class="date-cell ${due ? dueClass(due) : ''}">${due ? `${prettyDate(due)} <span>${dueText(due)}</span>` : '—'}</td><td>${brokerCell(c)}</td><td><button class="row-action" data-action="detail" data-id="${c.id}" aria-label="查看案件">···</button></td></tr>`;
  }
  function reminderRow(b) {
    const d = daysBetween(b.dueDate);
    const urgency = d < 0 ? '已逾期，請儘快透過 LINE 追蹤' : d === 0 ? '今天到期，建議今天收網' : `期限前提醒，建議於 ${prettyDate(dateOffset(0))} 安排追蹤`;
    return `<div class="followup-item"><span class="followup-mark">◷</span><div class="followup-copy"><div class="followup-title">${escapeHtml(b.caseName)} <span style="color:#aaa;font-weight:400">·</span> ${escapeHtml(b.name)}</div><div class="followup-desc">${escapeHtml(b.broker)} 提供的案件 · ${urgency}</div></div><span class="deadline">${d < 0 ? `逾期 ${Math.abs(d)} 天` : `期限 ${prettyDate(b.dueDate)}`}</span><button class="followup-action" data-action="detail" data-id="${b.caseId}" aria-label="查看案件">→</button></div>`;
  }
  function renderDashboard() {
    const active = cases.filter(c => c.state === 'active'); const waiting = waitingItems(); const reminders = reminderItems(); const brokerPending = active.filter(c => c.brokerStatus === 'pending' && c.banks.some(b => b.status === 'replied'));
    $('#metricActive').textContent = active.length; $('#metricWaiting').textContent = waiting.length; $('#metricFollowup').textContent = reminders.length; $('#metricBroker').textContent = brokerPending.length;
    $('#navCaseCount').textContent = active.length; $('#bellDot').classList.toggle('hidden', reminders.length === 0); $('#bellDot').textContent = reminders.length > 9 ? '9+' : reminders.length; $('#reminderBell').setAttribute('aria-label', `提醒通知：${reminders.length} 項待追蹤；開啟清單`);
    const list = $('#followupList'); list.innerHTML = reminders.slice(0, 3).map(reminderRow).join('');
    $('#followupPanel').classList.toggle('hidden', reminders.length === 0);
    $('#followupSubtitle').textContent = reminders.length ? `${reminders.length} 家銀行已進入追蹤提醒時間` : '回覆期限前兩天，提醒會顯示在這裡';
    const body = $('#caseRows'); body.innerHTML = active.slice(0, 5).map(caseRow).join('');
    $('#emptyCases').classList.toggle('hidden', active.length !== 0);
    if (active.length === 0) { $('#emptyCases h3').textContent = '目前沒有進行中的案件'; $('#emptyCases p').textContent = '已完成案件可在所有案件中切換查看。'; }
  }
  function renderCases() {
    const filtered = cases.filter(c => {
      const matchFilter = currentFilter === 'all' || (currentFilter === 'active' && c.state === 'active') || (currentFilter === 'completed' && c.state === 'completed') || (currentFilter === 'waiting' && c.state === 'active' && c.banks.some(b => b.status === 'waiting')) || (currentFilter === 'broker' && c.state === 'active' && c.brokerStatus === 'pending' && c.banks.some(b => b.status === 'replied'));
      const query = searchTerm.toLowerCase(); const matchSearch = !query || [c.name, c.address, c.broker].some(s => (s || '').toLowerCase().includes(query)); return matchFilter && matchSearch;
    });
    $('#allCaseRows').innerHTML = filtered.map(caseRow).join(''); $('#emptySearch').classList.toggle('hidden', filtered.length !== 0);
    $('#filterAllCount').textContent = cases.length; $('#filterAllCount').parentElement.childNodes[0].textContent = `全部 `;
  }
  function renderReminders() {
    const items = reminderItems(); const allWaiting = waitingItems();
    $('#reminderSummary').innerHTML = `<div class="summary-card"><span>提醒中</span><strong>${items.length}</strong></div><div class="summary-card"><span>全部待回覆</span><strong>${allWaiting.length}</strong></div><div class="summary-card"><span>已逾期</span><strong>${allWaiting.filter(b => daysBetween(b.dueDate) < 0).length}</strong></div>`;
    $('#allReminderList').innerHTML = items.map(reminderRow).join(''); $('#emptyReminders').classList.toggle('hidden', items.length !== 0);
  }
  function renderAll() { renderDashboard(); renderCases(); renderReminders(); }
  function switchView(view) {
    currentView = view; const map = { dashboard: ['dashboardView', '案件總覽'], cases: ['casesView', '所有案件'], reminders: ['remindersView', '待追蹤'] };
    Object.entries(map).forEach(([key, [id]]) => $(`#${id}`).classList.toggle('hidden', key !== view));
    $$('.nav-link').forEach(b => b.classList.toggle('active', b.dataset.view === view)); $('#breadcrumbTitle').textContent = map[view][1]; $('#sidebar').classList.remove('open');
    if (view === 'cases') renderCases(); if (view === 'reminders') renderReminders();
  }
  function showToast(message) { const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = message; $('#toastRegion').append(toast); setTimeout(() => toast.remove(), 2800); }
  function openModal(title, eyebrow, content) { $('#modalTitle').textContent = title; $('#modalEyebrow').textContent = eyebrow; $('#modalBody').innerHTML = content; $('.modal', $('#modalOverlay')).classList.toggle('case-detail-modal', title === '案件詳情'); $('#modalOverlay').classList.remove('hidden'); $('#modalOverlay').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeModal() { $('#modalOverlay').classList.add('hidden'); $('#modalOverlay').setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; applySettings(); }
  function openSettings() {
    const name = settings.displayName || '林地政士'; const percent = Math.min(150, Math.max(80, Math.round((Number(settings.fontScale) || 1) * 10) * 10));
    openModal('個人化設定', '顯示偏好', `<form id="settingsForm"><div class="form-grid"><div class="field full"><label for="displayName">顯示名稱</label><input id="displayName" name="displayName" maxlength="30" value="${escapeHtml(name)}" placeholder="例如：林地政士"><span class="field-hint">名稱會顯示在首頁問候與個人資料中。</span></div><div class="field full"><div class="range-label-row"><label for="fontScale">字體大小</label><output id="fontScaleValue" for="fontScale">${percent}%</output></div><div class="range-wrap"><span>80%</span><input id="fontScale" name="fontScale" type="range" min="80" max="150" step="10" value="${percent}" list="fontScaleTicks"><span>150%</span><datalist id="fontScaleTicks"><option value="80"></option><option value="100"></option><option value="120"></option><option value="150"></option></datalist></div><span class="field-hint">拖動滑桿即時預覽；圖示大小維持不變。</span></div><div class="form-actions field full"><button type="button" class="button button-quiet" id="resetFontScale">恢復 100%</button><span class="form-spacer"></span><button type="button" class="button button-quiet" data-action="close-modal">取消</button><button type="submit" class="button button-primary">儲存設定</button></div></div></form>`);
    const range = $('#fontScale'); const value = $('#fontScaleValue');
    range.addEventListener('input', () => { value.value = `${range.value}%`; value.textContent = `${range.value}%`; document.documentElement.style.setProperty('--font-scale', (Number(range.value) / 100).toFixed(2)); });
    $('#resetFontScale').addEventListener('click', () => { range.value = '100'; range.dispatchEvent(new Event('input')); });
    $('#settingsForm').addEventListener('submit', e => { e.preventDefault(); const fd = new FormData(e.currentTarget); settings.displayName = fd.get('displayName').trim() || '地政士'; settings.fontScale = Number(fd.get('fontScale')) / 100; settings.fontScaleVersion = 2; saveSettings(); applySettings(); closeModal(); showToast('個人化設定已儲存'); });
  }
  function openNewCase() {
    const options = banks.filter(b => COMMON_BANKS.includes(b)).map(b => `<label class="bank-option"><input type="checkbox" name="bank" value="${escapeHtml(b)}" ${COMMON_BANKS.indexOf(b) < 3 ? 'checked' : ''}><span>${escapeHtml(b)}</span></label>`).join('');
    const otherOptions = banks.filter(b => !COMMON_BANKS.includes(b)).map(b => `<label class="bank-option"><input type="checkbox" name="bank" value="${escapeHtml(b)}"><span>${escapeHtml(b)}</span></label>`).join('');
    const customBankRows = () => banks.filter(b => !DEFAULT_BANKS.includes(b)).map(b => `<span class="custom-bank-chip">${escapeHtml(b)}<button type="button" aria-label="刪除自訂銀行 ${escapeHtml(b)}" data-action="remove-custom-bank" data-bank-name="${escapeHtml(b)}">×</button></span>`).join('');
    openModal('建立詢價案件', '新案件', `<form id="newCaseForm"><div class="form-grid"><div class="field full"><label for="caseName">案件名稱 *</label><input id="caseName" name="name" required placeholder="例如：林先生・桃園藝文特區"></div><div class="field"><label for="address">物件地址</label><input id="address" name="address" placeholder="縣市／行政區／路段"></div><div class="field"><label for="broker">房仲姓名 *</label><input id="broker" name="broker" required placeholder="輸入聯絡房仲"></div><div class="field"><label for="price">預估成交價（萬元）</label><input id="price" name="price" type="number" min="0" placeholder="例如：1680"></div><div class="field"><label for="created">詢價日期</label><input id="created" name="created" type="date" value="${dateOffset(0)}"></div><div class="field"><label for="dueDate">希望回覆期限</label><input id="dueDate" name="dueDate" type="date" value="${dateOffset(3)}"><span class="field-hint">建立後可逐家銀行調整期限。</span></div><div class="form-section-title">選擇詢價銀行</div><div class="field full"><strong class="bank-group-label">常用銀行優先顯示</strong><div class="bank-select" id="newCaseBankSelect">${options}</div>${otherOptions ? `<details class="other-bank-list"><summary>其他銀行（${banks.filter(b => !COMMON_BANKS.includes(b)).length}）</summary><div class="bank-select">${otherOptions}</div></details>` : ''}<div class="inline-add-bank"><label for="newBankName">清單沒有想詢價的銀行？</label><div class="inline-add-row"><input id="newBankName" type="text" maxlength="40" placeholder="輸入銀行名稱"><button class="button button-quiet" type="button" id="addBankToNewCase">新增到清單</button></div><span class="field-hint">新增後會自動勾選，也可供日後建立案件時選用。</span><div class="custom-bank-list" id="customBankList">${customBankRows()}</div></div><span class="field-hint">勾選本次要詢價的銀行。可在建立後逐家設定回覆期限。</span></div><div class="form-actions field full"><button class="button button-quiet" type="button" data-action="close-modal">取消</button><button class="button button-primary" type="submit">建立案件</button></div></div></form>`);
    $('#addBankToNewCase').addEventListener('click', () => {
      const input = $('#newBankName'); const name = input.value.trim();
      if (!addBankToList(name)) return;
      const label = document.createElement('label'); label.className = 'bank-option';
      label.innerHTML = `<input type="checkbox" name="bank" value="${escapeHtml(name)}" checked><span>${escapeHtml(name)}</span>`;
      $('#newCaseBankSelect').append(label); $('#customBankList').insertAdjacentHTML('beforeend', `<span class="custom-bank-chip">${escapeHtml(name)}<button type="button" aria-label="刪除自訂銀行 ${escapeHtml(name)}" data-action="remove-custom-bank" data-bank-name="${escapeHtml(name)}">×</button></span>`); input.value = ''; showToast(`已新增「${name}」並選取`);
    });
    $('#newCaseForm').addEventListener('submit', e => {
      e.preventDefault(); const form = new FormData(e.currentTarget); const selected = $$('input[name="bank"]:checked', e.currentTarget).map(el => el.value);
      if (!selected.length) { showToast('請至少選擇一家詢價銀行'); return; }
      const created = form.get('created') || dateOffset(0); const c = { id: crypto.randomUUID(), name: form.get('name').trim(), address: form.get('address').trim(), broker: form.get('broker').trim(), price: Number(form.get('price')) || null, created, banks: selected.map(name => ({ name, inquiryDate: created, dueDate: form.get('dueDate') || '', status: 'waiting' })), brokerStatus: 'pending', brokerReply: '', brokerRepliedAt: '', state: 'active' };
      cases.unshift(c); save(); renderAll(); closeModal(); showToast('案件已建立，請為各家銀行設定回覆期限'); openCaseDetail(c.id);
    });
  }
  function renderOfferComparison(c, sortBy = 'loan') {
    const offers = c.banks.filter(b => b.status === 'replied').slice().sort((a, b) => {
      const num = (value) => Number(value) || 0;
      const rate = (value) => { const match = String(value || '').match(/[0-9]+(?:\.[0-9]+)?/); return match ? Number(match[0]) : Infinity; };
      if (sortBy === 'rate') return rate(a.mortgageRate ?? a.rate) - rate(b.mortgageRate ?? b.rate);
      if (sortBy === 'ratio') return (num(b.mortgageRatio) + num(b.supplementalRatio)) - (num(a.mortgageRatio) + num(a.supplementalRatio));
      if (sortBy === 'valuation') return rangeUpper(b, 'valuation') - rangeUpper(a, 'valuation');
      return rangeUpper(b, 'loan') - rangeUpper(a, 'loan');
    });
    const rows = offers.map((b, i) => `<tr><td><span class="rank-badge ${i === 0 ? 'top-rank' : ''}">${i + 1}</span></td><td><strong>${escapeHtml(b.name)}</strong></td><td>${amountText(b.valuationMin ?? b.valuation, b.valuationMax ?? b.valuation)}</td><td><strong>${amountText(b.loanMin ?? b.loan, b.loanMax ?? b.loan)}</strong></td><td>${ratioText(b)}</td><td>房貸 ${escapeHtml(b.mortgageRate ?? b.rate ?? '未提供')}<br>信貸/修繕 ${escapeHtml(b.supplementalRate || '未提供')}</td><td>${escapeHtml(b.years || '—')}</td></tr>`).join('');
    const sortLabels = { loan: '可貸額度上限高至低', rate: '房貸利率低至高', ratio: '合計成數高至低', valuation: '預估總價上限高至低' };
    return `<section class="detail-section comparison-panel" id="offerSortPanel"><div class="comparison-heading"><div><h3>銀行方案比較</h3><p>${offers.length ? `目前排序：${sortLabels[sortBy] || sortLabels.loan}` : '登錄銀行回覆後，方案會集中顯示於此。'}</p></div>${offers.length > 1 ? `<label class="sort-control">排序依據<select id="offerSort" data-id="${c.id}"><option value="loan" ${sortBy === 'loan' ? 'selected' : ''}>可貸額度上限高至低</option><option value="rate" ${sortBy === 'rate' ? 'selected' : ''}>房貸利率低至高</option><option value="ratio" ${sortBy === 'ratio' ? 'selected' : ''}>合計成數高至低</option><option value="valuation" ${sortBy === 'valuation' ? 'selected' : ''}>預估總價上限高至低</option></select></label>` : ''}</div>${offers.length ? `<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>排序</th><th>銀行</th><th>預估總價</th><th>可貸額度</th><th>成數</th><th>利率</th><th>年限</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="compare-empty">目前還沒有銀行回覆</div>'}</section>`;
  }
  function openCaseDetail(id) {
    const c = cases.find(item => item.id === id); if (!c) return;
    const bankCards = c.banks.map((b, index) => `<article class="bank-detail"><div class="bank-detail-top"><span class="bank-logo">${escapeHtml(b.name.slice(0, 2))}</span><strong>${escapeHtml(b.name)}</strong>${statusHtml(b.status, b.status === 'replied' ? '已回覆' : '等待回覆')}</div><div class="bank-detail-body"><div class="detail-value"><span>詢價日期</span><strong>${prettyDate(b.inquiryDate, true)}</strong></div><div class="detail-value"><span>希望回覆期限</span><strong>${b.dueDate ? prettyDate(b.dueDate, true) : '尚未設定'}</strong></div><div class="detail-value"><span>${b.status === 'replied' ? '預估總價' : '目前狀態'}</span><strong>${b.status === 'replied' ? amountText(b.valuationMin ?? b.valuation, b.valuationMax ?? b.valuation) : '待銀行回覆'}</strong></div><div class="detail-value"><span>可貸額度</span><strong>${b.status === 'replied' ? amountText(b.loanMin ?? b.loan, b.loanMax ?? b.loan) : '—'}</strong></div>${b.status === 'replied' ? `<div class="detail-value"><span>房貸 + 信貸/修繕貸成數</span><strong>${ratioText(b)}</strong></div><div class="detail-value"><span>房貸利率</span><strong>${escapeHtml(b.mortgageRate ?? b.rate ?? '未提供')}</strong></div><div class="detail-value"><span>信貸/修繕貸利率</span><strong>${escapeHtml(b.supplementalRate || '未提供')}</strong></div><div class="detail-value"><span>貸款年限</span><strong>${escapeHtml(b.years || '—')}</strong></div><div class="detail-value" style="grid-column:span 2"><span>補充備註</span><strong>${escapeHtml(b.note || '—')}</strong></div>` : ''}${c.state === 'active' ? `<div class="bank-detail-actions"><button class="small-button" data-action="edit-due" data-id="${c.id}" data-index="${index}">設定期限</button><button class="small-button primary" data-action="edit-response" data-id="${c.id}" data-index="${index}">${b.status === 'replied' ? '編輯回覆' : '登錄銀行回覆'}</button></div>` : ''}</div></article>`).join('');
    const p = caseProgress(c);
    const actions = c.state === 'active' ? `<button class="button button-primary" data-action="complete-case" data-id="${c.id}">標記為已完成</button>` : `<div class="summary-action-row"><div><label>已完成</label><span class="field-hint">完成日期：${prettyDate(c.completedAt, true)}</span></div><button class="button button-quiet" data-action="reopen-case" data-id="${c.id}">重新開啟</button></div>`;
    const readOnly = c.state === 'completed' ? 'disabled' : '';
    const brokerSection = `<div class="detail-section broker-reply-section"><h3>房仲回覆紀錄</h3><form id="brokerForm"><div class="broker-summary-tools"><div><strong>銀行回覆摘要</strong><p>產生後可查看、修改，再複製並貼到 LINE；訊息由你手動傳送。</p></div><div class="broker-summary-actions"><button type="button" class="button button-quiet" data-action="generate-summary" data-id="${c.id}" ${readOnly}>產生摘要</button><button type="button" class="button button-quiet" data-action="copy-summary" data-id="${c.id}">複製內容</button></div></div><div class="form-grid"><div class="field"><label>回覆狀態</label><select name="status" ${readOnly}><option value="pending" ${c.brokerStatus !== 'replied' ? 'selected' : ''}>尚未回覆</option><option value="replied" ${c.brokerStatus === 'replied' ? 'selected' : ''}>已透過 LINE 回覆</option></select></div><div class="field"><label>回覆日期</label><input name="date" type="date" value="${c.brokerRepliedAt || dateOffset(0)}" ${readOnly}></div><div class="field full"><label>回覆內容紀錄</label><textarea name="reply" placeholder="可產生銀行回覆摘要，也可自行記錄實際提供給房仲的內容" ${readOnly}>${escapeHtml(c.brokerReply || '')}</textarea></div><div class="form-actions field full">${c.state === 'active' ? '<button class="button button-primary" type="submit">儲存回覆紀錄</button>' : '<span class="field-hint">已完成案件的回覆紀錄僅供查看。</span>'}</div></div></form></div>`;
    const deleteAction = `<div class="detail-section delete-case-row"><button class="button button-danger" data-action="delete-case" data-id="${c.id}">刪除案件</button></div>`;
    openModal('案件詳情', c.state === 'completed' ? `已完成 · ${prettyDate(c.completedAt, true)}` : '案件追蹤', `<div class="detail-headline"><span class="property-mark">⌂</span><div><h3>${escapeHtml(c.name)}</h3><p>${escapeHtml(c.address || '地址尚未填寫')}</p></div></div><div class="detail-meta"><div><span>房仲</span><strong>${escapeHtml(c.broker)}</strong></div><div><span>預估成交價</span><strong>${c.price ? `${c.price.toLocaleString()} 萬元` : '尚未填寫'}</strong></div><div><span>銀行回覆</span><strong>${p.replied} / ${p.total} 家</strong></div></div>${renderOfferComparison(c)}<div class="detail-section"><h3>銀行詢價進度</h3>${bankCards}${c.state === 'active' ? `<button class="small-button" data-action="add-bank" data-id="${c.id}">＋ 新增詢價銀行</button>` : ''}</div>${brokerSection}<div class="detail-section">${actions}</div>${deleteAction}`);
    if (c.state === 'active') $('#brokerForm').addEventListener('submit', e => { e.preventDefault(); const fd = new FormData(e.currentTarget); c.brokerStatus = fd.get('status'); c.brokerRepliedAt = fd.get('status') === 'replied' ? fd.get('date') : ''; c.brokerReply = fd.get('reply').trim(); save(); renderAll(); openCaseDetail(c.id); showToast('房仲回覆紀錄已更新'); });
  }
  function openDeleteCase(id) {
    const c = cases.find(item => item.id === id); if (!c) return;
    openModal('確認刪除案件', '刪除前請確認', `<div class="delete-warning"><strong>確定刪除「${escapeHtml(c.name)}」嗎？</strong><p>這會刪除案件資料、${c.banks.length} 家銀行詢價與回覆紀錄，以及房仲回覆紀錄。</p><p>刪除後無法復原。這只會刪除目前瀏覽器儲存的資料。</p></div><div class="form-actions"><button type="button" class="button button-quiet" data-action="detail" data-id="${c.id}">取消</button><button type="button" class="button button-danger" data-action="confirm-delete-case" data-id="${c.id}">確認刪除</button></div>`);
  }
  function deleteCase(id) {
    const c = cases.find(item => item.id === id); if (!c) return;
    cases = cases.filter(item => item.id !== id); save(); renderAll(); closeModal(); showToast(`案件「${c.name}」已刪除`);
  }
  function openCompleteCase(id) {
    const c = cases.find(item => item.id === id); if (!c || c.state !== 'active') return;
    const waiting = c.banks.filter(bank => bank.status === 'waiting');
    const warning = waiting.length ? `<div class="warning-note"><strong>仍有 ${waiting.length} 家銀行尚未回覆</strong><p>${waiting.map(bank => escapeHtml(bank.name)).join('、')}</p><p>結案後，這些銀行將停止出現在待追蹤提醒中。仍要結案嗎？</p></div>` : '<p class="field-hint">結案後，案件會移至「已完成」，並停止待追蹤提醒。</p>';
    openModal('確認完成案件', '案件結案', `<div class="form-grid"><div class="field full">${warning}</div><div class="form-actions field full"><button type="button" class="button button-quiet" data-action="detail" data-id="${c.id}">返回案件</button><button type="button" class="button button-primary" data-action="confirm-complete" data-id="${c.id}">確認結案</button></div></div>`);
  }
  function completeCase(id) {
    const c = cases.find(item => item.id === id); if (!c || c.state !== 'active') return;
    c.state = 'completed'; c.completedAt = localDate(new Date()); save(); renderAll(); openCaseDetail(id); showToast('案件已完成，追蹤提醒已停止');
  }
  function reopenCase(id) {
    const c = cases.find(item => item.id === id); if (!c || c.state !== 'completed') return;
    c.state = 'active'; save(); renderAll(); openCaseDetail(id); showToast('案件已重新開啟');
  }
  function openDueForm(id, index) {
    const c = cases.find(x => x.id === id); const b = c?.banks[index]; if (!b) return;
    openModal('設定回覆期限', b.name, `<form id="dueForm"><div class="form-grid"><div class="field"><label>詢價日期</label><input type="date" name="inquiryDate" value="${b.inquiryDate || dateOffset(0)}"></div><div class="field"><label>希望回覆日期 *</label><input type="date" name="dueDate" required value="${b.dueDate || dateOffset(3)}"><span class="field-hint">系統將在期限前兩天提醒你追蹤。</span></div><div class="form-actions field full"><button type="button" class="button button-quiet" data-action="detail" data-id="${c.id}">返回</button><button class="button button-primary" type="submit">儲存期限</button></div></div></form>`);
    $('#dueForm').addEventListener('submit', e => { e.preventDefault(); const fd = new FormData(e.currentTarget); b.inquiryDate = fd.get('inquiryDate'); b.dueDate = fd.get('dueDate'); save(); renderAll(); openCaseDetail(c.id); showToast('回覆期限已更新'); });
  }
  function openResponseForm(id, index) {
    const c = cases.find(x => x.id === id); const b = c?.banks[index]; if (!b) return;
    const amountFields = (label, prefix, oldValue) => { const min = b[`${prefix}Min`] ?? b[oldValue] ?? ''; const max = b[`${prefix}Max`] ?? b[oldValue] ?? ''; return `<div class="field"><label>${label}（萬元）</label><div class="amount-range-inputs"><input name="${prefix}Min" type="number" min="0" step="0.1" value="${min}" placeholder="最低，例如 550"><input name="${prefix}Max" type="number" min="0" step="0.1" value="${max}" placeholder="最高，例如 600"></div><span class="field-hint">單一金額請在兩格填相同數字；範圍請填最低與最高。</span></div>`; };
    openModal('登錄銀行回覆', b.name, `<form id="responseForm"><div class="form-grid">${amountFields('預估總價', 'valuation', 'valuation')}${amountFields('可貸額度', 'loan', 'loan')}<div class="field"><label>房貸成數（%）</label><input name="mortgageRatio" type="number" min="0" max="100" step="0.1" value="${Number(b.mortgageRatio ?? b.ratio) || 0}" placeholder="例如：70"></div><div class="field"><label>信貸／修繕貸成數（%）</label><input name="supplementalRatio" type="number" min="0" max="100" step="0.1" value="${Number(b.supplementalRatio) || 0}" placeholder="例如：15"></div><div class="field"><label>房貸利率</label><input name="mortgageRate" value="${escapeHtml(b.mortgageRate ?? b.rate ?? '')}" placeholder="例如：2.35%"></div><div class="field"><label>信貸／修繕貸利率</label><input name="supplementalRate" value="${escapeHtml(b.supplementalRate || '')}" placeholder="例如：4.5%"></div><div class="field"><label>貸款年限</label><input name="years" value="${escapeHtml(b.years || '')}" placeholder="例如：30 年"></div><div class="field"><label>收到回覆日期</label><input name="repliedAt" type="date" value="${b.repliedAt || dateOffset(0)}"></div><div class="field full"><label>補充條件／備註</label><textarea name="note" placeholder="例如：需補財力證明、依實際審核為準">${escapeHtml(b.note || '')}</textarea></div><div class="form-actions field full"><button type="button" class="button button-quiet" data-action="detail" data-id="${c.id}">返回</button><button class="button button-primary" type="submit">儲存回覆</button></div></div></form>`);
    $('#responseForm').addEventListener('submit', e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const readAmount = (key) => fd.get(key) === '' ? null : Number(fd.get(key)); b.valuationMin = readAmount('valuationMin'); b.valuationMax = readAmount('valuationMax'); b.loanMin = readAmount('loanMin'); b.loanMax = readAmount('loanMax');
      if ((b.valuationMin != null && b.valuationMax != null && b.valuationMin > b.valuationMax) || (b.loanMin != null && b.loanMax != null && b.loanMin > b.loanMax)) { showToast('金額範圍的最低值不可高於最高值'); return; }
      b.valuation = b.valuationMin; b.loan = b.loanMin; b.mortgageRatio = Number(fd.get('mortgageRatio')) || 0; b.supplementalRatio = Number(fd.get('supplementalRatio')) || 0; b.mortgageRate = fd.get('mortgageRate').trim(); b.supplementalRate = fd.get('supplementalRate').trim(); b.years = fd.get('years').trim(); b.note = fd.get('note').trim(); b.repliedAt = fd.get('repliedAt'); b.status = b.valuationMin != null || b.valuationMax != null || b.loanMin != null || b.loanMax != null ? 'replied' : 'waiting'; save(); renderAll(); openCaseDetail(c.id); showToast(b.status === 'replied' ? `${b.name} 回覆已登錄` : `${b.name} 尚未填寫總價或可貸額度，維持等待回覆`); });
  }
  function createBrokerSummary(c) {
    const replied = c.banks.filter(b => b.status === 'replied');
    const waiting = c.banks.filter(b => b.status === 'waiting');
    const lines = [`【房貸詢價結果｜${c.name}】`, `物件地址：${c.address || '未提供'}`, `預估成交價：${c.price ? `${Number(c.price).toLocaleString()} 萬元` : '未提供'}`, '', '銀行回覆：'];
    if (!replied.length) lines.push('目前尚無銀行回覆。');
    replied.forEach((b, index) => {
      const valuation = amountText(b.valuationMin ?? b.valuation, b.valuationMax ?? b.valuation);
      const loan = amountText(b.loanMin ?? b.loan, b.loanMax ?? b.loan);
      const details = [`預估總價 ${valuation === '—' ? '未提供' : valuation}`, `可貸額度 ${loan === '—' ? '未提供' : loan}`];
      details.push(`成數 ${ratioText(b)}`); if (b.mortgageRate) details.push(`房貸利率 ${b.mortgageRate}`); if (b.supplementalRate) details.push(`信貸/修繕貸利率 ${b.supplementalRate}`); if (b.years) details.push(`年限 ${b.years}`);
      lines.push(`${index + 1}. ${b.name}：${details.join('；')}${b.note ? `；備註：${b.note}` : ''}`);
    });
    if (waiting.length) lines.push('', `尚待回覆：${waiting.map(b => b.name).join('、')}`);
    return lines.join('\n');
  }
  async function copyBrokerSummary(id) {
    const textarea = $('#brokerForm textarea[name="reply"]'); if (!textarea) return;
    const summary = textarea.value.trim();
    if (!summary) { showToast('請先產生摘要或輸入回覆內容'); return; }
    textarea.focus();
    try { await navigator.clipboard.writeText(summary); showToast('內容已複製，可貼到 LINE 手動傳送'); }
    catch { textarea.select(); showToast('已選取內容，請複製後貼到 LINE'); }
  }
  function generateBrokerSummary(id) {
    const c = cases.find(item => item.id === id); const textarea = $('#brokerForm textarea[name="reply"]'); if (!c || !textarea) return;
    textarea.value = createBrokerSummary(c); textarea.focus(); showToast('銀行回覆摘要已產生，可編輯後複製');
  }
  function exportCsv() {
    const headers = ['案件名稱','物件地址','房仲','預估成交價（萬元）','詢價銀行','詢價日期','希望回覆日期','銀行回覆狀態','預估總價最低（萬元）','預估總價最高（萬元）','可貸額度最低（萬元）','可貸額度最高（萬元）','房貸成數（%）','信貸修繕貸成數（%）','房貸利率','信貸修繕貸利率','貸款年限','銀行備註','房仲回覆狀態','房仲回覆日期','房仲回覆內容','案件狀態','完成日期'];
    const quote = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = cases.flatMap(c => (c.banks.length ? c.banks : [{}]).map(b => [c.name,c.address,c.broker,c.price,b.name,b.inquiryDate,b.dueDate,b.status === 'replied' ? '已回覆' : b.status === 'waiting' ? '等待回覆' : '',b.valuationMin ?? b.valuation,b.valuationMax ?? b.valuation,b.loanMin ?? b.loan,b.loanMax ?? b.loan,b.mortgageRatio ?? b.ratio ?? 0,b.supplementalRatio ?? 0,b.mortgageRate ?? b.rate,b.supplementalRate,b.years,b.note,c.brokerStatus === 'replied' ? '已回覆房仲' : '待回覆房仲',c.brokerRepliedAt,c.brokerReply,c.state === 'active' ? '進行中' : '已完成',c.completedAt || ''].map(quote).join(',')));
    const csv = '\uFEFF' + [headers.map(quote).join(','), ...rows].join('\r\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `MortgageHub_案件匯出_${localDate(new Date())}.csv`; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url); showToast(`已匯出 ${cases.length} 筆案件資料`);
  }
  function openAddBank(id) {
    const c = cases.find(x => x.id === id); if (!c) return; const available = banks.filter(b => !c.banks.some(item => item.name.toLocaleLowerCase() === b.toLocaleLowerCase()));
    openModal('新增詢價銀行', c.name, `<form id="addBankForm"><div class="form-grid"><div class="field full"><label for="addBankSelect">選擇銀行</label><select name="bank" id="addBankSelect" ${available.length ? '' : 'disabled'}>${available.length ? available.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('') : '<option value="">清單中的銀行都已加入</option>'}</select></div><div class="field full"><label for="addBankCustomName">或新增銀行名稱</label><div class="inline-add-row"><input id="addBankCustomName" name="customBank" type="text" maxlength="40" placeholder="輸入清單中沒有的銀行"></div><span class="field-hint">新銀行會加入你的本機清單，並新增到這筆案件。</span><div class="custom-bank-list">${banks.filter(b => !DEFAULT_BANKS.includes(b)).map(b => `<span class="custom-bank-chip">${escapeHtml(b)}<button type="button" aria-label="刪除自訂銀行 ${escapeHtml(b)}" data-action="remove-custom-bank" data-bank-name="${escapeHtml(b)}">×</button></span>`).join('')}</div></div><div class="field"><label>詢價日期</label><input name="inquiryDate" type="date" value="${dateOffset(0)}"></div><div class="field"><label>希望回覆日期</label><input name="dueDate" type="date" value="${dateOffset(3)}"></div><div class="form-actions field full"><button type="button" class="button button-quiet" data-action="detail" data-id="${c.id}">返回</button><button class="button button-primary" type="submit">新增銀行</button></div></div></form>`);
    $('#addBankForm').addEventListener('submit', e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const customName = String(fd.get('customBank') || '').trim(); let bankName = customName || String(fd.get('bank') || '').trim(); if (!bankName) { showToast('請選擇或輸入銀行名稱'); return; } if (c.banks.some(item => item.name.toLocaleLowerCase() === bankName.toLocaleLowerCase())) { showToast('這家銀行已加入此案件'); return; } if (customName && !banks.some(bank => bank.toLocaleLowerCase() === customName.toLocaleLowerCase())) addBankToList(customName); c.banks.push({ name: bankName, inquiryDate: fd.get('inquiryDate'), dueDate: fd.get('dueDate'), status: 'waiting' }); save(); renderAll(); openCaseDetail(c.id); showToast('詢價銀行已新增'); });
  }
  function handleAction(action, id, index, bankName) {
    if (action === 'remove-custom-bank') {
      if (!bankName) return;
      banks = banks.filter(bank => bank !== bankName); saveBanks();
      const chip = [...document.querySelectorAll('[data-bank-name]')].find(button => button.dataset.bankName === bankName)?.closest('.custom-bank-chip'); if (chip) chip.remove();
      document.querySelectorAll('input[name="bank"]').forEach(input => { if (input.value === bankName) input.closest('label')?.remove(); });
      showToast(`已刪除自訂銀行「${bankName}」；既有案件紀錄保留`); return;
    }
    if (action === 'detail') openCaseDetail(id); if (action === 'close-modal') closeModal(); if (action === 'edit-due') openDueForm(id, Number(index)); if (action === 'edit-response') openResponseForm(id, Number(index)); if (action === 'generate-summary') generateBrokerSummary(id); if (action === 'add-bank') openAddBank(id); if (action === 'copy-summary') copyBrokerSummary(id); if (action === 'complete-case') openCompleteCase(id); if (action === 'confirm-complete') completeCase(id); if (action === 'reopen-case') reopenCase(id); if (action === 'delete-case') openDeleteCase(id); if (action === 'confirm-delete-case') deleteCase(id);
  }
  function refreshDateLabel() {
    const now = new Date();
    const hour = now.getHours();
    $('#greetingTime').textContent = hour >= 6 && hour < 12 ? '早安' : hour >= 12 && hour < 18 ? '午安' : '晚安';
    $('#todayLabel').textContent = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(now);
  }

  $$('.nav-link').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
  $('#newCaseBtn').addEventListener('click', openNewCase); $('#newCaseBtn2').addEventListener('click', openNewCase); $('#emptyNewCase').addEventListener('click', openNewCase);  $('#profileSettings').addEventListener('click', openSettings);

  $('#seeAllCases').addEventListener('click', () => switchView('cases')); $('#seeReminders').addEventListener('click', () => switchView('reminders')); $('#reminderBell').addEventListener('click', () => switchView('reminders'));
  $('#menuToggle').addEventListener('click', () => {
    if (window.matchMedia('(max-width: 850px)').matches) $('#sidebar').classList.toggle('open');
    else { document.body.classList.toggle('sidebar-collapsed'); localStorage.setItem('mortgagehub-sidebar-collapsed', document.body.classList.contains('sidebar-collapsed') ? '1' : '0'); }
    $('#menuToggle').setAttribute('aria-label', document.body.classList.contains('sidebar-collapsed') ? '展開側欄' : '收合側欄');
  });
  if (localStorage.getItem('mortgagehub-sidebar-collapsed') === '1') document.body.classList.add('sidebar-collapsed');
  $('#closeModal').addEventListener('click', closeModal);
  $('#modalOverlay').addEventListener('click', e => { if (e.target === $('#modalOverlay')) closeModal(); });
  let lastTouchOpen = { id: '', at: 0 };
  document.addEventListener('pointerup', e => {
    if (e.pointerType !== 'touch') return;
    if (e.target.closest('button, a, input, select, textarea')) return;
    const row = e.target.closest('[data-case-row]'); if (!row) return;
    lastTouchOpen = { id: row.dataset.caseRow, at: Date.now() }; openCaseDetail(row.dataset.caseRow);
  });
  document.addEventListener('click', e => { const button = e.target.closest('[data-action]'); if (button) { handleAction(button.dataset.action, button.dataset.id, button.dataset.index, button.dataset.bankName); return; } const row = e.target.closest('[data-case-row]'); if (row) { if (lastTouchOpen.id === row.dataset.caseRow && Date.now() - lastTouchOpen.at < 900) return; openCaseDetail(row.dataset.caseRow); } });
  document.addEventListener('keydown', e => { const row = e.target.closest('[data-case-row]'); if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openCaseDetail(row.dataset.caseRow); } });
  const updateOfferSort = e => { if (e.target.id !== 'offerSort') return; const c = cases.find(item => item.id === e.target.dataset.id); const panel = $('#offerSortPanel'); if (!c || !panel) return; const replacement = document.createElement('div'); replacement.innerHTML = renderOfferComparison(c, e.target.value); panel.replaceWith(replacement.firstElementChild); };
  document.addEventListener('input', updateOfferSort); document.addEventListener('change', updateOfferSort);
  $('#caseSearch').addEventListener('input', e => { searchTerm = e.target.value.trim(); renderCases(); });
  $$('.filter-pill').forEach(button => button.addEventListener('click', () => { currentFilter = button.dataset.filter; $$('.filter-pill').forEach(b => b.classList.toggle('active', b === button)); renderCases(); }));
  $('#exportCsvBtn').addEventListener('click', exportCsv);
  $$('[data-metric-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.metricAction;
    if (action === 'followup') { switchView('reminders'); return; }
    currentFilter = ['active', 'waiting', 'broker'].includes(action) ? action : 'all'; searchTerm = ''; $('#caseSearch').value = '';
    $$('.filter-pill').forEach(pill => pill.classList.toggle('active', pill.dataset.filter === currentFilter)); switchView('cases');
  }));
  applySettings();
  refreshDateLabel(); setInterval(refreshDateLabel, 60000); renderAll();
})();














