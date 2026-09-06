// Static seam for the Netlify Functions bundler (AID-947). The collector's
// runtime import must stay dynamic+caught so local/vitest runs fall back to
// the NDJSON sink gracefully — but a dynamic import of a bare specifier is
// opaque to the esbuild bundler, so `@netlify/blobs` never shipped inside
// the deployed bundle and production silently fell back to the ephemeral
// /tmp NDJSON sink (countersign finding AID-940, defect AID-947). This
// module gives the bundler a STATIC import it can trace and inline; only
// the lazy BlobsEventStore.create() path ever loads it, so test runners
// without the dependency keep working.
export { getStore } from "@netlify/blobs";
