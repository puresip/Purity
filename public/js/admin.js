let PW = sessionStorage.getItem('puresip_pw') || '';
let state = { settings: {}, banners: [] };

const $ = id => document.getElementById(id);

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

async function doLogin() {
  const pw = $('pw').value;
  $('loginErr').textContent = '';
  const res = await fetch('/api/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw })
  });
  if (res.ok) {
    PW = pw;
    sessionStorage.setItem('puresip_pw', pw);
    showAdmin();
  } else {
    $('loginErr').textContent = 'Wrong password. Try again.';
  }
}

function logout() {
  sessionStorage.removeItem('puresip_pw');
  PW = '';
  location.reload();
}

async function showAdmin() {
  $('loginView').style.display = 'none';
  $('adminView').style.display = 'block';
  const res = await fetch('/api/banners');
  state = await res.json();
  $('topEnabled').checked = !!state.settings.topBarEnabled;
  $('topText').value = state.settings.topBarText || '';
  $('rotate').value = state.settings.rotateSeconds || 5;
  renderBanners();
}

function renderBanners() {
  const list = $('bannerList');
  list.innerHTML = '';
  state.banners.forEach((b, i) => {
    const card = document.createElement('div');
    card.className = 'banner-card';
    card.innerHTML = `
      <div class="head">
        <b>Banner ${i + 1}</b>
        <div style="display:flex;gap:12px;align-items:center">
          <label class="switch" style="margin:0"><input type="checkbox" data-f="enabled" ${b.enabled ? 'checked' : ''}> <span style="font-weight:600;color:#5b7891;font-size:.82rem">Visible</span></label>
          <button class="btn btn-del" data-del="${i}">🗑 Delete</button>
        </div>
      </div>
      <div class="row">
        <div><label>Icon / Emoji</label><input data-f="icon" value="${attr(b.icon)}" maxlength="8"></div>
        <div><label>Button text (CTA)</label><input data-f="cta" value="${attr(b.cta)}"></div>
      </div>
      <label>Title</label>
      <input data-f="title" value="${attr(b.title)}">
      <label>Subtitle</label>
      <textarea data-f="subtitle" rows="2">${attr(b.subtitle)}</textarea>
      <label>Button link (https://, tel:, mailto: or #section)</label>
      <input data-f="link" value="${attr(b.link)}">
      <div class="colors">
        <div><label>Color 1</label><input type="color" data-f="color1" value="${b.color1 || '#0a6fd1'}"></div>
        <div><label>Color 2</label><input type="color" data-f="color2" value="${b.color2 || '#22a7f0'}"></div>
      </div>
      <div class="preview" data-prev>
        <span class="pic" data-pv="icon">${esc(b.icon)}</span>
        <div><h4 data-pv="title">${esc(b.title)}</h4><p data-pv="subtitle">${esc(b.subtitle)}</p></div>
        <span class="tag" data-pv="cta">${esc(b.cta)}</span>
      </div>
    `;
    // wire inputs
    card.querySelectorAll('[data-f]').forEach(input => {
      const f = input.dataset.f;
      const ev = input.type === 'checkbox' || input.type === 'color' ? 'input' : 'input';
      input.addEventListener(ev, () => {
        b[f] = input.type === 'checkbox' ? input.checked : input.value;
        updatePreview(card, b);
      });
    });
    card.querySelector('[data-del]').addEventListener('click', () => {
      if (confirm('Delete this banner?')) { state.banners.splice(i, 1); renderBanners(); }
    });
    list.appendChild(card);
    updatePreview(card, b);
  });
  if (!state.banners.length) {
    list.innerHTML = '<p style="color:#5b7891">No banners yet. Click “Add Banner” to create one.</p>';
  }
}

function updatePreview(card, b) {
  const prev = card.querySelector('[data-prev]');
  prev.style.background = `linear-gradient(120deg, ${b.color1 || '#0a6fd1'}, ${b.color2 || '#22a7f0'})`;
  card.querySelector('[data-pv="icon"]').textContent = b.icon || '💧';
  card.querySelector('[data-pv="title"]').textContent = b.title || 'Title';
  card.querySelector('[data-pv="subtitle"]').textContent = b.subtitle || 'Subtitle text';
  const tag = card.querySelector('[data-pv="cta"]');
  tag.textContent = b.cta || '';
  tag.style.display = b.cta ? '' : 'none';
}

function addBanner() {
  state.banners.push({
    id: 'b' + Date.now(), enabled: true, icon: '💧',
    title: 'New Promotion', subtitle: 'Describe your offer here.',
    cta: 'Order Now', link: 'https://wa.me/923298435156',
    color1: '#0a6fd1', color2: '#22a7f0'
  });
  renderBanners();
}

async function save() {
  $('saveErr').textContent = '';
  state.settings.topBarEnabled = $('topEnabled').checked;
  state.settings.topBarText = $('topText').value;
  state.settings.rotateSeconds = Number($('rotate').value) || 5;
  const res = await fetch('/api/admin/banners', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PW, settings: state.settings, banners: state.banners })
  });
  if (res.ok) {
    toast('✅ Saved! Changes are now live on the website.');
  } else if (res.status === 401) {
    $('saveErr').textContent = 'Session expired — please log in again.';
    setTimeout(logout, 1500);
  } else {
    $('saveErr').textContent = 'Could not save. Please try again.';
  }
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function attr(s) { return esc(s); }

// auto-login if password stored
if (PW) {
  fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: PW }) })
    .then(r => { if (r.ok) showAdmin(); });
}
