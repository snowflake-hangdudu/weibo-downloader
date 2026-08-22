(function initQueue(root, factory) {
  const api = factory();
  root.DownloaderCore = root.DownloaderCore || {};
  root.DownloaderCore.queue = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function queueFactory() {
  function createTaskQueue(options) {
    const opts = options || {};
    if (typeof opts.worker !== 'function') throw new Error('queue worker is required');
    const concurrency = Math.max(1, Number(opts.concurrency) || 1);
    const onEvent = typeof opts.onEvent === 'function' ? opts.onEvent : () => {};
    let paused = false;
    let controller = null;
    let resumeWaiters = [];
    let state = 'idle';

    function emit(type, detail) {
      onEvent({ type, state, ...(detail || {}) });
    }

    function waitUntilResumed() {
      if (!paused) return Promise.resolve();
      return new Promise((resolve) => resumeWaiters.push(resolve));
    }

    async function run(items) {
      if (state === 'running' || state === 'paused') throw new Error('queue is already running');
      const list = Array.from(items || []);
      controller = new AbortController();
      paused = false;
      state = 'running';
      let cursor = 0;
      const results = new Array(list.length);
      emit('start', { total: list.length });

      async function runner() {
        while (cursor < list.length && !controller.signal.aborted) {
          await waitUntilResumed();
          if (controller.signal.aborted) break;
          const index = cursor;
          cursor += 1;
          emit('item-start', { index, item: list[index] });
          try {
            results[index] = { status: 'fulfilled', value: await opts.worker(list[index], { index, signal: controller.signal }) };
            emit('item-done', { index, item: list[index], value: results[index].value });
          } catch (error) {
            results[index] = { status: 'rejected', reason: error };
            emit('item-error', { index, item: list[index], error });
          }
        }
      }

      await Promise.all(Array.from({ length: Math.min(concurrency, list.length || 1) }, runner));
      state = controller.signal.aborted ? 'cancelled' : 'done';
      emit(state, { results });
      return results;
    }

    function pause() {
      if (state !== 'running') return false;
      paused = true;
      state = 'paused';
      emit('pause');
      return true;
    }

    function resume() {
      if (!paused) return false;
      paused = false;
      state = 'running';
      const waiters = resumeWaiters;
      resumeWaiters = [];
      waiters.forEach((resolve) => resolve());
      emit('resume');
      return true;
    }

    function cancel() {
      if (!controller || (state !== 'running' && state !== 'paused')) return false;
      controller.abort();
      paused = false;
      const waiters = resumeWaiters;
      resumeWaiters = [];
      waiters.forEach((resolve) => resolve());
      state = 'cancelled';
      emit('cancel');
      return true;
    }

    function getState() {
      return { state, paused, concurrency };
    }

    return { run, pause, resume, cancel, getState };
  }

  return { createTaskQueue };
});
