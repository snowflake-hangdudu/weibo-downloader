(function initWeiboAdapter() {
  const IMAGE_HOST = /(?:^|\.)sinaimg\.cn$/i;
  const VIDEO_HOST = /(?:^|\.)(?:weibocdn\.com|weibo\.com|sina\.com\.cn)$/i;
  const IMAGE_SIZE = /\/(?:thumb150|thumb180|thumb300|orj360|orj480|orj720|bmiddle|mw690|mw1024|mw2048|small|ssmall|square|thumbnail|large|woriginal)\//i;
  const CARD_SELECTORS = [
    '.vue-recycle-scroller__item-view > article',
    'article[class*="Feed"]',
    'article',
    '[class*="Feed_wrap"]',
    '[class*="detail_wrap"]',
    '[class*="detail_main"]',
    '[class*="Detail_box"]'
  ];
  const SEARCH_CARD_SELECTORS = [
    '.card-wrap[action-type="feed_list_item"]',
    '#pl_feedlist_index .card-wrap',
    '[action-type="feed_list_item"]',
    '.card-wrap'
  ];

  function isSearchPage() {
    try {
      return new URL(location.href).hostname === 's.weibo.com';
    } catch (_) {
      return false;
    }
  }

  function debug() {
    return globalThis.WeiboDlDebug || { log() {}, shortUrl(value) { return String(value || ''); } };
  }

  function isWeiboHost(url) {
    try {
      const host = new URL(url).hostname;
      return host === 'weibo.com' || host.endsWith('.weibo.com') || host === 'm.weibo.cn';
    } catch (_) {
      return false;
    }
  }

  function postIdFromLocation(href) {
    const raw = String(href || location.href || '');
    try {
      const url = new URL(raw, location.href);
      const queryId = url.searchParams.get('mblogid') || url.searchParams.get('mid') || url.searchParams.get('id');
      if (queryId && /^[A-Za-z0-9]{5,}$/.test(queryId) && !/^u$/i.test(queryId)) return queryId;
      const path = url.pathname;
      let match = path.match(/^\/status\/([A-Za-z0-9]{5,})/);
      if (match) return match[1];
      match = path.match(/^\/detail\/([A-Za-z0-9]{5,})/);
      if (match) return match[1];
      match = path.match(/^\/(\d{5,})\/([A-Za-z0-9]{5,})/);
      if (match && !/^(u|n|p|tv)$/i.test(match[2])) return match[2];
    } catch (_) {}
    const fallback = raw.match(/\/(?:status|detail)\/([A-Za-z0-9]{5,})/i) ||
      raw.match(/\/(\d{5,})\/([A-Za-z0-9]{5,})/);
    return fallback ? (fallback[2] || fallback[1]) : '';
  }

  function firstUrlFromSrcset(value) {
    const entries = String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
    return entries.length ? entries[entries.length - 1].split(/\s+/)[0] : '';
  }

  function mediaUrl(element) {
    return String(element?.currentSrc || element?.getAttribute?.('data-src') ||
      firstUrlFromSrcset(element?.getAttribute?.('srcset')) || element?.getAttribute?.('src') || '');
  }

  function originalImageUrl(value) {
    try {
      const url = new URL(String(value || ''), location.href);
      if (IMAGE_HOST.test(url.hostname)) {
        url.pathname = url.pathname.replace(IMAGE_SIZE, '/large/');
        return url.href;
      }
      if (url.protocol === 'https:' && /\.(?:jpg|jpeg|png|webp)(?:[?#]|$)/i.test(url.pathname)) return url.href;
    } catch (_) {}
    return '';
  }

  function looksLikeMediaImage(element, value) {
    const url = originalImageUrl(value);
    if (!url) return false;
    const width = Number(element?.naturalWidth || element?.width || 0);
    const height = Number(element?.naturalHeight || element?.height || 0);
    if ((width && width < 80) || (height && height < 80)) return false;
    const context = [element?.className, element?.parentElement?.className, url].join(' ').toLowerCase();
    return !/(avatar|emoticon|emoji|icon16|icon20|profile-logo)/.test(context);
  }

  function isHttpsMedia(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || /\.m3u8(?:[?#]|$)/i.test(url.pathname)) return '';
      if (/\.(?:mp4|mov|webm)(?:[?#]|$)/i.test(url.pathname) || VIDEO_HOST.test(url.hostname) || IMAGE_HOST.test(url.hostname)) {
        return url.href;
      }
    } catch (_) {}
    return '';
  }

  function directVideoUrl(element) {
    return isHttpsMedia(mediaUrl(element));
  }

  function isVisible(element) {
    if (!element?.getBoundingClientRect) return true;
    const rect = element.getBoundingClientRect();
    return rect.width > 60 && rect.height > 60 && rect.bottom > 80 && rect.top < (globalThis.innerHeight || 800);
  }

  function scoreRoot(candidate, wantId) {
    const textLength = String(candidate.innerText || '').trim().length;
    const mediaCount = candidate.querySelectorAll('img[src*="sinaimg.cn"], img[data-src*="sinaimg.cn"], video').length;
    const classBoost = /(feed|detail|card|m-panel|woo-panel)/i.test(String(candidate.className || '')) ? 4 : 0;
    const mobileContentBoost = candidate.matches?.('article.weibo-main, .weibo-main') ? 30 : 0;
    const visibleBoost = isVisible(candidate) ? 20 : -30;
    const idBoost = wantId && String(candidate.innerHTML || '').includes(wantId) ? 50 : 0;
    return Math.min(textLength, 300) / 60 + mediaCount * 3 + classBoost + mobileContentBoost + visibleBoost + idBoost;
  }

  function postSelector() {
    return (isSearchPage() ? SEARCH_CARD_SELECTORS.concat(CARD_SELECTORS) : CARD_SELECTORS).join(',');
  }

  function playerNode(root) {
    return root?.querySelector?.(
      'video, iframe, [class*="wbpv"], [class*="video-player"], [class*="VideoCard"], ' +
      '[class*="woo-picture"], [class*="picture_focus"], [class*="Player"], [class*="media_box"], ' +
      '.picture, [class*="picture"], [class*="Picture"]'
    ) || null;
  }

  function hasVideoCue(root) {
    const text = String(root?.innerText || '');
    if (/\d+\s*次观看/.test(text)) return true;
    if (/观看/.test(text) && /\b\d{1,2}:\d{2}\b/.test(text)) return true;
    return false;
  }

  function hasPlayer(root) {
    if (hasVideoCue(root)) return true;
    const el = playerNode(root);
    if (!el) return false;
    const rect = el.getBoundingClientRect?.();
    return !rect || (rect.width > 160 && rect.height > 90);
  }

  function mediaHints(root) {
    if (hasVideoCue(root)) return '次观看';
    const names = [...(root?.querySelectorAll?.('[class]') || [])]
      .map((el) => String(el.className || ''))
      .filter((name) => /pic|video|play|media|player|wbpv|woo-picture/i.test(name))
      .slice(0, 6);
    return names.join('|') || '无媒体class';
  }

  function looksLikeSearchPost(root) {
    if (!root || root.id === 'weibo-dl-root' || root.closest?.('#weibo-dl-root')) return false;
    if (root.querySelector?.('.card-user-b, .card-user, .card-person, .card-no-result')) return false;
    if (root.matches?.('.card-no-result, .card-for-ppe')) return false;
    return Boolean(
      root.getAttribute?.('mid') ||
      root.getAttribute?.('data-mid') ||
      root.querySelector?.('[node-type="feed_list_content"], p.txt, .card-feed, .media-piclist, a[href*="weibo.com/"]')
    );
  }

  function looksLikePost(root) {
    if (!root || root.id === 'weibo-dl-root' || root.closest?.('#weibo-dl-root')) return false;
    if (root.matches?.('[class*="wbpro-feed-content"], [class*="Feed_text"], [class*="ogText"]')) return false;
    if (isSearchPage() && looksLikeSearchPost(root)) return true;
    return Boolean(
      idFromRoot(root) ||
      hasPlayer(root) ||
      root.querySelector?.('a[class*="head-info_time"], [class*="Feed_text"], [class*="wbpro-feed-content"], video, img[src*="sinaimg.cn"]')
    );
  }

  function listRoots() {
    const found = [];
    const seen = new Set();
    for (const node of document.querySelectorAll(postSelector() + ', .vue-recycle-scroller__item-view')) {
      if (node.closest?.('#weibo-dl-root')) continue;
      let card = node;
      if (node.classList?.contains('vue-recycle-scroller__item-view')) {
        card = node.querySelector('article, [class*="Feed_wrap"], .card-wrap') || node;
      }
      if (seen.has(card) || !looksLikePost(card)) continue;
      seen.add(card);
      found.push(card);
    }
    return found.filter((card) => !found.some((other) => other !== card && other.contains(card)));
  }

  function closestRoot(node) {
    const cards = listRoots();
    let el = node?.nodeType === 1 ? node : node?.parentElement;
    while (el) {
      if (el.id === 'weibo-dl-root') return null;
      const hit = cards.find((card) => card === el || card.contains(el));
      if (hit) return hit;
      el = el.parentElement;
    }
    return null;
  }

  function taggedId(root) {
    return String(root?.getAttribute?.('data-weibo-dl-id') ||
      root?.querySelector?.('[data-weibo-dl-id]')?.getAttribute?.('data-weibo-dl-id') || '');
  }

  function idFromRoot(root) {
    if (!root) return '';
    const tagged = taggedId(root);
    if (tagged) return tagged;
    const preferred = root.querySelectorAll(
      'a[class*="head-info_time"], a[class*="head-info"], time a, a[href*="/status/"], a[href*="/detail/"]'
    );
    for (const link of preferred) {
      const id = postIdFromLocation(link.href || link.getAttribute('href'));
      if (id) return id;
    }
    for (const link of root.querySelectorAll('a[href]')) {
      const id = postIdFromLocation(link.href || link.getAttribute('href'));
      if (id) return id;
    }
    const attrNode = root.closest?.('[data-mblogid], [data-mid], [mid]') ||
      root.querySelector?.('[data-mblogid], [data-mid], [mid]');
    const mid = root.getAttribute?.('data-mblogid') || root.getAttribute?.('data-mid') ||
      root.getAttribute?.('mid') || attrNode?.getAttribute?.('data-mblogid') ||
      attrNode?.getAttribute?.('data-mid') || attrNode?.getAttribute?.('mid');
    if (mid && /^[A-Za-z0-9]{5,}$/.test(mid)) return mid;
    const html = String(root.outerHTML || '').slice(0, 40000);
    const fromHtml = html.match(/mblogid["'\s:=]+([A-Za-z0-9]{5,})/) ||
      html.match(/"bid"\s*:\s*"([A-Za-z0-9]{5,})"/) ||
      html.match(/weibo\.com\/(?:\d{5,}|status)\/([A-Za-z0-9]{5,})/i);
    return fromHtml ? fromHtml[1] : '';
  }

  function tagPage() {
    return new Promise((resolve) => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const timer = setTimeout(() => {
        window.removeEventListener('message', onMessage);
        resolve(0);
      }, 500);
      function onMessage(event) {
        if (event.source !== window || event.data?.channel !== 'WEIBO_DL_PAGE' || event.data?.id !== id) return;
        window.removeEventListener('message', onMessage);
        clearTimeout(timer);
        resolve(Number(event.data.count || 0));
      }
      window.addEventListener('message', onMessage);
      window.postMessage({ channel: 'WEIBO_DL_PAGE', type: 'TAG', id }, '*');
    });
  }

  function watchCards(onChange) {
    let timer = 0;
    const run = () => {
      tagPage().finally(() => onChange?.());
    };
    run();
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(run, 400);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return observer;
  }

  function focusedRoot() {
    const viewH = globalThis.innerHeight || 800;
    const zoneTop = 80;
    const zoneBottom = viewH * 0.78;
    let best = null;
    let bestScore = -1;
    for (const el of listRoots()) {
      const rect = el.getBoundingClientRect();
      const overlap = Math.min(rect.bottom, zoneBottom) - Math.max(rect.top, zoneTop);
      if (overlap < (isSearchPage() ? 48 : 80)) continue;
      const score = overlap + (hasPlayer(el) ? 280 : 0);
      if (score > bestScore) {
        best = el;
        bestScore = score;
      }
    }
    return best;
  }

  function focusKey() {
    const root = focusedRoot();
    if (!root) return '';
    return idFromRoot(root) ||
      `${authorFrom(root)}|${textFrom(root).slice(0, 24)}|${root.querySelectorAll('img,video').length}`;
  }

  function postRoot(wantId) {
    const candidates = listRoots();
    if (wantId) {
      let best = null;
      let bestScore = -1000;
      for (const candidate of candidates) {
        const ownId = idFromRoot(candidate);
        if (ownId !== wantId && !String(candidate.innerHTML || '').includes(wantId)) continue;
        const score = scoreRoot(candidate, wantId);
        if (score > bestScore) {
          best = candidate;
          bestScore = score;
        }
      }
      if (best) return best;
    }
    return focusedRoot();
  }

  function textFrom(root) {
    const target = root.querySelector(
      '[class*="Feed_text"], [class*="detail_text"], [class*="wbtext"], ' +
      '[class*="wbpro-feed-content"], [class*="wbpro-feed-ogText"], ' +
      '[class~="weibo-text"], ' +
      '[node-type="feed_list_content"], p.txt, .txt'
    );
    return String(target?.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
  }

  function formatWeiboTime(value) {
    const raw = String(value || '').replace(/\s+/g, ' ').trim();
    if (!raw) return '';
    if (/昨天|今天|分钟前|小时前|刚刚|月|日/.test(raw) || /^\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2})?/.test(raw)) {
      return raw.slice(0, 16);
    }
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    return raw.slice(0, 16);
  }

  function visibleName(el) {
    const text = String(el?.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > 32) return '';
    if (/^(关注|已关注|回关|粉丝|转发|评论|赞|收藏|超话)$/.test(text)) return '';
    return text;
  }

  function authorFrom(root) {
    if (!root) return '';
    const selectors = [
      'a.name',
      '.info a.name',
      '.card-feed .name',
      '[nick-name]',
      'a[href*="/n/"]',
      '[class*="head_name"] a',
      '[class*="head_name"]',
      '[class*="UserInfo_name"]',
      '[class*="screen_name"]',
      'header [class*="name"]'
    ];
    for (const selector of selectors) {
      for (const el of root.querySelectorAll(selector)) {
        const name = visibleName(el);
        if (name) return name;
      }
    }
    for (const el of root.querySelectorAll('a[href*="/u/"]')) {
      const name = visibleName(el);
      if (name) return name;
    }
    return '';
  }

  function timeFrom(root) {
    const el = root.querySelector('a[class*="head-info_time"], time, .from a, [class*="from"] a');
    return formatWeiboTime(el?.getAttribute?.('title') || el?.textContent || '');
  }

  function sourceUrlFrom(root, contentId) {
    if (contentId && postIdFromLocation(location.href) === contentId) return location.href;
    if (/^\/(?:\d{4,})\/[A-Za-z0-9]+/.test(location.pathname) ||
      /^\/status\/[A-Za-z0-9]+/.test(location.pathname) ||
      /^\/detail\/[A-Za-z0-9]+/.test(location.pathname)) return location.href;
    const target = [...root.querySelectorAll('a[href]')]
      .find((link) => /weibo\.com\/\d{4,}\/[A-Za-z0-9]+/i.test(link.href) ||
        /m\.weibo\.cn\/status\/[A-Za-z0-9]+/i.test(link.href));
    return target?.href || location.href;
  }

  function contentIdFrom(sourceUrl) {
    return postIdFromLocation(sourceUrl) || '';
  }

  function titleFrom(text, id) {
    const oneLine = String(text || '').replace(/\s+/g, ' ').trim();
    return oneLine.slice(0, 42) || `微博-${id || '内容'}`;
  }

  function filenameFor(contentId, kind, index, url) {
    const prefix = kind === 'video' ? 'video_' : kind === 'text' ? '正文' : '';
    const ext = kind === 'text' ? 'txt' : DownloaderCore.media.extensionFor(url, kind);
    if (kind === 'text') return `weibo_${contentId || 'content'}_正文.txt`;
    return `weibo_${contentId || 'content'}_${prefix}${String(index).padStart(2, '0')}.${ext}`;
  }

  function pushMedia(items, seen, contentId, kind, url) {
    const clean = kind === 'image' ? originalImageUrl(url) || isHttpsMedia(url) : isHttpsMedia(url);
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    items.push({
      id: `${kind}:${clean}`, kind, url: clean,
      filename: filenameFor(contentId, kind, items.filter((item) => item.kind === kind).length + 1, clean)
    });
  }

  function backgroundUrls(root) {
    const urls = [];
    const nodes = [root, ...root.querySelectorAll('[class*="poster"], [class*="picture"], [class*="Picture"], [class*="video"], [style*="background"]')];
    for (const node of nodes) {
      const style = node.getAttribute?.('style') || '';
      const fromAttr = style.match(/url\(["']?(https:[^"')]+)["']?\)/i);
      if (fromAttr) urls.push(fromAttr[1]);
      try {
        const bg = getComputedStyle(node).backgroundImage;
        const fromCss = bg && bg.match(/url\(["']?(https:[^"')]+)["']?\)/i);
        if (fromCss) urls.push(fromCss[1]);
      } catch (_) {}
    }
    return urls;
  }

  function collectImageItems(root, contentId) {
    const items = [];
    const seen = new Set();
    const taggedCover = root.getAttribute?.('data-weibo-dl-cover') ||
      root.querySelector?.('[data-weibo-dl-cover]')?.getAttribute?.('data-weibo-dl-cover');
    pushMedia(items, seen, contentId, 'image', taggedCover);
    const nodes = [...root.querySelectorAll('img, source, picture')];
    for (const link of root.querySelectorAll('a[href*="sinaimg.cn"]')) nodes.push(link);
    for (const video of root.querySelectorAll('video[poster], [poster]')) {
      pushMedia(items, seen, contentId, 'image', video.getAttribute('poster'));
    }
    for (const image of root.querySelectorAll(
      '[class*="wbpv"] img, [class*="poster"] img, [class*="woo-picture"] img, [class*="picture"] img'
    )) {
      pushMedia(items, seen, contentId, 'image', mediaUrl(image));
    }
    for (const image of nodes) {
      const source = image.href || mediaUrl(image);
      if (source && !looksLikeMediaImage(image, source) && !image.poster) continue;
      pushMedia(items, seen, contentId, 'image', source);
    }
    for (const url of backgroundUrls(root)) pushMedia(items, seen, contentId, 'image', url);
    return items;
  }

  function collectDomVideoItems(root, contentId) {
    const items = [];
    const seen = new Set();
    const taggedVideo = root.getAttribute?.('data-weibo-dl-video') ||
      root.querySelector?.('[data-weibo-dl-video]')?.getAttribute?.('data-weibo-dl-video');
    pushMedia(items, seen, contentId, 'video', taggedVideo);
    const videos = [...root.querySelectorAll('video, source')];
    if (location.hostname === 'm.weibo.cn' && postIdFromLocation(location.href)) {
      for (const video of document.querySelectorAll('.mwb-video video, video')) {
        if (isVisible(video) && !videos.includes(video)) videos.push(video);
      }
    }
    for (const video of videos) {
      pushMedia(items, seen, contentId, 'video', directVideoUrl(video));
      pushMedia(items, seen, contentId, 'video', video.getAttribute?.('data-src'));
      pushMedia(items, seen, contentId, 'video', video.getAttribute?.('data-url'));
      pushMedia(items, seen, contentId, 'video', video.getAttribute?.('src'));
    }
    const html = String(root.outerHTML || '');
    for (const match of html.match(/https:\/\/[^"' \s<>]*(?:video\.weibocdn\.com|weibocdn\.com)[^"' \s<>]*/gi) || []) {
      pushMedia(items, seen, contentId, 'video', match);
    }
    for (const match of html.match(/https:\/\/[^"' \s<>]+\.mp4[^"' \s<>]*/gi) || []) {
      pushMedia(items, seen, contentId, 'video', match);
    }
    return items;
  }

  function pickVideoUrl(mediaInfo, extraUrls) {
    const list = [];
    const add = (value) => {
      const url = isHttpsMedia(value);
      if (url) list.push(url);
    };
    const info = mediaInfo || {};
    add(info.mp4_720p_mp4);
    add(info.mp4_hd_mp4);
    add(info.mp4_ld_mp4);
    add(info.mp4_hd_url);
    add(info.mp4_sd_url);
    add(info.h265_mp4_hd);
    add(info.stream_url_hd);
    add(info.stream_url);
    for (const item of info.playback_list || []) add(item?.play_info?.url);
    for (const value of Object.values(extraUrls || {})) add(value);
    return list.find((url) => /\.mp4(?:[?#]|$)/i.test(url)) || list[0] || '';
  }

  function statusToContent(status, source) {
    const contentId = String(status.mblogid || status.bid || status.id || postIdFromLocation(location.href) || '');
    const text = String(status.text_raw || status.text || '').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
    const author = String(status.user?.screen_name || status.user?.name || '');
    const items = [];
    const seen = new Set();
    const push = (kind, url) => {
      const clean = kind === 'image' ? originalImageUrl(url) || isHttpsMedia(url) : isHttpsMedia(url);
      if (!clean || seen.has(clean)) return;
      seen.add(clean);
      items.push({
        id: `${kind}:${clean}`, kind, url: clean,
        filename: filenameFor(contentId, kind, items.filter((item) => item.kind === kind).length + 1, clean)
      });
    };

    if (text) {
      items.push({
        id: `text:${contentId}`, kind: 'text', text,
        filename: filenameFor(contentId, 'text')
      });
    }

    const infos = status.pic_infos || {};
    const picIds = Array.isArray(status.pic_ids) && status.pic_ids.length ? status.pic_ids : Object.keys(infos);
    for (const picId of picIds) {
      const info = infos[picId] || {};
      push('image', info.largest?.url || info.original?.url || info.large?.url || info.url);
    }
    for (const pic of status.pics || []) {
      push('image', pic?.large?.url || pic?.url);
    }
    for (const item of status.mix_media_info?.items || []) {
      const data = item.data || {};
      if (item.type === 1 || item.type === 'pic') {
        push('image', data.largest?.url || data.large?.url || data.url);
      } else {
        push('video', pickVideoUrl(data.media_info, data.urls));
      }
    }
    push('video', pickVideoUrl(status.page_info?.media_info, status.page_info?.urls));
    if (status.retweeted_status) {
      const nested = statusToContent(status.retweeted_status, source);
      for (const item of nested.items) {
        if (item.kind === 'text') continue;
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        items.push(item);
      }
    }

    const cover = originalImageUrl(
      (typeof status.page_info?.page_pic === 'string' ? status.page_info.page_pic : status.page_info?.page_pic?.url) ||
      status.page_info?.pic ||
      status.page_info?.media_info?.big_pic_info?.pic_big?.url ||
      ''
    );
    debug().log('接口转换', source, contentId, `图${items.filter((item) => item.kind === 'image').length}`, `视频${items.filter((item) => item.kind === 'video').length}`);
    return {
      id: contentId,
      title: titleFrom(text, contentId),
      author,
      sourceUrl: location.href,
      publishedAt: formatWeiboTime(status.created_at),
      cover,
      items
    };
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json,text/plain,*/*', 'X-Requested-With': 'XMLHttpRequest' }
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  }

  async function fetchCurrentStatus(contentId) {
    const endpoints = [];
    if (location.hostname === 'm.weibo.cn') {
      endpoints.push(`https://m.weibo.cn/statuses/show?id=${encodeURIComponent(contentId)}`);
    }
    endpoints.push(`https://weibo.com/ajax/statuses/show?id=${encodeURIComponent(contentId)}`);
    if (location.hostname !== 'm.weibo.cn') {
      endpoints.push(`https://m.weibo.cn/statuses/show?id=${encodeURIComponent(contentId)}`);
    }
    let lastError = '';
    for (const url of endpoints) {
      try {
        debug().log('拉取当前微博', debug().shortUrl(url), contentId);
        const data = await fetchJson(url);
        if (data && data.ok === 0) throw new Error(data.message || data.msg || '接口拒绝');
        const status = data?.data && (data.data.text_raw || data.data.bid || data.data.pics)
          ? data.data
          : data;
        if (!status || !(status.mblogid || status.bid || status.id || status.text_raw || status.pic_infos)) {
          lastError = '接口无微博数据';
          continue;
        }
        const currentId = String(status.mblogid || status.bid || status.id || '');
        if (currentId && contentId && currentId !== contentId && String(status.id) !== contentId && String(status.mid) !== contentId) {
          debug().log('接口返回了非当前微博', currentId, '期望', contentId);
        }
        return statusToContent(status, url.includes('m.weibo.cn') ? 'm.weibo' : 'weibo.com');
      } catch (error) {
        lastError = String(error?.message || error);
        debug().log('接口失败', debug().shortUrl(url), lastError);
      }
    }
    throw new Error(lastError || '当前微博接口不可用');
  }

  async function collectFromDom(contentId, preferredRoot) {
    const root = preferredRoot && document.contains(preferredRoot) ? preferredRoot : postRoot(contentId);
    if (!root) {
      debug().log('DOM 暂无可见微博', `候选${listRoots().length}`);
      return { id: '', title: '等待时间线', author: '', sourceUrl: location.href, publishedAt: '', items: [] };
    }
    const sourceUrl = sourceUrlFrom(root, contentId);
    const id = contentId || idFromRoot(root) || contentIdFrom(sourceUrl);
    const text = textFrom(root);
    const items = [];
    if (text) {
      items.push({
        id: `text:${id || sourceUrl}`, kind: 'text', text,
        filename: filenameFor(id, 'text')
      });
    }
    items.push(...collectImageItems(root, id), ...collectDomVideoItems(root, id));
    debug().log(
      'DOM 兜底', id || '无ID', `项目${items.length}`,
      hasPlayer(root) ? '有播放器' : '无播放器',
      mediaHints(root),
      root.tagName,
      String(root.className || '').slice(0, 40),
      `候选${listRoots().length}`,
      authorFrom(root) || '无博主',
      titleFrom(text, id).slice(0, 18)
    );
    const cover = originalImageUrl(
      root.getAttribute?.('data-weibo-dl-cover') ||
      root.querySelector?.('[data-weibo-dl-cover]')?.getAttribute('data-weibo-dl-cover') ||
      root.querySelector('video[poster]')?.getAttribute('poster') ||
      items.find((item) => item.kind === 'image')?.url ||
      ''
    );
    return {
      id, title: titleFrom(text, id), author: authorFrom(root),
      sourceUrl, publishedAt: timeFrom(root), cover, items
    };
  }

  globalThis.SiteAdapter = DownloaderCore.platform.validateAdapter({
    id: 'weibo',
    label: '微博下载助手',
    matches: isWeiboHost,

    postIdFromHref: postIdFromLocation,
    idFromRoot,
    closestRoot,
    focusKey,
    watchCards,
    tagPage,

    async collect(options) {
      const tagged = await tagPage();
      debug().log('页面标记', tagged);
      const root = options?.root && document.contains(options.root) ? options.root : focusedRoot();
      const contentId = String(options?.contentId || postIdFromLocation(location.href) || (root && idFromRoot(root)) || '');
      debug().log('识别当前页', location.hostname + location.pathname, contentId || '无微博ID');
      if (contentId) {
        try {
          const data = await fetchCurrentStatus(contentId);
          if (!data.author && root) data.author = authorFrom(root);
          if (!data.publishedAt && root) data.publishedAt = timeFrom(root);
          return data;
        } catch (error) {
          debug().log('改用当前页 DOM', error.message || error);
        }
      }
      return collectFromDom(contentId, root);
    }
  });
})();
