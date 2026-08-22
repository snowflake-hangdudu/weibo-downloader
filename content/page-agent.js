(function initWeiboPageAgent() {
  const CHANNEL = 'WEIBO_DL_PAGE';

  function addUrl(list, value) {
    const url = String(value || '');
    if (/^https:\/\//i.test(url) && !/\.m3u8(?:[?#]|$)/i.test(url)) list.push(url);
  }

  function pickVideo(mediaInfo, extraUrls) {
    const list = [];
    const info = mediaInfo || {};
    addUrl(list, info.mp4_720p_mp4);
    addUrl(list, info.mp4_hd_mp4);
    addUrl(list, info.mp4_ld_mp4);
    addUrl(list, info.mp4_hd_url);
    addUrl(list, info.mp4_sd_url);
    addUrl(list, info.h265_mp4_hd);
    addUrl(list, info.stream_url_hd);
    addUrl(list, info.stream_url);
    for (const item of info.playback_list || []) addUrl(list, item?.play_info?.url);
    for (const value of Object.values(extraUrls || {})) addUrl(list, value);
    return list.find((url) => /\.mp4(?:[?#]|$)/i.test(url)) || list[0] || '';
  }

  function picUrl(value) {
    if (!value) return '';
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
    return String(value.url || value.pic || '');
  }

  function videoFromStatus(status) {
    let url = pickVideo(status.page_info?.media_info, status.page_info?.urls);
    if (url) return url;
    for (const item of status.mix_media_info?.items || []) {
      url = pickVideo(item?.data?.media_info, item?.data?.urls);
      if (url) return url;
    }
    return pickVideo(status.media_info, status.urls);
  }

  function asStatus(value, depth, seen) {
    if (!value || typeof value !== 'object' || depth > 7 || seen.has(value)) return null;
    seen.add(value);
    if ((value.mblogid || value.bid) && (value.text_raw || value.text || value.page_info || value.pic_infos || value.user)) {
      return value;
    }
    if (value.page_info?.media_info || value.mix_media_info || value.media_info?.stream_url) return value;
    for (const key of ['mblog', 'data', 'item', 'status', 'blog']) {
      const hit = asStatus(value[key], depth + 1, seen);
      if (hit) return hit;
    }
    return null;
  }

  function vueStatus(node) {
    const handles = [node.__vueParentComponent, node.__vue__, node.__vnode];
    try {
      for (const key of Object.getOwnPropertyNames(node)) {
        if (key.startsWith('__vue')) handles.push(node[key]);
      }
    } catch (_) {}
    for (const handle of handles) {
      if (!handle) continue;
      const seen = new Set();
      const hit = asStatus(handle.props, 0, seen) || asStatus(handle.ctx, 0, seen) ||
        asStatus(handle.setupState, 0, seen) || asStatus(handle.data, 0, seen) ||
        asStatus(handle.vnode?.props, 0, seen) || asStatus(handle, 0, seen);
      if (hit) return hit;
    }
    return null;
  }

  function pullStatuses(value, out, seen, depth) {
    if (!value || typeof value !== 'object' || depth > 6 || seen.has(value) || out.length > 80) return;
    seen.add(value);
    if ((value.mblogid || value.bid) && (value.text_raw || value.text || value.page_info)) {
      out.push(value);
    }
    const list = Array.isArray(value) ? value
      : Array.isArray(value.statuses) ? value.statuses
        : Array.isArray(value.list) ? value.list
          : Array.isArray(value.items) ? value.items
            : null;
    if (list) {
      for (const item of list) pullStatuses(item, out, seen, depth + 1);
      return;
    }
    for (const key of ['mblog', 'data', 'item', 'status', 'blog', 'props', 'ctx', 'setupState']) {
      if (value[key]) pullStatuses(value[key], out, seen, depth + 1);
    }
  }

  function statusesFromPage() {
    const out = [];
    const seen = new Set();
    const budget = { n: 220 };
    function walk(el) {
      if (!el || budget.n <= 0) return;
      budget.n -= 1;
      pullStatuses(el.__vueParentComponent, out, seen, 0);
      pullStatuses(el.__vue__, out, seen, 0);
      for (const child of el.children || []) walk(child);
    }
    walk(document.querySelector('#app') || document.body);
    return out;
  }

  function applyStatus(el, status) {
    if (!el || !status) return false;
    const id = String(status.mblogid || status.bid || '');
    const video = videoFromStatus(status);
    const pics = status.pic_infos || {};
    const firstPic = Object.values(pics)[0] || {};
    const cover = picUrl(status.page_info?.page_pic) || picUrl(status.page_info?.pic) ||
      picUrl(firstPic.largest) || picUrl(firstPic.large) || picUrl(firstPic) ||
      picUrl(status.page_info?.media_info?.big_pic_info?.pic_big);
    if (id) el.setAttribute('data-weibo-dl-id', id);
    if (video) el.setAttribute('data-weibo-dl-video', video);
    if (cover) el.setAttribute('data-weibo-dl-cover', cover);
    return Boolean(id || video || cover);
  }

  function tagCard(el, pool) {
    let node = el;
    for (let i = 0; i < 8 && node; i += 1) {
      const status = vueStatus(node);
      if (status && applyStatus(el, status)) return true;
      node = node.parentElement;
    }
    const snippet = String(el.innerText || '').replace(/\s+/g, ' ').replace(/转发|评论|赞/g, '').trim().slice(0, 22);
    if (snippet.length >= 8) {
      const hit = pool.find((status) => {
        const text = String(status.text_raw || status.text || '').replace(/<[^>]+>/g, '');
        return text.includes(snippet.slice(0, 12)) || snippet.includes(String(status.mblogid || ''));
      });
      if (hit) return applyStatus(el, hit);
    }
    return false;
  }

  function tagAll() {
    const pool = statusesFromPage();
    const nodes = document.querySelectorAll('article, [class*="Feed_wrap"], .vue-recycle-scroller__item-view');
    let count = 0;
    nodes.forEach((node) => {
      if (tagCard(node, pool)) count += 1;
    });
    return count;
  }

  async function fetchMedia(url) {
    const response = await fetch(url, { credentials: 'include', cache: 'force-cache', mode: 'cors' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const buffer = await response.arrayBuffer();
    if (!buffer.byteLength) throw new Error('empty');
    return {
      buffer,
      mime: String(response.headers.get('content-type') || '').split(';')[0],
      status: response.status,
      size: buffer.byteLength
    };
  }

  addEventListener('message', (event) => {
    if (event.source !== window || event.data?.channel !== CHANNEL) return;
    if (event.data.type === 'TAG') {
      const count = tagAll();
      window.postMessage({ channel: CHANNEL, type: 'TAG_OK', id: event.data.id, count }, '*');
      return;
    }
    if (event.data.type !== 'FETCH') return;
    const id = event.data.id;
    fetchMedia(String(event.data.url || ''))
      .then((result) => {
        window.postMessage({
          channel: CHANNEL,
          type: 'FETCH_OK',
          id,
          mime: result.mime,
          status: result.status,
          size: result.size,
          buffer: result.buffer
        }, '*');
      })
      .catch((error) => {
        window.postMessage({
          channel: CHANNEL,
          type: 'FETCH_ERR',
          id,
          error: String(error?.message || error)
        }, '*');
      });
  });
})();
