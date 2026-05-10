/* ============================================
   Threadsバズ投稿の教科書 - フロントエンド
   ============================================ */

// モノクロ線画SVGアイコン（エディトリアル仕様）
const SVG_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const SVG_CLOSE = '</svg>';

const GENRES = [
  { name: '美容', icon: SVG_OPEN + '<rect x="9" y="2.5" width="6" height="6" rx="1"/><rect x="8" y="8.5" width="8" height="3"/><rect x="9" y="11.5" width="6" height="10"/>' + SVG_CLOSE },
  { name: 'お金', icon: SVG_OPEN + '<circle cx="12" cy="12" r="9"/><path d="M8 7l4 5 4-5M12 12v8M9 14h6M9 17h6"/>' + SVG_CLOSE },
  { name: '育児', icon: SVG_OPEN + '<path d="M9 2.5h6M10 2.5v3M14 2.5v3"/><rect x="7.5" y="5.5" width="9" height="16" rx="2"/><path d="M7.5 11h9"/>' + SVG_CLOSE },
  { name: '恋愛', icon: SVG_OPEN + '<rect x="3" y="6" width="18" height="13" rx="1"/><path d="M3 8l9 6 9-6"/>' + SVG_CLOSE },
  { name: '占い', icon: SVG_OPEN + '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/><path d="M5 4l.7 1.4L7 6l-1.3.6L5 8l-.7-1.4L3 6l1.3-.6z"/>' + SVG_CLOSE },
  { name: 'AI', icon: SVG_OPEN + '<path d="M12 2a3 3 0 0 0-3 3v.5a3 3 0 0 0-3 3v.7a3 3 0 0 0-1.5 5.2A3 3 0 0 0 6 19.5a3 3 0 0 0 6 0V2z"/><path d="M12 2a3 3 0 0 1 3 3v.5a3 3 0 0 1 3 3v.7a3 3 0 0 1 1.5 5.2A3 3 0 0 1 18 19.5a3 3 0 0 1-6 0V2z"/>' + SVG_CLOSE },
  { name: '転職', icon: SVG_OPEN + '<rect x="5" y="4" width="14" height="17" rx="1"/><path d="M9 2h6v3H9z"/><path d="M8 10h8M8 14h6M8 18h4"/>' + SVG_CLOSE },
  { name: '健康', icon: SVG_OPEN + '<path d="M11 20A7 7 0 0 1 4 13V8a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v5a7 7 0 0 1-7 7"/><path d="M11 20v-9c0-3 2-7 7-9"/>' + SVG_CLOSE },
  { name: 'ダイエット', icon: SVG_OPEN + '<path d="M3 9v6M5 7v10M19 7v10M21 9v6"/><path d="M5 12h14"/>' + SVG_CLOSE },
];

const state = {
  data: null,
  currentGenre: null,
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function showView(viewName) {
  $$('.view').forEach(v => v.classList.remove('active'));
  const target = $(`[data-view="${viewName}"]`);
  if (target) target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showToast(message, duration = 2500) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => showToast('Copied to clipboard'))
    .catch(() => showToast('Copy failed'));
}

async function loadData() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error(`Failed to load (${res.status})`);
    state.data = await res.json();
    return state.data;
  } catch (e) {
    console.error('Data load failed:', e);
    state.data = { updated_at: '—', posts: [] };
    return state.data;
  }
}

function renderHome() {
  const data = state.data;
  const posts = data.posts || [];

  $('#totalCount').textContent = posts.length;

  const genreCounts = {};
  posts.forEach(p => {
    genreCounts[p.genre] = (genreCounts[p.genre] || 0) + 1;
  });

  const activeGenreCount = Object.keys(genreCounts).length;
  $('#genreCount').textContent = activeGenreCount;

  // 日付をナビに反映
  if (data.updated_at) {
    const dateStr = data.updated_at.replace(/-/g, '.');
    $('#navDate').textContent = dateStr;
  }

  // ジャンルカード
  const grid = $('#genreGrid');
  grid.innerHTML = '';

  GENRES.forEach((genre, i) => {
    const count = genreCounts[genre.name] || 0;
    const card = document.createElement('div');
    card.className = 'genre-card';
    if (count === 0) card.classList.add('empty');
    const num = String(i + 1).padStart(2, '0');
    card.innerHTML = `
      <div>
        <div class="genre-num">№ ${num}</div>
        <div class="genre-icon">${genre.icon}</div>
        <div class="genre-name">${genre.name}</div>
      </div>
      <div class="genre-count">${count} POSTS</div>
    `;
    card.addEventListener('click', () => {
      if (count === 0) {
        showToast(`${genre.name}ジャンルの投稿はまだありません`);
        return;
      }
      openGenre(genre, i + 1);
    });
    grid.appendChild(card);
  });
}

function openGenre(genre, num, fromPopstate = false) {
  state.currentGenre = genre;
  const posts = (state.data?.posts || [])
    .filter(p => p.genre === genre.name)
    .sort((a, b) => {
      const da = a.posted_at || '';
      const db = b.posted_at || '';
      return db.localeCompare(da);
    });

  $('#genreDetailNum').textContent = `CHAPTER ${String(num + 1).padStart(2, '0')}`;
  $('#genreDetailTitle').innerHTML = `${genre.icon} <span style="vertical-align:middle">${genre.name}</span>`;
  $('#genreDetailMeta').textContent = `${posts.length} posts collected`;

  renderPostList(posts);
  showView('genre-detail');

  if (!fromPopstate) {
    history.pushState({ view: 'genre-detail', genre: genre.name, num }, '', `#${encodeURIComponent(genre.name)}`);
  }
}

function goHome(fromPopstate = false) {
  showView('home');
  if (!fromPopstate) {
    history.pushState({ view: 'home' }, '', '#');
  }
}

const THREADS_SVG = `<svg class="threads-icon-sm" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.31-.883-2.367-.89h-.029c-.85 0-2.005.233-2.74 1.323l-1.692-1.143c.984-1.461 2.583-2.264 4.43-2.264h.04c3.085.018 4.923 1.912 5.107 5.225.105.044.21.09.31.138 1.405.66 2.434 1.66 2.978 2.892.757 1.715.827 4.512-1.45 6.78-1.738 1.733-3.85 2.49-6.84 2.51zm1.135-11.554c-.376 0-.741.012-1.094.03-1.789.1-2.926.916-2.873 1.78.058.871.93 1.323 2.213 1.234 1.18-.062 2.704-.508 2.961-3.473a10.0 10.0 0 0 0-1.207-.07z"/></svg>`;

function renderPostList(posts) {
  const list = $('#postList');
  list.innerHTML = '';

  if (posts.length === 0) {
    list.innerHTML = `
      <div class="post-card" style="text-align:center;color:var(--ink-3);padding:60px 0;">
        該当する投稿がありません
      </div>
    `;
    return;
  }

  posts.forEach((post, i) => {
    const card = document.createElement('div');
    card.className = 'post-card';

    const tags = [];
    if (post.posted_at) tags.push(`<span class="post-tag">${post.posted_at}</span>`);
    if (post.likes !== undefined) tags.push(`<span class="post-tag likes">♥ ${post.likes}</span>`);

    const authorUrl = post.author_url || '#';
    const postUrl = post.post_url || '#';
    const text = escapeHtml(post.post_text || '');
    const num = String(i + 1).padStart(2, '0');

    card.innerHTML = `
      <div class="post-meta">
        <span class="post-num">№ ${num}</span>
        <a class="post-author" href="${authorUrl}" target="_blank" rel="noopener">@${post.author_name || '?'}</a>
        <div class="post-tags">${tags.join('')}</div>
      </div>
      <div class="post-text">${text}</div>
      <div class="post-actions">
        <a href="${postUrl}" target="_blank" rel="noopener">${THREADS_SVG} View on Threads</a>
        <button class="post-copy">Copy text</button>
      </div>
    `;

    card.querySelector('.post-copy').addEventListener('click', () => {
      copyToClipboard(post.post_text || '');
    });

    list.appendChild(card);
  });
}

function setupEventListeners() {
  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'go-home') {
      goHome();
    }
  });

  // ブラウザの戻る/進むボタンに対応
  window.addEventListener('popstate', (e) => {
    const st = e.state;
    if (!st || st.view === 'home') {
      showView('home');
    } else if (st.view === 'genre-detail' && st.genre) {
      const idx = GENRES.findIndex(g => g.name === st.genre);
      if (idx >= 0) openGenre(GENRES[idx], idx, true);
    }
  });
}

function showError(message) {
  $('#errorMessage').textContent = message;
  showView('error');
}

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadData();
  renderHome();

  // URLハッシュから初期表示を決定（直リンク・リロード対応）
  const hash = decodeURIComponent(location.hash.replace('#', ''));
  if (hash) {
    const idx = GENRES.findIndex(g => g.name === hash);
    if (idx >= 0) {
      openGenre(GENRES[idx], idx, true);
    } else {
      showView('home');
    }
  } else {
    showView('home');
    history.replaceState({ view: 'home' }, '', '#');
  }
});
