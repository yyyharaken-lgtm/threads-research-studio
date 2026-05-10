/* ============================================
   Threads Research Studio - フロントエンド
   静的データ（data.json）を読み込んで表示するシンプル版
   ============================================ */

// ===== ジャンル定義 =====
// data.json に登場するジャンル名と、表示用のアイコン・並び順を定義
const GENRES = [
  { name: '美容',        icon: '💄' },
  { name: 'お金',        icon: '💰' },
  { name: '育児',        icon: '👶' },
  { name: '恋愛',        icon: '💕' },
  { name: '占い',        icon: '🔮' },
  { name: 'AI',          icon: '🤖' },
  { name: '転職',        icon: '💼' },
  { name: '健康',        icon: '🌿' },
  { name: 'ダイエット',  icon: '💪' },
];

// ===== 状態 =====
const state = {
  data: null,           // data.json の中身
  currentGenre: null,   // 表示中のジャンル
};

// ===== DOM ヘルパー =====
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ===== ビュー切り替え =====
function showView(viewName) {
  $$('.view').forEach(v => v.classList.remove('active'));
  const target = $(`[data-view="${viewName}"]`);
  if (target) target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== トースト =====
function showToast(message, duration = 2500) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ===== HTMLエスケープ =====
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== クリップボードコピー =====
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => showToast('クリップボードにコピーしました'))
    .catch(() => showToast('コピーに失敗しました'));
}

// ===== データ読み込み =====
async function loadData() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error(`データを読み込めませんでした (${res.status})`);
    state.data = await res.json();
    return state.data;
  } catch (e) {
    console.error('データ読み込み失敗:', e);
    state.data = { updated_at: '—', posts: [] };
    return state.data;
  }
}

// ===== ホーム画面の表示 =====
function renderHome() {
  const data = state.data;
  const posts = data.posts || [];

  // 統計
  $('#totalCount').textContent = posts.length;

  // ジャンル別の件数を計算
  const genreCounts = {};
  posts.forEach(p => {
    genreCounts[p.genre] = (genreCounts[p.genre] || 0) + 1;
  });

  const activeGenreCount = Object.keys(genreCounts).length;
  $('#genreCount').textContent = activeGenreCount;

  // 最終更新日
  $('#updatedAt').textContent = data.updated_at || '—';

  // ジャンルカード
  const grid = $('#genreGrid');
  grid.innerHTML = '';

  GENRES.forEach(genre => {
    const count = genreCounts[genre.name] || 0;
    const card = document.createElement('div');
    card.className = 'genre-card';
    if (count === 0) card.classList.add('empty');
    card.innerHTML = `
      <div class="genre-icon">${genre.icon}</div>
      <div class="genre-name">${genre.name}</div>
      <div class="genre-count">${count}件</div>
    `;
    card.addEventListener('click', () => {
      if (count === 0) {
        showToast(`${genre.name}ジャンルの投稿はまだありません`);
        return;
      }
      openGenre(genre);
    });
    grid.appendChild(card);
  });
}

// ===== ジャンル詳細画面の表示 =====
function openGenre(genre, fromPopstate = false) {
  state.currentGenre = genre;
  const posts = (state.data?.posts || [])
    .filter(p => p.genre === genre.name)
    .sort((a, b) => {
      // 新着順（posted_at の降順）
      const da = a.posted_at || '';
      const db = b.posted_at || '';
      return db.localeCompare(da);
    });

  $('#genreDetailTitle').textContent = `${genre.icon} ${genre.name}`;
  $('#genreDetailMeta').textContent = `${posts.length}件の投稿`;

  renderPostList(posts);
  showView('genre-detail');

  // ブラウザの履歴に追加（戻るボタンで戻れるように）
  if (!fromPopstate) {
    history.pushState({ view: 'genre-detail', genre: genre.name }, '', `#${encodeURIComponent(genre.name)}`);
  }
}

// ===== ホーム画面に戻る（履歴追加） =====
function goHome(fromPopstate = false) {
  showView('home');
  if (!fromPopstate) {
    history.pushState({ view: 'home' }, '', '#');
  }
}

function renderPostList(posts) {
  const list = $('#postList');
  list.innerHTML = '';

  if (posts.length === 0) {
    list.innerHTML = `
      <div class="post-card" style="text-align:center;color:var(--text-3);">
        該当する投稿がありません
      </div>
    `;
    return;
  }

  posts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'post-card';

    const tags = [];
    if (post.posted_at) tags.push(`<span class="post-tag">${post.posted_at}</span>`);
    if (post.likes !== undefined) tags.push(`<span class="post-tag likes">❤ ${post.likes}</span>`);

    const authorUrl = post.author_url || '#';
    const postUrl = post.post_url || '#';
    const text = escapeHtml(post.post_text || '');

    card.innerHTML = `
      <div class="post-meta">
        <a class="post-author" href="${authorUrl}" target="_blank" rel="noopener">@${post.author_name || '?'}</a>
        <div class="post-tags">${tags.join('')}</div>
      </div>
      <div class="post-text">${text}</div>
      <div class="post-actions">
        <a href="${postUrl}" target="_blank" rel="noopener">
          <svg class="threads-icon-sm" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd" aria-hidden="true">
            <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.31-.883-2.367-.89h-.029c-.85 0-2.005.233-2.74 1.323l-1.692-1.143c.984-1.461 2.583-2.264 4.43-2.264h.04c3.085.018 4.923 1.912 5.107 5.225.105.044.21.09.31.138 1.405.66 2.434 1.66 2.978 2.892.757 1.715.827 4.512-1.45 6.78-1.738 1.733-3.85 2.49-6.84 2.51zm1.135-11.554c-.376 0-.741.012-1.094.03-1.789.1-2.926.916-2.873 1.78.058.871.93 1.323 2.213 1.234 1.18-.062 2.704-.508 2.961-3.473a10.0 10.0 0 0 0-1.207-.07z"/>
          </svg>
          元投稿で読む
        </a>
        <button class="post-copy">📋 本文をコピー</button>
      </div>
    `;

    card.querySelector('.post-copy').addEventListener('click', () => {
      copyToClipboard(post.post_text || '');
    });

    list.appendChild(card);
  });
}

// ===== イベント設定 =====
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
      const genre = GENRES.find(g => g.name === st.genre);
      if (genre) openGenre(genre, true);
    }
  });
}

// ===== エラー表示 =====
function showError(message) {
  $('#errorMessage').textContent = message;
  showView('error');
}

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadData();
  renderHome();

  // URLハッシュから初期表示を決定（直リンク・リロード対応）
  const hash = decodeURIComponent(location.hash.replace('#', ''));
  if (hash) {
    const genre = GENRES.find(g => g.name === hash);
    if (genre) {
      openGenre(genre, true);
    } else {
      showView('home');
    }
  } else {
    showView('home');
    history.replaceState({ view: 'home' }, '', '#');
  }
});
