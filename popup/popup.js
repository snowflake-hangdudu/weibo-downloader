const EXT = typeof browser !== 'undefined' ? browser : chrome;
const VERSION = EXT.runtime.getManifest().version;
document.getElementById('app-version').textContent = 'v' + VERSION;

const $ = (id) => document.getElementById(id);

function isWeiboUrl(url) {
  return url && /(?:^|\.)weibo\.com$|(?:^|\.)weibo\.cn$/i.test((() => {
    try { return new URL(url).hostname; } catch (_) { return ''; }
  })());
}

function isWeiboContentUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    return /^\/(?:\d{4,})\/[A-Za-z0-9]+/.test(path) ||
      /^\/status\/[A-Za-z0-9]+/.test(path) ||
      /^\/detail\/[A-Za-z0-9]+/.test(path) ||
      parsed.hostname === 's.weibo.com';
  } catch (_) {
    return false;
  }
}

function formatCurrentSite(url) {
  if (!url) return '当前页面：—';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '当前页面：' + parsed.protocol.replace(':', '');
    }
    let path = parsed.pathname;
    if (path.length > 24) path = path.slice(0, 24) + '…';
    return '当前页面：' + parsed.hostname + (path && path !== '/' ? path : '');
  } catch {
    return '当前页面：未知';
  }
}

function showState(name) {
  ['state-loading', 'state-video', 'state-empty', 'state-error'].forEach((id) => {
    $(id).classList.toggle('hidden', id !== name);
  });
}

function showEmptyState(tab) {
  const siteEl = $('empty-current-site');
  if (siteEl) siteEl.textContent = formatCurrentSite(tab?.url);
  showState('state-empty');
}

function renderWeibo(info) {
  $('video-title').textContent = info.title || '当前微博';
  const authorEl = $('video-author');
  if (info.author) {
    authorEl.textContent = info.author;
    authorEl.classList.remove('hidden');
  } else {
    authorEl.classList.add('hidden');
  }
  const items = Array.isArray(info.items) ? info.items : [];
  const imageCount = items.filter((item) => item.kind === 'image').length;
  const videoCount = items.filter((item) => item.kind === 'video').length;
  const textCount = items.filter((item) => item.kind === 'text').length;
  $('video-sub').textContent = items.length
    ? `图片 ${imageCount} · 视频 ${videoCount} · 文字 ${textCount}`
    : (info.id || '已打开微博页');

  const cover = $('video-cover');
  const coverPh = $('video-cover-ph');
  const pic = items.find((item) => item.kind === 'image' && item.url)?.url || '';
  if (pic) {
    cover.src = pic;
    cover.onload = () => {
      cover.classList.remove('hidden');
      coverPh.classList.add('hidden');
    };
    cover.onerror = () => {
      cover.classList.add('hidden');
      coverPh.classList.remove('hidden');
    };
  } else {
    cover.classList.add('hidden');
    coverPh.classList.remove('hidden');
  }
  $('btn-open-panel').disabled = false;
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label || '超时')), ms))
  ]);
}

async function init() {
  showState('state-loading');
  const [tab] = await EXT.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !isWeiboUrl(tab.url)) {
    showEmptyState(tab);
    return;
  }

  const tabId = tab.id;
  try {
    const resp = await withTimeout(
      EXT.tabs.sendMessage(tabId, { type: 'WEIBO_DL_GET_INFO' }),
      8000,
      '识别超时'
    );
    if (resp?.ok && resp.data?.info) {
      renderWeibo(resp.data.info);
      showState('state-video');
    } else if (isWeiboContentUrl(tab.url)) {
      throw new Error(resp?.error || '无法读取微博，请先 F5');
    } else {
      showEmptyState(tab);
    }
  } catch (err) {
    if (!isWeiboContentUrl(tab.url)) showEmptyState(tab);
    else {
      $('error-text').textContent = err.message || '加载失败';
      showState('state-error');
    }
  }

  async function openPanel(sheet) {
    try {
      await EXT.tabs.sendMessage(tabId, { type: 'WEIBO_DL_OPEN_PANEL' });
      if (sheet) await EXT.tabs.sendMessage(tabId, { type: 'WEIBO_DL_OPEN_SHEET', sheet });
      window.close();
    } catch {
      $('error-text').textContent = '无法打开面板，请刷新微博页';
      showState('state-error');
    }
  }

  $('btn-open-panel')?.addEventListener('click', () => openPanel());
  $('btn-retry')?.addEventListener('click', async () => {
    if (!tabId) return;
    try {
      await EXT.tabs.reload(tabId);
      window.close();
    } catch {
      $('error-text').textContent = '无法刷新页面，请手动 F5';
      showState('state-error');
    }
  });
}

init();
