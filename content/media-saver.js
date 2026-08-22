(function initWeiboMediaSaver(root) {
  const CHANNEL = 'WEIBO_DL_PAGE';
  const debug = () => root.WeiboDlDebug || { log() {}, shortUrl(value) { return String(value || ''); } };

  function canPrepare(item) {
    return Boolean(item && item.kind !== 'text' && /^https:\/\//i.test(String(item.url || '')));
  }

  function askPageFetch(url) {
    return new Promise((resolve, reject) => {
      const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const timer = setTimeout(() => {
        root.removeEventListener('message', onMessage);
        reject(new Error('页面读取超时'));
      }, 8000);
      function onMessage(event) {
        if (event.source !== root || event.data?.channel !== CHANNEL || event.data?.id !== id) return;
        root.removeEventListener('message', onMessage);
        clearTimeout(timer);
        if (event.data.type === 'FETCH_OK' && event.data.buffer) {
          resolve({
            buffer: event.data.buffer,
            mime: event.data.mime,
            status: event.data.status,
            size: event.data.size,
            via: 'page'
          });
          return;
        }
        reject(new Error(event.data.error || '页面读取失败'));
      }
      root.addEventListener('message', onMessage);
      root.postMessage({ channel: CHANNEL, type: 'FETCH', id, url }, '*');
    });
  }

  async function isolatedFetch(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs || 20000);
    try {
      const response = await fetch(url, { credentials: 'include', cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const buffer = await response.arrayBuffer();
      if (!buffer.byteLength) throw new Error('empty');
      return {
        buffer,
        mime: String(response.headers.get('content-type') || '').split(';')[0],
        status: response.status,
        size: buffer.byteLength,
        via: 'isolated'
      };
    } finally {
      clearTimeout(timer);
    }
  }

  function pageFetchBlocked(url) {
    return /sinaimg\.cn|weibocdn\.com/i.test(String(url || ''));
  }

  async function readMedia(url) {
    const dbg = debug();
    if (!pageFetchBlocked(url)) {
      try {
        const page = await askPageFetch(url);
        dbg.log('读取成功(页面)', dbg.shortUrl(url), page.status, page.size);
        return page;
      } catch (error) {
        dbg.log('页面读取失败', dbg.shortUrl(url), error.message || error);
      }
    }
    const isolated = await isolatedFetch(url);
    dbg.log('读取成功(扩展)', dbg.shortUrl(url), isolated.status, isolated.size);
    return isolated;
  }

  async function prepare(item) {
    if (!canPrepare(item)) return { url: String(item?.url || '') };
    try {
      if (item.kind === 'video') {
        debug().log('开始读取视频', debug().shortUrl(item.url));
        const media = await isolatedFetch(item.url, 120000);
        debug().log('读取成功(扩展)', debug().shortUrl(item.url), media.status, media.size);
        return {
          url: item.url,
          buffer: media.buffer,
          mime: media.mime || 'video/mp4',
          via: media.via,
          size: media.size
        };
      }
      const media = await readMedia(item.url);
      return {
        url: item.url,
        buffer: media.buffer,
        mime: media.mime || 'image/jpeg',
        via: media.via,
        size: media.size
      };
    } catch (error) {
      debug().log('媒体读取失败', debug().shortUrl(item.url), error.message || error);
      throw error;
    }
  }

  root.DownloaderCore = root.DownloaderCore || {};
  root.DownloaderCore.weiboMedia = { prepare };
})(typeof globalThis !== 'undefined' ? globalThis : this);
