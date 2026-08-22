(function initWeiboDebug(root) {
  const lines = [];

  function shortUrl(value) {
    try {
      const url = new URL(String(value || ''));
      const tail = url.pathname.split('/').filter(Boolean).pop() || '';
      return `${url.hostname}/${tail}`.slice(0, 80);
    } catch (_) {
      return String(value || '').slice(0, 80);
    }
  }

  function nodes() {
    return {
      logEl: root.document?.getElementById?.('weibo-dl-debug-log'),
      countEl: root.document?.getElementById?.('weibo-dl-debug-count'),
      copyEl: root.document?.getElementById?.('weibo-dl-debug-copy')
    };
  }

  function render() {
    const { logEl, countEl } = nodes();
    if (logEl) logEl.textContent = lines.join('\n') || '暂无日志';
    if (countEl) countEl.textContent = String(lines.length);
  }

  function log(...args) {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    const text = args.map((item) => {
      if (item && typeof item === 'object') {
        try { return JSON.stringify(item); } catch (_) { return String(item); }
      }
      return String(item);
    }).join(' ');
    lines.push(`[${time}] ${text}`);
    if (lines.length > 80) lines.shift();
    console.log('[WEIBODL]', ...args);
    render();
  }

  function clear() {
    lines.length = 0;
    render();
  }

  function copyViaTextarea(text) {
    const area = root.document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
    root.document.body.appendChild(area);
    area.focus();
    area.select();
    const ok = root.document.execCommand('copy');
    area.remove();
    if (!ok) throw new Error('execCommand copy failed');
  }

  async function copy() {
    const { copyEl } = nodes();
    const text = lines.join('\n') || '暂无日志';
    try {
      if (root.navigator?.clipboard?.writeText) await root.navigator.clipboard.writeText(text);
      else copyViaTextarea(text);
    } catch (_) {
      copyViaTextarea(text);
    }
    if (copyEl) {
      copyEl.textContent = '已复制';
      setTimeout(() => { copyEl.textContent = '复制'; }, 1200);
    }
    log('调试日志已复制');
  }

  function bindButton(id, handler) {
    const button = root.document?.getElementById?.(id);
    if (!button || button.__weiboDlBound) return;
    button.__weiboDlBound = true;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handler();
    });
  }

  function bind() {
    bindButton('weibo-dl-debug-clear', clear);
    bindButton('weibo-dl-debug-copy', () => { copy().catch((error) => log('复制失败', error.message || error)); });
    render();
  }

  root.WeiboDlDebug = { log, shortUrl, render, clear, copy, bind };
})(typeof globalThis !== 'undefined' ? globalThis : this);
