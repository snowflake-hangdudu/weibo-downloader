importScripts('content/weibo-runtime.js', 'content/weibo-remote-content.js', 'content/weibo-media.js');

const EXT = DownloaderCore.runtime.getApi();
const CONFIG_URL = 'https://download-config-hub.nutmeg-venus-6882.chatgpt.site/api/config/weibo';
const CONFIG_MESSAGE = 'WEIBO_DL_FETCH_JSON';
const downloadTargets = new Map();
const RESOURCE_TYPES = ['sub_frame', 'image', 'media', 'xmlhttprequest', 'object', 'other'];

function log(...args) {
  console.log('[WEIBODL-BG]', ...args);
}

function cdnRule(id, urlFilter) {
  return {
    id,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [{ header: 'Referer', operation: 'set', value: 'https://weibo.com/' }]
    },
    condition: { urlFilter, resourceTypes: RESOURCE_TYPES }
  };
}

function installCdnRules() {
  const api = EXT.declarativeNetRequest;
  if (!api?.updateDynamicRules) {
    log('DNR 动态规则不可用');
    return;
  }
  DownloaderCore.runtime.invoke(api.updateDynamicRules, api, [{
    removeRuleIds: [101, 102],
    addRules: [
      cdnRule(101, '||sinaimg.cn'),
      cdnRule(102, '||weibocdn.com')
    ]
  }]).then(() => log('CDN Referer 规则已写入'))
    .catch((error) => log('CDN Referer 规则失败', String(error?.message || error)));
}

EXT.runtime.onInstalled.addListener(() => {
  log('installed', DownloaderCore.runtime.getVersion(EXT));
  installCdnRules();
});
if (EXT.runtime.onStartup?.addListener) EXT.runtime.onStartup.addListener(installCdnRules);
installCdnRules();

const configHandler = DownloaderCore.remote.createConfigMessageHandler({
  configUrl: CONFIG_URL,
  messageType: CONFIG_MESSAGE
});

EXT.action?.onClicked?.addListener((tab) => {
  if (tab?.id === undefined) return;
  DownloaderCore.runtime.invoke(EXT.tabs?.sendMessage, EXT.tabs, [tab.id, {
    type: 'DOWNLOADER_OPEN_PANEL'
  }]).catch(() => {});
});

const OFFSCREEN_URL = 'offscreen/offscreen.html';
const SMALL_DATA_URL = 1800000;

async function ensureOffscreen() {
  const api = EXT.offscreen;
  if (!api?.createDocument) throw new Error('offscreen unavailable');
  const pageUrl = EXT.runtime.getURL(OFFSCREEN_URL);
  if (EXT.runtime.getContexts) {
    const existing = await DownloaderCore.runtime.invoke(EXT.runtime.getContexts, EXT.runtime, [{
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [pageUrl]
    }]);
    if (Array.isArray(existing) && existing.length) return;
  }
  try {
    await DownloaderCore.runtime.invoke(api.createDocument, api, [{
      url: OFFSCREEN_URL,
      reasons: ['BLOBS'],
      justification: '为已读取的微博图片和视频生成本地下载地址'
    }]);
  } catch (error) {
    const text = String(error?.message || error);
    if (!/single offscreen|already exists|Only a single/i.test(text)) throw error;
  }
}

function revokeBlobLater(url) {
  setTimeout(() => {
    DownloaderCore.runtime.invoke(EXT.runtime.sendMessage, EXT.runtime, [{
      type: 'WEIBO_DL_REVOKE_BLOB',
      url
    }]).catch(() => {});
  }, 120000);
}

async function blobUrlFromBytes(item) {
  await ensureOffscreen();
  const result = await DownloaderCore.runtime.invoke(EXT.runtime.sendMessage, EXT.runtime, [{
    type: 'WEIBO_DL_MAKE_BLOB',
    buffer: item.buffer,
    dataUrl: item.dataUrl,
    mime: item.mime
  }]);
  if (!result?.ok || !result.url) throw new Error(result?.error || 'offscreen blob failed');
  revokeBlobLater(result.url);
  return result.url;
}

async function downloadUrlFromItem(item) {
  if (item.kind === 'text') return DownloaderCore.media.textDataUrl(item.text);
  const dataUrl = String(item.dataUrl || '');
  if (dataUrl.startsWith('data:') && dataUrl.length < SMALL_DATA_URL) return dataUrl;
  if (item.buffer || dataUrl.startsWith('data:')) {
    try {
      const blobUrl = await blobUrlFromBytes(item);
      log('已生成本地文件', item.kind, item.buffer?.byteLength || dataUrl.length);
      return blobUrl;
    } catch (error) {
      log('offscreen 失败', String(error?.message || error));
      if (dataUrl.startsWith('data:')) return dataUrl;
      return DownloaderCore.media.bytesToDataUrl(item.buffer, item.mime);
    }
  }
  return String(item.url || '');
}

function isDownloadableUrl(url) {
  return DownloaderCore.runtime.isHttpsUrl(url) || String(url || '').startsWith('blob:') || String(url || '').startsWith('data:');
}

EXT.runtime.onMessage.addListener((message, sender, respond) => {
  const configResult = configHandler(message, sender, respond);
  if (configResult !== undefined) return configResult;
  if (message?.type === 'WEIBO_DL_MAKE_BLOB' || message?.type === 'WEIBO_DL_REVOKE_BLOB') return undefined;
  if (message?.type !== 'WEIBO_DL_DOWNLOAD') return undefined;

  const item = message.item || {};
  const jobId = message.jobId || ('job-' + Date.now());
  log('收到任务', item.kind, Number(item.buffer?.byteLength || 0), String(item.dataUrl || '').startsWith('data:') ? item.dataUrl.length : 0);
  (async () => {
    let url = '';
    try {
      url = await downloadUrlFromItem(item);
      if (url.startsWith('data:')) log('使用已读取数据', item.kind, url.length);
    } catch (error) {
      const detail = String(error?.message || error);
      log('本地数据准备失败', jobId, detail);
      respond({ ok: false, jobId, error: '无法准备本地下载：' + detail });
      return;
    }
    if (item.kind !== 'text' && !isDownloadableUrl(url)) {
      log('地址无效', item.kind, jobId);
      respond({ ok: false, jobId, error: '媒体地址无效' });
      return;
    }

    const filename = item.filename || DownloaderCore.media.buildDownloadPath({
      root: '微博内容下载与备份助手',
      title: message.title,
      index: item.index,
      label: item.kind,
      kind: item.kind,
      url
    });

    log('开始下载', item.kind, filename, url.startsWith('blob:') ? 'blob' : url.startsWith('data:') ? 'data' : 'https');
    try {
      const downloadId = await DownloaderCore.runtime.invoke(EXT.downloads.download, EXT.downloads, [{
        url,
        filename,
        conflictAction: 'uniquify',
        saveAs: false
      }]);
      if (sender.tab?.id !== undefined) downloadTargets.set(downloadId, { tabId: sender.tab.id, jobId });
      log('浏览器已接受', downloadId, filename);
      respond({ ok: true, jobId, downloadId });
    } catch (error) {
      log('浏览器拒绝', String(error?.message || error));
      respond({ ok: false, jobId, error: String(error?.message || error) });
    }
  })();
  return true;
});

EXT.downloads.onChanged.addListener((delta) => {
  const error = delta?.error?.current;
  const state = delta?.state?.current;
  if (!error && state !== 'complete' && state !== 'interrupted') return;
  const target = downloadTargets.get(delta.id);
  if (state === 'complete') log('下载完成', delta.id);
  if (error) log('下载中断', delta.id, error);
  downloadTargets.delete(delta.id);
  if (!error || target?.tabId === undefined) return;
  DownloaderCore.runtime.invoke(EXT.tabs?.sendMessage, EXT.tabs, [target.tabId, {
    type: 'WEIBO_DL_DOWNLOAD_ERROR',
    jobId: target.jobId,
    error: `浏览器下载失败：${error}`
  }]).catch(() => {});
});
