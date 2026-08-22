(function boot() {
  const adapter = globalThis.SiteAdapter;
  const runtime = DownloaderCore.runtime;
  const version = runtime.getVersion();
  const api = runtime.getApi();
  const debug = () => globalThis.WeiboDlDebug || { log() {}, render() {}, bind() {} };
  const DEFAULT_REMOTE = {
    notice: {
      enabled: true,
      title: '公告',
      updated: '2026-08-23',
      body: '保存当前可访问微博的正文、图片和已暴露视频。切到另一条微博后会重新识别。',
      pinned: ['首页滑到哪条就识别哪条。图片/视频若失败，等媒体出现后再保存。'],
      recent: ['1.0.0：首页滑动识别当前微博，保存正文、图片和已暴露视频。'],
      knownIssues: [],
      roadmap: { feedback: [], upcoming: [], planned: [] }
    },
    coop: {
      enabled: true,
      title: '开发合作',
      updated: '2026-08-23',
      body: '接浏览器插件定制开发。\n\n有合作意向请发邮件。\n邮箱：hangdudu0@agent.qq.com\n请在邮件中备注「插件开发」，并简单说明需求。'
    }
  };
  let remoteContent = DEFAULT_REMOTE;
  let lastContent = null;

  function fillNoticeBody(el, notice) {
    const dom = DownloaderCore.dom;
    dom.clearNode(el);
    const toLines = dom.toLines;
    function section(title, value) {
      const lines = toLines(value);
      if (!lines.length) return;
      const wrap = el.ownerDocument.createElement('section');
      wrap.className = 'weibo-dl-notice-section';
      dom.appendTextElement(wrap, 'h4', 'weibo-dl-notice-section-title', title);
      const list = el.ownerDocument.createElement('ul');
      list.className = 'weibo-dl-notice-list';
      lines.forEach((line) => dom.appendTextElement(list, 'li', '', line));
      wrap.appendChild(list);
      el.appendChild(wrap);
    }
    const roadmap = notice?.roadmap && typeof notice.roadmap === 'object' ? notice.roadmap : {};
    const hasStructured = ['pinned', 'recent', 'knownIssues'].some((key) => toLines(notice?.[key]).length) ||
      ['feedback', 'upcoming', 'planned'].some((key) => toLines(roadmap[key]).length);
    if (!hasStructured) {
      dom.fillTextLines(el, notice?.body || '暂无新公告');
      return;
    }
    section('置顶说明', notice.pinned);
    section('最近更新', notice.recent);
    section('已知问题', notice.knownIssues);
  }

  const panel = DownloaderCore.panel.createPanel({
    title: '微博内容下载与备份助手',
    fabLabel: '保存',
    version,
    iconUrl: api.runtime.getURL('icons/icon128.png'),
    dom: DownloaderCore.dom,
    showDebug: !api.runtime.getManifest()?.update_url,
    onRefresh: () => scheduleRefresh('manual'),
    onDownload: downloadItems,
    onOpenSheet: openSheet,
    onFillSheet(body, key, data) {
      if (key === 'notice') fillNoticeBody(body, data);
      else DownloaderCore.dom.fillTextLines(body, data.body || '暂无内容');
    }
  });
  debug().bind();

  async function loadRemoteContent() {
    try {
      remoteContent = await DownloaderCore.remote.loadRemoteContent({
        runtime,
        configUrl: 'https://download-config-hub.nutmeg-venus-6882.chatgpt.site/api/config/weibo',
        messageType: 'WEIBO_DL_FETCH_JSON',
        cacheKey: 'weiboDlRemoteContent_v1',
        defaults: DEFAULT_REMOTE
      });
    } catch (_) {
      remoteContent = DEFAULT_REMOTE;
    }
    return remoteContent;
  }

  async function openSheet(key) {
    await loadRemoteContent();
    panel.openSheet(key, remoteContent[key] || DEFAULT_REMOTE[key]);
  }
  loadRemoteContent();

  async function refresh() {
    const urlId = routeId();
    debug().log('刷新', location.href, urlId || '首页');
    if (!adapter.matches(location.href)) {
      panel.renderContent(DownloaderCore.platform.normalizeContent({ title: '当前页面暂不支持', items: [] }));
      return;
    }
    panel.setStatus('loading', '正在识别当前页面');
    try {
      const content = DownloaderCore.platform.normalizeContent(await adapter.collect({
        contentId: urlId
      }));
      lastContent = content;
      debug().log('识别完成', content.id || '无ID', `共${content.items.length}项`, content.items.map((item) => item.kind).join(','));
      lastFocusKey = content.id || adapter.focusKey?.() || lastFocusKey;
      panel.renderContent(content);
      if (!content.items.length) panel.setStatus('empty', '滑到一条微博后会自动识别');
      debug().render();
    } catch (error) {
      debug().log('识别失败', error.message || error);
      panel.setStatus('error', String(error?.message || error));
    }
  }

  let lastRouteId = '';
  let lastFocusKey = '';
  let refreshTimer = 0;
  let refreshSeq = 0;
  function routeId() {
    return adapter.postIdFromHref?.(location.href) || '';
  }
  function scheduleRefresh(reason) {
    const urlId = routeId();
    if (reason === 'history' || reason === 'dom') {
      if (urlId === lastRouteId) return;
      lastRouteId = urlId;
    } else if (reason === 'scroll') {
      const key = adapter.focusKey?.() || '';
      if (!key || key === lastFocusKey) return;
    } else if (reason !== 'manual' && reason !== 'init' && reason !== 'forced') {
      return;
    }
    clearTimeout(refreshTimer);
    const seq = ++refreshSeq;
    debug().log('开始识别', reason, urlId || adapter.focusKey?.() || location.href);
    panel.setStatus('loading', '正在识别当前微博');
    refreshTimer = setTimeout(async () => {
      if (seq !== refreshSeq) return;
      await refresh();
    }, reason === 'scroll' ? 80 : reason === 'init' ? 0 : 200);
  }

  function hookHistory() {
    const fire = () => scheduleRefresh('history');
    for (const name of ['pushState', 'replaceState']) {
      const raw = history[name];
      if (typeof raw !== 'function' || raw.__weiboDlHook) continue;
      function hooked(...args) {
        const result = raw.apply(this, args);
        fire();
        return result;
      }
      hooked.__weiboDlHook = true;
      history[name] = hooked;
    }
    addEventListener('popstate', fire);
    addEventListener('hashchange', fire);
  }

  async function resolveDownloadItem(item) {
    if (item.kind === 'text' || !DownloaderCore.weiboMedia?.prepare) return item;
    return DownloaderCore.weiboMedia.prepare(item);
  }

  async function downloadItems(items, content) {
    let downloadError = '';
    debug().log('开始下载', content.id || '', `${items.length}项`);
    const queue = DownloaderCore.queue.createTaskQueue({
      concurrency: 4,
      worker: async (item, context) => {
        const jobId = `${Date.now()}-${context.index}`;
        const prepared = await resolveDownloadItem(item);
        const size = Number(prepared.buffer?.byteLength || prepared.size || 0);
        let dataUrl = prepared.dataUrl;
        let buffer = prepared.buffer;
        if (prepared.buffer && size > 0 && size <= 8 * 1024 * 1024) {
          dataUrl = DownloaderCore.media.bytesToDataUrl(prepared.buffer, prepared.mime);
          buffer = undefined;
          debug().log('已转成本地数据', item.kind, size);
        } else if (size) {
          debug().log('发送原始字节', item.kind, size);
        }
        if (item.kind !== 'text' && !dataUrl && !buffer) {
          throw new Error('未能读取媒体数据');
        }
        const result = await runtime.sendMessage({
          type: 'WEIBO_DL_DOWNLOAD',
          jobId,
          title: content.title,
          item: {
            kind: item.kind,
            url: prepared.url || item.url,
            text: item.text,
            filename: item.filename,
            index: context.index,
            dataUrl,
            buffer,
            mime: prepared.mime
          }
        });
        if (!result?.ok) throw new Error(result?.error || '浏览器未接受下载任务');
        debug().log('后台已接任务', item.kind, prepared.via || 'direct', item.filename || '', result.downloadId);
        return result;
      },
      onEvent(event) {
        if (event.type === 'start') panel.setStatus('loading', `正在处理 ${event.total} 个项目`);
        if (event.type === 'item-error') {
          downloadError = `下载失败：${event.error?.message || event.error}`;
          debug().log('单项失败', event.item?.kind, event.error?.message || event.error);
          panel.setStatus('error', downloadError);
        }
        if (event.type === 'done') {
          if (downloadError) panel.setStatus('error', downloadError);
          else panel.setStatus('ready', '下载任务已交给浏览器');
          debug().log('队列结束', downloadError || 'ok');
        }
      }
    });
    await queue.run(items);
  }

  function hookScroll() {
    let timer = 0;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => scheduleRefresh('scroll'), 480);
    };
    addEventListener('scroll', onScroll, true);
    addEventListener('wheel', onScroll, { capture: true, passive: true });
  }

  hookHistory();
  hookScroll();
  adapter.watchCards?.(() => {
    if (lastContent?.items?.length) return;
    if (adapter.focusKey?.()) scheduleRefresh('scroll');
  });
  new MutationObserver(() => {
    if (routeId() !== lastRouteId) scheduleRefresh('dom');
  }).observe(document.documentElement, { childList: true, subtree: true });
  runtime.getApi().runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type === 'WEIBO_DL_MAKE_BLOB' || message?.type === 'WEIBO_DL_REVOKE_BLOB') return undefined;
    if (message?.type === 'WEIBO_DL_OPEN_PANEL' || message?.type === 'DOWNLOADER_OPEN_PANEL') {
      panel.open();
      return undefined;
    }
    if (message?.type === 'WEIBO_DL_OPEN_SHEET') {
      panel.open();
      openSheet(message.sheet === 'coop' ? 'coop' : 'notice');
      return undefined;
    }
    if (message?.type === 'WEIBO_DL_GET_INFO') {
      respond({ ok: Boolean(lastContent), data: { info: lastContent || {} } });
      return undefined;
    }
    if (message?.type === 'WEIBO_DL_DOWNLOAD_ERROR') {
      debug().log('浏览器下载失败', message.error);
      panel.setStatus('error', message.error || '浏览器下载失败');
    }
    return undefined;
  });
  lastRouteId = routeId();
  refresh();
})();
