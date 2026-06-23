/* ===== TOAST ===== */
function showToast(msg, type = '') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast' + (type ? ' toast-' + type : '');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .4s'; setTimeout(() => toast.remove(), 400); }, 2600);
}

/* ===== CHATBOT FAB ===== */
(function initChatFab() {
  const fab = document.getElementById('chatFab');
  const win = document.getElementById('chatWindow');
  const closeBtn = document.getElementById('chatClose');
  const clearBtn = document.getElementById('chatClear');
  const sendBtn  = document.getElementById('chatSend');
  const inputEl  = document.getElementById('chatInput');
  const bodyEl   = document.getElementById('chatBody');
  const endEl    = document.getElementById('chatEnd');

  if (!fab) return;

  fab.addEventListener('click', () => {
    win.style.display = win.style.display === 'flex' ? 'none' : 'flex';
    fab.textContent = win.style.display === 'flex' ? '✕' : '💬';
  });
  closeBtn?.addEventListener('click', () => {
    win.style.display = 'none';
    fab.textContent = '💬';
  });
  clearBtn?.addEventListener('click', () => {
    chatHistory = [];
    bodyEl.querySelectorAll('.chat-msg').forEach(el => el.remove());
    showWelcome();
  });

  let chatHistory = [];

  function showWelcome() {
    const nickname = document.body.dataset.nickname || '';
    appendBotMsg(`안녕하세요${nickname ? ' ' + nickname + '님' : ''}! 🍽️\n오늘 뭐 드시고 싶으세요?`);
  }

  function appendUserMsg(text) {
    const div = document.createElement('div');
    div.className = 'chat-msg user';
    div.textContent = text;
    bodyEl.insertBefore(div, endEl);
    endEl.scrollIntoView({ behavior: 'smooth' });
  }

  function appendBotMsg(text) {
    const div = document.createElement('div');
    div.className = 'chat-msg bot';
    div.style.whiteSpace = 'pre-wrap';
    div.textContent = text;
    bodyEl.insertBefore(div, endEl);
    endEl.scrollIntoView({ behavior: 'smooth' });
  }

  function appendLoading() {
    const div = document.createElement('div');
    div.className = 'chat-msg bot';
    div.id = 'chatLoading';
    div.textContent = '생각 중... 🤔';
    bodyEl.insertBefore(div, endEl);
    endEl.scrollIntoView({ behavior: 'smooth' });
    return div;
  }

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;
    appendUserMsg(text);
    chatHistory.push({ role: 'user', content: text });
    inputEl.value = '';
    sendBtn.disabled = true;

    const userInfo = document.body.dataset;
    const system = `당신은 오늘의 메뉴 앱의 AI 음식 추천 챗봇입니다.
사용자: ${userInfo.nickname || '게스트'} | 알러지: ${userInfo.allergies || '없음'} | 선호: ${userInfo.prefs || '없음'}
친근하고 자연스러운 한국어로, 알러지 재료 없는 음식 위주로 추천해주세요.`;

    const loading = appendLoading();
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          system,
          messages: chatHistory
        })
      });
      const data = await res.json();
      const reply = data.content?.map(b => b.text || '').join('') || '오류가 발생했습니다.';
      loading.remove();
      appendBotMsg(reply);
      chatHistory.push({ role: 'assistant', content: reply });
    } catch {
      loading.remove();
      appendBotMsg('일시적인 오류가 발생했습니다. 다시 시도해주세요.');
    }
    sendBtn.disabled = false;
    inputEl.focus();
  }

  sendBtn?.addEventListener('click', sendMessage);
  inputEl?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

  // Quick suggestions
  document.querySelectorAll('.chat-quick').forEach(btn => {
    btn.addEventListener('click', () => { inputEl.value = btn.dataset.text; sendMessage(); });
  });

  showWelcome();
})();

/* ===== BANNER SLIDER ===== */
(function initBannerSlider() {
  const slides = document.querySelectorAll('.banner-slide');
  if (slides.length <= 1) return;
  let idx = 0;
  function next() {
    slides[idx].style.display = 'none';
    idx = (idx + 1) % slides.length;
    slides[idx].style.display = 'flex';
  }
  slides.forEach((s, i) => { s.style.display = i === 0 ? 'flex' : 'none'; });
  setInterval(next, 4000);
})();

/* ===== LOCATION BUTTON ===== */
document.getElementById('locBtn')?.addEventListener('click', function () {
  if (!navigator.geolocation) { showToast('위치 서비스를 지원하지 않습니다', 'danger'); return; }
  this.textContent = '위치 확인 중...';
  this.disabled = true;
  navigator.geolocation.getCurrentPosition(pos => {
    fetch(`/api/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
      .then(r => r.json())
      .then(data => {
        showToast(`반경 500m 내 ${data.length}개 식당 발견!`, 'success');
        renderNearbyCards(data);
      });
    this.textContent = '📍 위치 다시 불러오기';
    this.disabled = false;
  }, () => {
    showToast('위치 권한을 허용해주세요', 'danger');
    this.textContent = '📍 내 주변 찾기';
    this.disabled = false;
  });
});

function renderNearbyCards(items) {
  const grid = document.getElementById('nearbyGrid');
  if (!grid) return;
  if (items.length === 0) { grid.innerHTML = '<p class="text-muted text-center" style="grid-column:1/-1;padding:24px">주변 500m 내 식당이 없습니다</p>'; return; }
  grid.innerHTML = items.slice(0, 8).map(r => `
    <a href="/menu/${r.id}" class="card rest-card">
      <div class="card-img">${catIcon(r.category)}</div>
      <div class="card-body">
        <div class="badge badge-primary">${r.category || '기타'}</div>
        <div class="card-title mt-8">${escHtml(r.name)}</div>
        <div class="rest-meta">
          <span class="stars">★</span>
          <span class="rest-rating">${r.rating?.toFixed(1) || '0.0'}</span>
          <span class="rest-dist">🚶 ${r.dist}m</span>
        </div>
        <div class="rest-addr">${escHtml(r.address || '')}</div>
      </div>
    </a>`).join('');
}

function catIcon(cat) {
  const map = {'한식':'🍚','일식':'🍣','중식':'🥟','양식':'🥩','분식':'🍜','치킨':'🍗','피자':'🍕','카페':'☕','술집':'🍺'};
  return map[cat] || '🍴';
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ===== MYPAGE TABS ===== */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const target = this.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
    this.classList.add('active');
    const panel = document.getElementById('tab-' + target);
    if (panel) panel.style.display = 'block';
  });
});
document.querySelectorAll('.tab-panel').forEach((p, i) => { p.style.display = i === 0 ? 'block' : 'none'; });

/* ===== FLASH auto-dismiss ===== */
document.querySelectorAll('.alert').forEach(el => {
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .5s'; setTimeout(() => el.remove(), 500); }, 3500);
});

/* ===== MANNER GAUGE ===== */
(function initManner() {
  const gauge = document.getElementById('mannerGauge');
  if (!gauge) return;
  const score = parseFloat(gauge.dataset.score || 36.5);
  const pct   = Math.min(score / 50, 1);
  const r     = 36;
  const circ  = 2 * Math.PI * r;
  const offset= circ * (1 - pct);
  const circle = gauge.querySelector('circle.progress');
  if (circle) { circle.style.strokeDasharray = circ; circle.style.strokeDashoffset = offset; }
  const numEl = gauge.querySelector('.manner-val');
  if (numEl) numEl.textContent = score;
})();
