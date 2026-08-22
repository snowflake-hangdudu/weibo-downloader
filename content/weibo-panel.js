(function initPanel(root, factory) {
  const api = factory();
  root.DownloaderCore = root.DownloaderCore || {};
  root.DownloaderCore.panel = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function panelFactory() {
  function createPanel(options) {
    const opts = options || {};
    const doc = opts.document || globalThis.document;
    if (!doc?.body) throw new Error('document.body is required');
    const dom = opts.dom || globalThis.DownloaderCore?.dom;
    if (!dom) throw new Error('DownloaderCore.dom is required');
    const iconUrl = String(opts.iconUrl || '');
    let content = null;

    const rootEl = doc.createElement('div');
    rootEl.id = 'weibo-dl-root';
    const wrap = doc.createElement('div');
    wrap.id = 'weibo-dl-panel';

    const fab = doc.createElement('button');
    fab.type = 'button';
    fab.id = 'weibo-dl-toggle';
    fab.title = opts.title || '保存';
    fab.setAttribute('aria-expanded', 'false');
    if (iconUrl) {
      const icon = doc.createElement('img');
      icon.src = iconUrl;
      icon.alt = '';
      fab.appendChild(icon);
    } else {
      fab.textContent = opts.fabLabel || '保存';
    }

    const menu = doc.createElement('div');
    menu.id = 'weibo-dl-menu';
    menu.className = 'hidden';
    menu.setAttribute('aria-label', opts.title || '内容下载助手');

    const header = doc.createElement('div');
    header.className = 'weibo-dl-header';
    const headerLeft = doc.createElement('div');
    headerLeft.className = 'weibo-dl-header-left';
    if (iconUrl) {
      const headerIcon = doc.createElement('img');
      headerIcon.className = 'weibo-dl-header-icon';
      headerIcon.src = iconUrl;
      headerIcon.width = 22;
      headerIcon.height = 22;
      headerIcon.alt = '';
      headerLeft.appendChild(headerIcon);
    }
    dom.appendTextElement(headerLeft, 'span', 'weibo-dl-title', opts.title || '内容下载助手');
    const version = dom.appendTextElement(headerLeft, 'span', 'weibo-dl-version', opts.version ? `v${opts.version}` : '');
    if (!opts.version) version.hidden = true;
    const close = doc.createElement('button');
    close.id = 'weibo-dl-close';
    close.type = 'button';
    close.setAttribute('aria-label', '关闭');
    close.textContent = '×';
    header.append(headerLeft, close);

    const body = doc.createElement('div');
    body.className = 'weibo-dl-body';
    const home = doc.createElement('div');
    home.id = 'weibo-dl-home';
    const page = doc.createElement('div');
    page.id = 'weibo-dl-page';
    page.className = 'hidden';

    const detect = doc.createElement('div');
    detect.className = 'weibo-dl-detect is-loading';
    detect.appendChild(Object.assign(doc.createElement('span'), { className: 'weibo-dl-dot' }));
    const status = dom.appendTextElement(detect, 'span', '', '正在识别当前页面');

    const card = doc.createElement('div');
    card.className = 'weibo-dl-card';
    const cover = doc.createElement('div');
    cover.className = 'weibo-dl-cover';
    const coverImg = doc.createElement('img');
    coverImg.alt = '';
    coverImg.hidden = true;
    cover.appendChild(coverImg);
    const cardMeta = doc.createElement('div');
    cardMeta.className = 'weibo-dl-card-meta';
    const title = dom.appendTextElement(cardMeta, 'div', 'weibo-dl-card-title', '尚未识别内容');
    const author = dom.appendTextElement(cardMeta, 'div', 'weibo-dl-card-author', '');
    author.hidden = true;
    const meta = dom.appendTextElement(cardMeta, 'div', 'weibo-dl-card-sub', '');
    card.append(cover, cardMeta);

    const list = doc.createElement('div');
    list.className = 'weibo-dl-list';

    const actions = doc.createElement('div');
    actions.className = 'weibo-dl-actions';
    const refresh = doc.createElement('button');
    refresh.type = 'button';
    refresh.className = 'weibo-dl-btn-secondary';
    refresh.textContent = '重新识别';
    const download = doc.createElement('button');
    download.type = 'button';
    download.className = 'weibo-dl-btn';
    download.textContent = '下载所选';
    download.disabled = true;
    refresh.hidden = true;
    actions.append(download);

    const debug = doc.createElement('details');
    debug.className = 'weibo-dl-debug';
    debug.open = false;
    const summary = doc.createElement('summary');
    summary.className = 'weibo-dl-debug-summary';
    dom.appendTextElement(summary, 'span', '', '调试日志');
    const debugCount = dom.appendTextElement(summary, 'span', 'weibo-dl-debug-count', '0');
    debugCount.id = 'weibo-dl-debug-count';
    const debugActions = doc.createElement('div');
    debugActions.className = 'weibo-dl-debug-actions';
    const debugCopy = doc.createElement('button');
    debugCopy.type = 'button';
    debugCopy.id = 'weibo-dl-debug-copy';
    debugCopy.className = 'weibo-dl-debug-btn';
    debugCopy.textContent = '复制';
    const debugClear = doc.createElement('button');
    debugClear.type = 'button';
    debugClear.id = 'weibo-dl-debug-clear';
    debugClear.className = 'weibo-dl-debug-btn';
    debugClear.textContent = '清空';
    debugActions.append(debugCopy, debugClear);
    const debugLog = doc.createElement('pre');
    debugLog.id = 'weibo-dl-debug-log';
    debugLog.className = 'weibo-dl-debug-log';
    debug.append(summary, debugActions, debugLog);
    home.append(detect, card, list, actions);
    if (opts.showDebug) home.append(debug);

    const pageBack = doc.createElement('button');
    pageBack.type = 'button';
    pageBack.className = 'weibo-dl-page-back';
    pageBack.textContent = '返回下载';
    const pageTitle = dom.appendTextElement(page, 'div', 'weibo-dl-page-title', '');
    pageTitle.id = 'weibo-dl-info-title';
    const pageDate = dom.appendTextElement(page, 'div', 'weibo-dl-info-date', '');
    pageDate.id = 'weibo-dl-info-date';
    pageDate.hidden = true;
    const pageBody = doc.createElement('div');
    pageBody.id = 'weibo-dl-info-body';
    pageBody.className = 'weibo-dl-info-body';
    page.prepend(pageBack);
    page.append(pageTitle, pageDate, pageBody);
    body.append(home, page);

    const footer = doc.createElement('div');
    footer.className = 'weibo-dl-footer';
    function sheetLink(key, label) {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'weibo-dl-footer-link';
      btn.dataset.sheet = key;
      btn.textContent = label;
      return btn;
    }
    function externalLink(href, label) {
      const a = doc.createElement('a');
      a.className = 'weibo-dl-footer-link';
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = label;
      return a;
    }
    const links = doc.createElement('div');
    links.className = 'weibo-dl-footer-links';
    const faqLink = externalLink('https://snowflake-hangdudu.github.io/weibo-downloader/faq.html', '常见问题');
    const privacyLink = externalLink('https://snowflake-hangdudu.github.io/weibo-downloader/', '隐私政策');
    const noticeLink = sheetLink('notice', '公告');
    const coopLink = sheetLink('coop', '开发合作');
    const feedback = doc.createElement('a');
    feedback.className = 'weibo-dl-feedback';
    feedback.textContent = '反馈邮箱：hangdudu0@agent.qq.com';
    feedback.href = 'mailto:hangdudu0@agent.qq.com?subject=微博下载助手反馈';
    links.append(faqLink, privacyLink, noticeLink, coopLink, feedback);
    footer.append(links);

    const rating = doc.createElement('div');
    rating.className = 'weibo-dl-store-rating hidden';
    rating.setAttribute('role', 'note');
    dom.appendTextElement(rating, 'div', 'weibo-dl-store-rating-title', '下载搞定 ⭐ 给个好评呗');
    const ratingText = dom.appendTextElement(rating, 'div', 'weibo-dl-store-rating-text', '用着顺手的话，去商店点个分。');
    const ratingPrimary = doc.createElement('button');
    ratingPrimary.type = 'button';
    ratingPrimary.className = 'weibo-dl-store-rating-primary';
    ratingPrimary.dataset.action = 'rate';
    ratingPrimary.textContent = '去商店评分 ⭐';
    const ratingActions = doc.createElement('div');
    ratingActions.className = 'weibo-dl-store-rating-actions';
    const ratingLater = doc.createElement('button');
    ratingLater.type = 'button';
    ratingLater.className = 'weibo-dl-store-rating-ghost';
    ratingLater.dataset.action = 'later';
    ratingLater.textContent = '下次再说';
    const ratingNever = doc.createElement('button');
    ratingNever.type = 'button';
    ratingNever.className = 'weibo-dl-store-rating-ghost';
    ratingNever.dataset.action = 'never';
    ratingNever.textContent = '别再问了';
    ratingActions.append(ratingLater, ratingNever);
    rating.append(ratingPrimary, ratingActions);

    menu.append(header, body, rating, footer);
    wrap.append(fab, menu);
    rootEl.appendChild(wrap);

    function open() {
      menu.classList.remove('hidden');
      fab.setAttribute('aria-expanded', 'true');
    }

    function hide() {
      menu.classList.add('hidden');
      fab.setAttribute('aria-expanded', 'false');
      showHome();
    }

    function showHome() {
      page.classList.add('hidden');
      home.classList.remove('hidden');
      menu.classList.remove('is-page');
      opts.onShowHome?.();
    }

    function openSheet(key, item) {
      const data = item || {};
      pageTitle.textContent = data.title || (key === 'coop' ? '开发合作' : '公告');
      if (data.updated) {
        pageDate.textContent = '更新：' + data.updated;
        pageDate.hidden = false;
      } else {
        pageDate.textContent = '';
        pageDate.hidden = true;
      }
      dom.clearNode(pageBody);
      if (typeof opts.onFillSheet === 'function') opts.onFillSheet(pageBody, key, data);
      else dom.fillTextLines(pageBody, data.body || '暂无内容');
      home.classList.add('hidden');
      page.classList.remove('hidden');
      menu.classList.add('is-page');
      open();
    }

    function setSheetEnabled(key, enabled) {
      footer.querySelectorAll('[data-sheet="' + key + '"]').forEach((el) => {
        el.hidden = !enabled;
      });
    }

    function setRating(state) {
      const next = state || {};
      const label = next.storeLabel || 'Edge';
      ratingText.textContent = `用着顺手的话，去 ${label} 商店点个分。`;
      ratingPrimary.textContent = `去 ${label} 商店评分 ⭐`;
      rating.classList.toggle('hidden', !next.visible);
    }

    function setStatus(kind, text) {
      status.textContent = String(text || '');
      detect.classList.toggle('is-error', kind === 'error');
      detect.classList.toggle('is-loading', kind === 'loading');
    }

    function selectedItems() {
      if (!content) return [];
      return [...list.querySelectorAll('input[type="checkbox"]:checked')]
        .map((input) => content.items[Number(input.dataset.index)])
        .filter(Boolean);
    }

    function syncDownloadButton() {
      const count = selectedItems().length;
      download.disabled = count === 0;
      download.textContent = count ? `下载所选（${count}）` : '下载所选';
    }

    function renderContent(nextContent) {
      content = nextContent;
      dom.clearNode(list);
      title.textContent = content?.title || '尚未识别内容';
      if (content?.author) {
        author.textContent = content.author;
        author.hidden = false;
      } else {
        author.textContent = '';
        author.hidden = true;
      }
      const items = Array.isArray(content?.items) ? content.items : [];
      const imageCount = items.filter((item) => item.kind === 'image').length;
      const videoCount = items.filter((item) => item.kind === 'video').length;
      const textCount = items.filter((item) => item.kind === 'text').length;
      const counts = items.length
        ? `图片 ${imageCount} · 视频 ${videoCount} · 文字 ${textCount}`
        : '当前页面没有可保存内容';
      meta.textContent = content?.publishedAt ? `${content.publishedAt} · ${counts}` : counts;
      const coverUrl = [content?.cover, items.find((item) => item.kind === 'image' && item.url)?.url]
        .find((url) => /^https:\/\//i.test(String(url || '')) && !/\.(?:mp4|mov|webm|m3u8)(?:[?#]|$)/i.test(url));
      coverImg.onerror = () => {
        coverImg.removeAttribute('src');
        coverImg.hidden = true;
      };
      if (coverUrl) {
        coverImg.src = coverUrl;
        coverImg.hidden = false;
      } else {
        coverImg.removeAttribute('src');
        coverImg.hidden = true;
      }
      items.forEach((item, index) => {
        const label = doc.createElement('label');
        label.className = 'weibo-dl-item';
        const checkbox = doc.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.dataset.index = String(index);
        checkbox.addEventListener('change', syncDownloadButton);
        const text = dom.appendTextElement(label, 'span', 'weibo-dl-item-label', item.filename || item.quality || item.kind);
        text.title = item.url || item.text || '';
        label.prepend(checkbox);
        list.appendChild(label);
      });
      syncDownloadButton();
      setStatus(items.length ? 'ready' : 'empty', items.length ? '已识别当前页面' : '当前页面没有可保存内容');
    }

    fab.addEventListener('click', open);
    close.addEventListener('click', hide);
    pageBack.addEventListener('click', showHome);
    refresh.addEventListener('click', () => opts.onRefresh?.());
    download.addEventListener('click', () => opts.onDownload?.(selectedItems(), content));
    footer.querySelectorAll('[data-sheet]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        opts.onOpenSheet?.(btn.dataset.sheet);
      });
    });
    rating.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => opts.onRatingAction?.(btn.dataset.action));
    });
    doc.body.appendChild(rootEl);

    return {
      open,
      hide,
      showHome,
      openSheet,
      setSheetEnabled,
      setRating,
      setStatus,
      renderContent,
      selectedItems,
      getContent: () => content,
      destroy: () => rootEl.remove()
    };
  }

  return { createPanel };
});
