// Year
document.getElementById('yr').textContent = new Date().getFullYear();

// Header shadow on scroll
const header = document.getElementById('header');
addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 10));

// Mobile menu
const toggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
toggle.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

// Bubbles
const bubbles = document.getElementById('bubbles');
for (let i = 0; i < 16; i++) {
  const b = document.createElement('span');
  b.className = 'bubble';
  const size = 10 + Math.random() * 46;
  b.style.width = b.style.height = size + 'px';
  b.style.left = Math.random() * 100 + '%';
  b.style.animationDuration = (8 + Math.random() * 12) + 's';
  b.style.animationDelay = (Math.random() * 8) + 's';
  bubbles.appendChild(b);
}

// Scroll reveal
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Animated counters
function animateCount(el) {
  const target = +el.dataset.count;
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 40));
  const t = setInterval(() => {
    cur += step;
    if (cur >= target) { cur = target; clearInterval(t); }
    el.textContent = cur;
  }, 30);
}
const countIO = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { animateCount(e.target); countIO.unobserve(e.target); } });
}, { threshold: 0.5 });
document.querySelectorAll('[data-count]').forEach(el => countIO.observe(el));

// ---------- Promo banners ----------
function safeUrl(link) {
  if (!link) return '#';
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(link)) return link;
  return '#';
}

let promoIndex = 0, promoTimer = null, promoCount = 0;

async function loadBanners() {
  try {
    const res = await fetch('/api/banners');
    const data = await res.json();
    renderTopbar(data.settings);
    renderPromos(data.banners || [], data.settings || {});
  } catch (e) {
    console.warn('Could not load banners', e);
  }
}

let topbarSettings = null;
function renderTopbar(settings) {
  if (settings) topbarSettings = settings;          // remember for resize / font re-render
  const bar = document.getElementById('topbar');
  const raw = (topbarSettings && topbarSettings.topBarText) || '';
  // each non-empty line is a separate headline
  const msgs = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (topbarSettings && topbarSettings.topBarEnabled && msgs.length) {
    const sep = '<span class="tb-sep">✦</span>';
    const unit = msgs.map(m => `<span class="tb-item">${escapeHtml(m)}</span>`).join(sep) + sep;
    bar.style.display = 'block';
    // build one sequence first so we can measure it
    bar.innerHTML = `<div class="tb-track"><span class="tb-seq">${unit}</span></div>`;
    const track = bar.querySelector('.tb-track');
    const seqEl = bar.querySelector('.tb-seq');
    // repeat the headlines until ONE sequence is wider than the screen —
    // otherwise the -50% scroll leaves a blank gap with only a few short messages
    let guard = 0;
    while (seqEl.offsetWidth < bar.offsetWidth + 60 && guard < 40) {
      seqEl.insertAdjacentHTML('beforeend', unit);
      guard++;
    }
    // duplicate the (now full-width) sequence so the -50% scroll loops seamlessly
    const clone = seqEl.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
    // keep a constant scroll speed regardless of how much text there is (~70px/sec)
    const dur = Math.max(12, Math.round(seqEl.offsetWidth / 70));
    track.style.animationDuration = dur + 's';
  } else {
    bar.innerHTML = '';
    bar.style.display = 'none';
  }
}

// Re-fill the ticker once the web font is ready (widths change) and on resize,
// so it never leaves a blank gap regardless of screen size or font load timing.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => { if (topbarSettings) renderTopbar(); });
}
let tbResizeTimer;
addEventListener('resize', () => {
  clearTimeout(tbResizeTimer);
  tbResizeTimer = setTimeout(() => { if (topbarSettings) renderTopbar(); }, 200);
});

function renderPromos(banners, settings) {
  const track = document.getElementById('promoTrack');
  const dotsWrap = document.getElementById('promoDots');
  const list = banners.filter(b => b.enabled);
  track.innerHTML = '';
  dotsWrap.innerHTML = '';
  promoCount = list.length;

  if (!promoCount) {
    track.closest('.promos').style.display = 'none';
    return;
  }
  track.closest('.promos').style.display = 'block';

  list.forEach((b, i) => {
    const el = document.createElement('div');
    el.className = 'promo' + (i === 0 ? ' active' : '');
    el.style.background = `linear-gradient(120deg, ${b.color1 || '#0a6fd1'}, ${b.color2 || '#22a7f0'})`;
    el.innerHTML = `
      <span class="promo-shine"></span>
      <div class="promo-icon">${b.icon || '💧'}</div>
      <div class="promo-body">
        <h3>${escapeHtml(b.title || '')}</h3>
        <p>${escapeHtml(b.subtitle || '')}</p>
      </div>
      ${b.cta ? `<a class="btn" href="${safeUrl(b.link)}" ${/^https?:/.test(b.link) ? 'target="_blank" rel="noopener"' : ''}>${escapeHtml(b.cta)}</a>` : ''}
    `;
    track.appendChild(el);

    const dot = document.createElement('span');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => showPromo(i, true));
    dotsWrap.appendChild(dot);
  });

  // match track height to tallest banner
  requestAnimationFrame(() => {
    let h = 0;
    track.querySelectorAll('.promo').forEach(p => h = Math.max(h, p.offsetHeight));
    track.style.minHeight = h + 'px';
  });

  promoIndex = 0;
  startPromoTimer(settings.rotateSeconds || 5);
}

function showPromo(i, manual) {
  const promos = document.querySelectorAll('.promo');
  const dots = document.querySelectorAll('.dot');
  if (!promos.length) return;
  promoIndex = (i + promoCount) % promoCount;
  promos.forEach((p, idx) => p.classList.toggle('active', idx === promoIndex));
  dots.forEach((d, idx) => d.classList.toggle('active', idx === promoIndex));
  if (manual) startPromoTimer(promoSeconds);
}

let promoSeconds = 5;
function startPromoTimer(sec) {
  promoSeconds = sec;
  clearInterval(promoTimer);
  if (promoCount <= 1) return;
  promoTimer = setInterval(() => showPromo(promoIndex + 1), sec * 1000);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

loadBanners();

// ---------- Comic reader modal ----------
(function () {
  const modal = document.getElementById('comicModal');
  const openBtn = document.getElementById('readComicBtn');
  if (!modal || !openBtn) return;
  const frame = modal.querySelector('.comic-frame');
  let loaded = false;

  function open() {
    if (!loaded) { frame.src = frame.dataset.comicSrc; loaded = true; } // lazy-load on first open
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('comic-open');
  }
  function close() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('comic-open');
  }

  openBtn.addEventListener('click', open);
  modal.querySelectorAll('[data-comic-close]').forEach(el => el.addEventListener('click', close));
  addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
})();
