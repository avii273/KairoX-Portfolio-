const LS_KEY = 'portfolio_v2';

// ---- EMPTY STARTING STATE ----
function freshData(){
  return {
    theme: 'ocean',
    dark: false,
    activeTab: 'spending',
    target: { name: '', amount: 0, timePeriod: 0, targetSaving: 0, current: 0 },
    saving: { currentSaving: 0, currentInvesting: 0, entries: [] },
    spending: { entries: [] }
  };
}

function load(){
  try {
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return freshData();
    const parsed = JSON.parse(raw);
    const base = freshData();
    return {
      theme: parsed.theme ?? base.theme,
      dark: parsed.dark ?? base.dark,
      activeTab: parsed.activeTab ?? base.activeTab,
      target: { ...base.target, ...(parsed.target||{}) },
      saving: { ...base.saving, ...(parsed.saving||{}) },
      spending: { ...base.spending, ...(parsed.spending||{}) }
    };
  } catch {
    return freshData();
  }
}

function save(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }

let state = load();

const THEMES = { ocean:'#3B82F6', forest:'#10B981', sunset:'#F97316', midnight:'#8B5CF6' };
const CATS = {
  'Groceries': { icon:'🛒', color:'#10B981' },
  'Transport': { icon:'🚕', color:'#3B82F6' },
  'Bills & Utilities': { icon:'💡', color:'#F59E0B' },
  'Dining & Food': { icon:'🍔', color:'#EF4444' },
  'Others': { icon:'📦', color:'#8B5CF6' }
};

const content = document.getElementById('content');
const addChoiceModal = document.getElementById('addChoiceModal');
const formModal = document.getElementById('formModal');
const formContent = document.getElementById('formContent');
const settingsModal = document.getElementById('settingsModal');
const settingsContent = document.getElementById('settingsContent');

// ---------- NUMBER FORMATTING ----------
function fmt(n){
  if(n === null || n === undefined || n === '' || isNaN(n)) return '0';
  return Number(n).toLocaleString('en-LK');
}

// Strip commas and convert to number
function parseNum(str){
  if(typeof str === 'number') return str;
  if(!str) return 0;
  return Number(String(str).replace(/,/g, '')) || 0;
}

// Attach live thousand-separator formatting to an <input type="text">
function attachNumberFormat(input){
  input.addEventListener('input', ()=>{
    // keep only digits
    let raw = input.value.replace(/[^\d]/g, '');
    if(raw === ''){ input.value=''; return; }
    input.value = Number(raw).toLocaleString('en-LK');
  });
}

// init theme
function applyTheme(){
  document.documentElement.style.setProperty('--accent', THEMES[state.theme]||THEMES.ocean);
  document.body.classList.toggle('dark', state.dark);
  document.querySelectorAll('.theme-dot').forEach(b=>b.classList.toggle('active', b.dataset.theme===state.theme));
  const dt = document.getElementById('darkToggle');
  if(dt) dt.checked = state.dark;
}
applyTheme();

// drawer
const drawer = document.getElementById('drawer'), overlay=document.getElementById('overlay');
document.getElementById('menuBtn').onclick=()=>{drawer.classList.add('open');overlay.classList.add('open')}
function closeDrawer(){drawer.classList.remove('open');overlay.classList.remove('open')}
document.getElementById('closeDrawer').onclick=closeDrawer; overlay.onclick=closeDrawer;

// dark toggle & themes
document.getElementById('darkToggle').onchange=e=>{state.dark=e.target.checked; save(); applyTheme();}
document.querySelectorAll('.theme-dot').forEach(btn=>btn.onclick=()=>{state.theme=btn.dataset.theme; save(); applyTheme(); render();});

// ---- RESET ALL ----
document.getElementById('resetAllBtn').onclick = () => {
  if (!confirm('⚠️ Reset ALL data? This will permanently delete every entry, target, and setting.')) return;
  if (!confirm('🔥 Are you absolutely sure? This cannot be undone!')) return;

  localStorage.removeItem(LS_KEY);
  state = freshData();
  save();
  applyTheme();
  render();
  closeDrawer();
  document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open'));
};

// bottom nav
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{
  state.activeTab=b.dataset.tab; save(); render();
});
function syncNav(){
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.tab===state.activeTab));
}

// add modal
document.getElementById('addBtn').onclick=()=>addChoiceModal.classList.add('open');
addChoiceModal.querySelectorAll('.close-modal').forEach(b=>b.onclick=()=>addChoiceModal.classList.remove('open'));
document.querySelectorAll('.choice-card').forEach(c=>c.onclick=()=>{
  addChoiceModal.classList.remove('open');
  openForm(c.dataset.choice);
});
formModal.querySelector('.close-modal').onclick=()=>formModal.classList.remove('open');
settingsModal.querySelector('.close-modal').onclick=()=>settingsModal.classList.remove('open');
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click', e=>{if(e.target===m)m.classList.remove('open')}));

// settings open
document.getElementById('settingsBtn').onclick=()=>{openSettings('target'); settingsModal.classList.add('open')};
document.querySelectorAll('.s-tab').forEach(t=>t.onclick=()=>openSettings(t.dataset.stab));

function openForm(type){
  formModal.classList.add('open');
  if(type==='saving'){
    formContent.innerHTML=`
      <h3>Add Saving</h3>
      <div class="field"><label>*Daily Salary (LKR)</label><div class="input-wrap"><span>LKR</span><input id="f_salary" type="text" inputmode="numeric" placeholder="30,000"></div></div>
      <div class="field"><label>*Daily Saving (LKR)</label><div class="input-wrap"><span>LKR</span><input id="f_saving" type="text" inputmode="numeric" placeholder="3,000"></div></div>
      <div class="field"><label>*Add to Target Portfolio (LKR)</label><div class="input-wrap"><span>LKR</span><input id="f_target" type="text" inputmode="numeric" placeholder="1,000"></div></div>
      <p style="font-size:11px;color:var(--muted);margin:-8px 0 12px">This amount will be added to your Target Portfolio's current progress.</p>
      <button class="btn" style="width:100%;margin-top:8px" id="saveSaving">Add Button</button>
    `;
    ['f_salary','f_saving','f_target'].forEach(id=>attachNumberFormat(document.getElementById(id)));

    document.getElementById('saveSaving').onclick=()=>{
      const sal = parseNum(document.getElementById('f_salary').value);
      const sav = parseNum(document.getElementById('f_saving').value);
      const tar = parseNum(document.getElementById('f_target').value);
      if(!sal || !sav || !tar) return alert('Fill all fields');

      // Save saving entry (no target stored here)
      state.saving.entries.unshift({ salary:sal, saving:sav, date:new Date().toLocaleDateString() });
      state.saving.currentSaving += sav;

      // The "Target" field ADDS to the Target Portfolio's current amount
      state.target.current = (state.target.current || 0) + tar;

      save(); formModal.classList.remove('open'); render();
    };
  } else {
    formContent.innerHTML=`
      <h3>Add Spending</h3>
      <div class="field"><label>Daily Salary (LKR)</label><div class="input-wrap"><span>LKR</span><input id="f_salary" type="text" inputmode="numeric" placeholder="30,000"></div></div>
      <div class="field"><label>Daily Spend (LKR)</label><div class="input-wrap"><span>LKR</span><input id="f_spend" type="text" inputmode="numeric" placeholder="2,500"></div></div>
      <div class="field"><label>Category</label><div class="input-wrap"><select id="f_cat"><option>Groceries</option><option>Transport</option><option>Bills & Utilities</option><option>Dining & Food</option><option>Others</option></select></div></div>
      <button class="btn" style="width:100%;margin-top:8px" id="saveSpend">Add Button</button>
    `;
    ['f_salary','f_spend'].forEach(id=>attachNumberFormat(document.getElementById(id)));

    document.getElementById('saveSpend').onclick=()=>{
      const sal = parseNum(document.getElementById('f_salary').value);
      const sp  = parseNum(document.getElementById('f_spend').value);
      const cat = document.getElementById('f_cat').value;
      if(!sal||!sp) return alert('Fill salary & spend');
      state.spending.entries.unshift({ salary:sal, spend:sp, category:cat, date:new Date().toLocaleDateString() });
      save(); formModal.classList.remove('open'); render();
    };
  }
}

function openSettings(tab){
  document.querySelectorAll('.s-tab').forEach(b=>b.classList.toggle('active', b.dataset.stab===tab));
  if(tab==='target'){
    settingsContent.innerHTML=`
      <div class="field"><label>*Target name</label><div class="input-wrap"><input id="t_name" value="${state.target.name||''}" placeholder="e.g. Dream House"></div></div>
      <div class="field"><label>*Target Amount (LKR)</label><div class="input-wrap"><span>LKR</span><input id="t_amount" type="text" inputmode="numeric" value="${state.target.amount?fmt(state.target.amount):''}" placeholder="200,000"></div></div>
      <div class="field"><label>*Time Period</label><div class="input-wrap"><input id="t_period" type="text" inputmode="numeric" value="${state.target.timePeriod||''}" placeholder="365"><span style="margin-left:8px;font-size:12px;background:var(--bg);padding:4px 8px;border-radius:999px">days</span></div></div>
      <div class="field"><label>*Target daily saving (LKR)</label><div class="input-wrap"><span>LKR</span><input id="t_saving" type="text" inputmode="numeric" value="${state.target.targetSaving?fmt(state.target.targetSaving):''}" placeholder="550"></div></div>
      <div class="field"><label>Current Saved (LKR)</label><div class="input-wrap"><span>LKR</span><input id="t_current" type="text" inputmode="numeric" value="${state.target.current?fmt(state.target.current):''}" placeholder="0"></div></div>
      <button class="btn" style="width:100%" id="changeTarget">Change</button>
    `;
    ['t_amount','t_period','t_saving','t_current'].forEach(id=>attachNumberFormat(document.getElementById(id)));

    document.getElementById('changeTarget').onclick=()=>{
      state.target.name=document.getElementById('t_name').value;
      state.target.amount=parseNum(document.getElementById('t_amount').value);
      state.target.timePeriod=parseNum(document.getElementById('t_period').value);
      state.target.targetSaving=parseNum(document.getElementById('t_saving').value);
      state.target.current=parseNum(document.getElementById('t_current').value);
      save(); settingsModal.classList.remove('open'); render();
    };
  } else {
    settingsContent.innerHTML=`
      <div class="field"><label>*Current Saving (LKR)</label><div class="input-wrap"><span>LKR</span><input id="s_cur" type="text" inputmode="numeric" value="${state.saving.currentSaving?fmt(state.saving.currentSaving):''}" placeholder="0"></div></div>
      <div class="field"><label>*Current investing (LKR)</label><div class="input-wrap"><span>LKR</span><input id="s_inv" type="text" inputmode="numeric" value="${state.saving.currentInvesting?fmt(state.saving.currentInvesting):''}" placeholder="0"></div></div>
      <button class="btn" style="width:100%" id="saveSavingSet">Save</button>
    `;
    ['s_cur','s_inv'].forEach(id=>attachNumberFormat(document.getElementById(id)));

    document.getElementById('saveSavingSet').onclick=()=>{
      state.saving.currentSaving=parseNum(document.getElementById('s_cur').value);
      state.saving.currentInvesting=parseNum(document.getElementById('s_inv').value);
      save(); settingsModal.classList.remove('open'); render();
    };
  }
}

function render(){
  syncNav(); applyTheme();
  const acc = THEMES[state.theme];

  if(state.activeTab==='spending'){
    const entries = state.spending.entries;
    const totalSalary = entries.reduce((a,b)=>a+b.salary,0);
    const totalSpend  = entries.reduce((a,b)=>a+b.spend,0);
    const remaining   = totalSalary - totalSpend;

    const byCat = {};
    entries.forEach(e=>byCat[e.category]=(byCat[e.category]||0)+e.spend);

    if(entries.length===0){
      content.innerHTML=`
        <div class="card"><h2 style="font-size:20px;font-weight:700">Spending Portfolio</h2><p style="color:var(--muted);font-size:13px;margin-top:4px">Track where your money goes (daily)</p></div>
        <div class="empty"><div class="big" style="background:${acc}14">💳</div><h3>Make a portfolio</h3><p>Add your first daily spending to see insights, category breakdown and history.</p><button class="btn" onclick="document.getElementById('addBtn').click()">Add Spending</button></div>
      `;
    } else {
      content.innerHTML=`
        <div class="card"><h2 style="font-size:20px;font-weight:700">Spending Portfolio</h2>
          <div class="stat-grid" style="margin-top:14px">
            <div class="stat"><small>Total Salary Added</small><b>LKR ${fmt(totalSalary)}</b></div>
            <div class="stat"><small>Total Spent</small><b>LKR ${fmt(totalSpend)}</b></div>
            <div class="stat"><small>Remaining</small><b style="color:${acc}">LKR ${fmt(remaining)}</b></div>
            <div class="stat"><small>Entries</small><b>${entries.length}</b></div>
          </div>
          <div style="margin-top:14px">${Object.entries(byCat).map(([k,v])=>{
            const pct = Math.round(v/totalSpend*100);
            return `<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:8px"><span>${CATS[k].icon} ${k}</span><b>LKR ${fmt(v)} · ${pct}%</b></div><div class="bar-wrap"><div class="bar" style="width:${pct}%;background:${CATS[k].color}"></div></div>`
          }).join('')}</div>
        </div>
        <div class="card"><div class="card-title">History</div>${entries.map((e,i)=>`
          <div class="entry">
            <div class="entry-left"><div class="cat" style="background:${CATS[e.category].color}22">${CATS[e.category].icon}</div><div><b style="font-size:13px">LKR ${fmt(e.spend)} · ${e.category}</b><div style="font-size:11px;color:var(--muted)">Salary LKR ${fmt(e.salary)} · ${e.date}</div></div></div>
            <button onclick="delSpend(${i})" style="border:none;background:transparent;cursor:pointer">🗑️</button>
          </div>`).join('')}</div>
      `;
    }

  } else if(state.activeTab==='saving'){
    const entries = state.saving.entries;

    if(entries.length===0){
      content.innerHTML=`
        <div class="card"><h2 style="font-size:20px;font-weight:700">Saving Portfolio</h2><p style="color:var(--muted);font-size:13px;margin-top:4px">Build your savings habit (daily)</p></div>
        <div class="card stat-grid">
          <div class="stat"><small>Current Saving (LKR)</small><b>LKR ${fmt(state.saving.currentSaving)}</b></div>
          <div class="stat"><small>Current Investing (LKR)</small><b>LKR ${fmt(state.saving.currentInvesting)}</b></div>
        </div>
        <div class="empty"><div class="big" style="background:${acc}14">💰</div><h3>Make a portfolio</h3><p>Start adding your daily salary & savings to visualize growth.</p><button class="btn" onclick="document.getElementById('addBtn').click()">Add Saving</button></div>
      `;
    } else {
      const totalSaved    = entries.reduce((a,b)=>a+b.saving,0);
      const totalInvested = state.saving.currentInvesting;
      const totalCombined = totalSaved + totalInvested;

      content.innerHTML=`
        <div class="card"><h2 style="font-size:20px;font-weight:700">Saving Portfolio</h2>
          <div class="stat-grid" style="margin-top:14px">
            <div class="stat"><small>Total (Saving + Investing)</small><b style="color:${acc}">LKR ${fmt(totalCombined)}</b></div>
            <div class="stat"><small>Total Saved</small><b>LKR ${fmt(totalSaved)}</b></div>
            <div class="stat"><small>Current Saving</small><b>LKR ${fmt(state.saving.currentSaving)}</b></div>
            <div class="stat"><small>Investing</small><b>LKR ${fmt(totalInvested)}</b></div>
          </div>
        </div>
        <div class="card"><div class="card-title">Growth (daily)</div>
          <div style="display:flex;align-items:end;gap:6px;height:80px;margin-top:8px">${entries.slice(0,12).reverse().map(e=>`<div style="flex:1;background:${acc};border-radius:6px 6px 0 0;height:${Math.max(8, e.saving/20)}px"></div>`).join('')}</div>
        </div>
        <div class="card"><div class="card-title">History</div>${entries.map((e,i)=>`
          <div class="entry"><div class="entry-left"><div class="cat" style="background:${acc}22">💰</div><div><b style="font-size:13px">LKR ${fmt(e.saving)} saved</b><div style="font-size:11px;color:var(--muted)">Salary LKR ${fmt(e.salary)} · ${e.date}</div></div></div><button onclick="delSave(${i})" style="border:none;background:transparent;cursor:pointer">🗑️</button></div>`).join('')}</div>
      `;
    }

  } else {
    const t = state.target;
    const hasTarget = t.name && t.amount > 0;
    const pct = hasTarget ? Math.min(100, Math.round((t.current / t.amount)*100)) : 0;
    const circ = 2*Math.PI*70;
    const offset = circ - (pct/100)*circ;
    content.innerHTML=`
      <div class="card"><h2 style="font-size:20px;font-weight:700">Target Portfolio</h2><p style="color:var(--muted);font-size:13px;margin-top:4px">${t.name || 'No target set'}</p>
        <div style="display:grid;place-items:center;padding:20px 0">
          <div class="progress-ring">
            <svg width="160" height="160"><circle cx="80" cy="80" r="70" stroke="var(--border)" stroke-width="12" fill="none"/><circle cx="80" cy="80" r="70" stroke="${acc}" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" style="transition:.6s"/></svg>
            <div style="position:absolute;text-align:center"><b style="font-size:28px">${pct}%</b><div style="font-size:11px;color:var(--muted)">${hasTarget?`LKR ${fmt(t.current)} / LKR ${fmt(t.amount)}`:'— / —'}</div></div>
          </div>
        </div>
        <div class="stat-grid">
          <div class="stat"><small>Target Name</small><b style="font-size:14px">${t.name || '—'}</b></div>
          <div class="stat"><small>Target Amount (LKR)</small><b>${hasTarget?`LKR ${fmt(t.amount)}`:'—'}</b></div>
          <div class="stat"><small>Time Period</small><b>${t.timePeriod?`${t.timePeriod} days`:'—'}</b></div>
          <div class="stat"><small>Daily Need (LKR)</small><b style="color:${acc}">${t.targetSaving?`LKR ${fmt(t.targetSaving)}`:'—'}</b></div>
        </div>
        ${hasTarget?`<div class="bar-wrap" style="margin-top:16px;height:10px"><div class="bar" style="width:${pct}%"></div></div>`:''}
      </div>
      ${!hasTarget?`<div class="empty"><div class="big" style="background:${acc}14">🎯</div><h3>Make a portfolio</h3><p>Set your target name, amount and time period in settings to start tracking.</p><button class="btn" onclick="document.getElementById('settingsBtn').click()">Open Settings</button></div>`:`<div class="card"><div class="card-title">Details</div><p style="font-size:13px;line-height:1.6;color:var(--muted)">You need to save <b style="color:var(--text)">LKR ${fmt(t.targetSaving)}/day</b> for <b style="color:var(--text)">${t.timePeriod} days</b> to reach <b style="color:var(--text)">LKR ${fmt(t.amount)}</b> for <b style="color:var(--text)">${t.name}</b>. Currently at LKR ${fmt(t.current)} (${pct}%).</p></div>`}
    `;
  }
}
window.delSpend=(i)=>{state.spending.entries.splice(i,1); save(); render();};
window.delSave=(i)=>{state.saving.entries.splice(i,1); save(); render();};

render();