import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// R2 incremental cache: create bucket `kamala-next-cache`, uncomment the
// r2_buckets binding in wrangler.jsonc, then switch to:
//   import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
//   export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache });
export default defineCloudflareConfig({});
