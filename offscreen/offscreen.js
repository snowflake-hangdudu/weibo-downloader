const EXT = typeof chrome !== 'undefined' ? chrome : browser;
const urls = new Map();

function toUint8(buffer) {
  if (buffer instanceof Uint8Array) return buffer;
  if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
  if (ArrayBuffer.isView(buffer)) return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  throw new Error('empty');
}

async function blobFromMessage(message) {
  if (String(message.dataUrl || '').startsWith('data:')) {
    const response = await fetch(message.dataUrl);
    if (!response.ok) throw new Error('data url ' + response.status);
    return response.blob();
  }
  const bytes = toUint8(message.buffer);
  if (!bytes.byteLength) throw new Error('empty');
  return new Blob([bytes], { type: message.mime || 'application/octet-stream' });
}

EXT.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.type === 'WEIBO_DL_MAKE_BLOB') {
    blobFromMessage(message).then((blob) => {
      if (!blob.size) throw new Error('empty');
      const url = URL.createObjectURL(blob);
      urls.set(url, url);
      console.log('[WEIBODL-OFF]', 'blob ready', blob.size, blob.type);
      respond({ ok: true, url, size: blob.size });
    }).catch((error) => {
      console.log('[WEIBODL-OFF]', 'blob failed', String(error?.message || error));
      respond({ ok: false, error: String(error?.message || error) });
    });
    return true;
  }
  if (message?.type === 'WEIBO_DL_REVOKE_BLOB') {
    const url = String(message.url || '');
    if (urls.has(url)) {
      URL.revokeObjectURL(url);
      urls.delete(url);
    }
    respond({ ok: true });
    return true;
  }
  return undefined;
});
