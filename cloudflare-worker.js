import openNextWorker from './.open-next/worker.js';
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';
import { canonicalRedirect } from './src/lib/canonicalRedirect.js';
import { handleAnalyticsCollect } from './src/lib/analytics/ingest.mjs';

const worker = {
  fetch(request, env, ctx) {
    const redirect = canonicalRedirect(request);
    if (redirect) return redirect;
    if (new URL(request.url).pathname === '/api/analytics/collect') return handleAnalyticsCollect(request, env);
    return openNextWorker.fetch(request, env, ctx);
  },
};
export default worker;
