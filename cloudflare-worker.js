import openNextWorker from './.open-next/worker.js';
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';
import { canonicalRedirect } from './src/lib/canonicalRedirect.js';

const worker = {
  fetch(request, env, ctx) {
    return canonicalRedirect(request) || openNextWorker.fetch(request, env, ctx);
  },
};
export default worker;
