(function initPlatform(root, factory) {
  const api = factory();
  root.DownloaderCore = root.DownloaderCore || {};
  root.DownloaderCore.platform = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function platformFactory() {
  const REQUIRED_METHODS = ['matches', 'collect'];
  const ITEM_KINDS = new Set(['image', 'video', 'audio', 'text']);

  function validateAdapter(adapter) {
    if (!adapter || typeof adapter !== 'object') throw new Error('platform adapter is required');
    if (!/^[a-z][a-z0-9-]*$/.test(String(adapter.id || ''))) throw new Error('adapter.id must be a stable lowercase identifier');
    if (!String(adapter.label || '').trim()) throw new Error('adapter.label is required');
    REQUIRED_METHODS.forEach((name) => {
      if (typeof adapter[name] !== 'function') throw new Error(`adapter.${name} must be a function`);
    });
    return adapter;
  }

  function normalizeContent(value) {
    const content = value && typeof value === 'object' ? value : {};
    const seen = new Set();
    const items = [];
    for (const raw of Array.isArray(content.items) ? content.items : []) {
      if (!raw || !ITEM_KINDS.has(raw.kind)) continue;
      const key = raw.id || raw.url || `${raw.kind}:${raw.text || ''}`;
      if (!key || seen.has(key)) continue;
      if (raw.kind === 'text' && !String(raw.text || '').trim()) continue;
      if (raw.kind !== 'text' && !/^https:\/\//i.test(String(raw.url || ''))) continue;
      if (raw.kind === 'video' && /\.m3u8(?:[?#]|$)/i.test(String(raw.url || ''))) continue;
      seen.add(key);
      items.push({ ...raw, id: String(raw.id || key) });
    }
    return {
      id: String(content.id || ''),
      title: String(content.title || '未命名内容'),
      author: String(content.author || ''),
      sourceUrl: String(content.sourceUrl || ''),
      publishedAt: String(content.publishedAt || ''),
      cover: String(content.cover || ''),
      items
    };
  }

  return { REQUIRED_METHODS, ITEM_KINDS, validateAdapter, normalizeContent };
});

