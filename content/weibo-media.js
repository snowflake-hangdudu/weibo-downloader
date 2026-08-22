(function initMedia(root, factory) {
  const api = factory();
  root.DownloaderCore = root.DownloaderCore || {};
  root.DownloaderCore.media = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function mediaFactory() {
  const DEFAULT_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov', 'm4a', 'mp3', 'txt']);

  function safeFilename(value, fallback, maxLength) {
    const backup = String(fallback || 'download');
    return String(value || backup)
      .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/g, '')
      .trim()
      .slice(0, Number(maxLength) > 0 ? Number(maxLength) : 100) || backup;
  }

  function extensionFor(value, kind, allowedExtensions) {
    const allowed = allowedExtensions || DEFAULT_EXTENSIONS;
    try {
      const path = new URL(String(value || '')).pathname;
      const match = path.match(/\.([a-z0-9]{2,5})$/i);
      if (match && allowed.has(match[1].toLowerCase())) {
        return match[1].toLowerCase().replace('jpeg', 'jpg');
      }
    } catch (_) {}
    if (kind === 'video') return 'mp4';
    if (kind === 'audio') return 'm4a';
    if (kind === 'text') return 'txt';
    return 'jpg';
  }

  function kindLabel(kind, labels) {
    const names = { image: '图片', video: '视频', audio: '音频', text: '文字', ...(labels || {}) };
    return names[kind] || '文件';
  }

  function uniqueHttpsUrls(values) {
    const seen = new Set();
    const result = [];
    for (const value of values || []) {
      try {
        const url = new URL(String(value || ''));
        if (url.protocol !== 'https:' || seen.has(url.href)) continue;
        seen.add(url.href);
        result.push(url.href);
      } catch (_) {}
    }
    return result;
  }

  function toUint8(buffer) {
    if (buffer instanceof Uint8Array) return buffer;
    if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
    if (ArrayBuffer.isView(buffer)) return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    throw new Error('empty');
  }

  function bytesToDataUrl(buffer, mime) {
    const bytes = toUint8(buffer);
    if (!bytes.byteLength) throw new Error('empty');
    let binary = '';
    const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    }
    return `data:${mime || 'application/octet-stream'};base64,` + btoa(binary);
  }

  function textDataUrl(text) {
    return bytesToDataUrl(new TextEncoder().encode(String(text || '')), 'text/plain;charset=utf-8');
  }

  function buildDownloadPath(options) {
    const opts = options || {};
    const rootName = safeFilename(opts.root, '下载');
    const folder = safeFilename(opts.title, '内容');
    const index = String(Number(opts.index || 0) + 1).padStart(2, '0');
    const label = safeFilename(opts.label || kindLabel(opts.kind), '文件');
    const ext = String(opts.extension || extensionFor(opts.url, opts.kind)).replace(/^\./, '');
    return `${rootName}/${folder}/${index}-${label}.${ext}`;
  }

  return { safeFilename, extensionFor, kindLabel, uniqueHttpsUrls, toUint8, bytesToDataUrl, textDataUrl, buildDownloadPath };
});

