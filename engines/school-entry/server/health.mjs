import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { chromium } from "playwright";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
function publicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  // Reject mapped IPv4 and all non-global IPv6 ranges conservatively.
  return (
    isIP(address) === 6 &&
    /^[23][0-9a-f]{3}:/i.test(address) &&
    !address.toLowerCase().startsWith("2001:db8:")
  );
}
export async function validateTarget(
  raw,
  { allowLocal = false, origin, lookup = dnsLookup } = {},
) {
  const url = new URL(raw);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (origin && url.origin !== origin)
  )
    throw Error("untrusted target");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (allowLocal) return url;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  )
    throw Error("private target");
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw Error("private target");
  return url;
}
// Resolve once and pin the socket to that validated address, preventing DNS rebinding.
export async function fetchPinned(request, options) {
  if (!["GET", "HEAD"].includes(request.method()))
    throw Error("read-only probe");
  const url = await validateTarget(request.url(), {
    ...options,
    lookup: options.lookup ?? dnsLookup,
  });
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await (options.lookup ?? dnsLookup)(host, { all: true });
  if (
    !addresses.length ||
    (!options.allowLocal && addresses.some((a) => !publicAddress(a.address)))
  )
    throw Error("private target");
  const address = addresses[0];
  return new Promise((resolve, reject) => {
    const client = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        method: request.method(),
        headers: { accept: "*/*", "accept-encoding": "identity" },
        lookup: (_host, opts, callback) =>
          opts.all
            ? callback(null, [address])
            : callback(null, address.address, address.family),
      },
      (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400) {
          response.destroy();
          reject(Error("redirect rejected"));
          return;
        }
        const chunks = [];
        let size = 0;
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > 5 * 1024 * 1024) {
            response.destroy(Error("resource too large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => {
          const headers = Object.fromEntries(
            Object.entries(response.headers)
              .filter(
                ([k]) =>
                  ![
                    "transfer-encoding",
                    "content-length",
                    "set-cookie",
                  ].includes(k),
              )
              .map(([k, v]) => [
                k,
                Array.isArray(v) ? v.join(", ") : String(v),
              ]),
          );
          resolve({
            status: response.statusCode,
            headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    const deadline = setTimeout(
      () => client.destroy(Error("timeout")),
      options.timeout,
    );
    client.on("close", () => clearTimeout(deadline));
    client.on("error", reject);
    client.end();
  });
}
export function createChecker({
  allowLocal = false,
  timeout = 10000,
  concurrency = 3,
  maxQueue = 26,
} = {}) {
  let browserPromise,
    active = 0;
  const waiters = [];
  const browser = () =>
    (browserPromise ??= chromium.launch({ headless: true }).catch((e) => {
      browserPromise = undefined;
      throw e;
    }));
  const checker = async (target) => {
    const start = Date.now();
    if (active >= concurrency) {
      if (waiters.length >= maxQueue) return false;
      const admitted = await new Promise((resolve) => {
        const item = { resolve };
        item.timer = setTimeout(() => {
          const i = waiters.indexOf(item);
          if (i >= 0) waiters.splice(i, 1);
          resolve(false);
        }, timeout);
        waiters.push(item);
      });
      if (!admitted) return false;
    }
    active++;
    let context,
      timer,
      expired = false;
    try {
      const remaining = () => Math.max(1, timeout - (Date.now() - start));
      if (Date.now() - start >= timeout) return false;
      const check = async () => {
        const url = await validateTarget(target.url, { allowLocal });
        if (typeof target.readySelector !== "string" || !target.readySelector)
          return false;
        const instance = await browser();
        if (expired) return false;
        context = await instance.newContext({
          serviceWorkers: "block",
          acceptDownloads: false,
        });
        if (expired) {
          await context.close();
          return false;
        }
        let resources = 0,
          inFlight = 0;
        await context.route("**/*", async (route) => {
          if (++resources > 100 || inFlight >= 16) {
            await route.abort();
            return;
          }
          inFlight++;
          try {
            const response = await fetchPinned(route.request(), {
              allowLocal,
              origin: url.origin,
              timeout: remaining(),
            });
            await route.fulfill(response);
          } catch {
            await route.abort().catch(() => {});
          } finally {
            inFlight--;
          }
        });
        await context.routeWebSocket("**/*", (socket) => socket.close());
        const page = await context.newPage();
        const response = await page.goto(url.href, {
          waitUntil: "domcontentloaded",
          timeout: remaining(),
        });
        if (!response || response.status() >= 400) return false;
        const ready = page.locator(target.readySelector).first();
        await ready.waitFor({ state: "visible", timeout: remaining() });
        return await ready.isEnabled();
      };
      return (
        (await Promise.race([
          check(),
          new Promise((resolve) => {
            timer = setTimeout(() => {
              expired = true;
              resolve(false);
            }, remaining());
          }),
        ])) === true
      );
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
      await context?.close().catch(() => {});
      active--;
      const next = waiters.shift();
      if (next) {
        clearTimeout(next.timer);
        next.resolve(true);
      }
    }
  };
  checker.close = async () => {
    for (const w of waiters.splice(0)) {
      clearTimeout(w.timer);
      w.resolve(false);
    }
    await (await browserPromise)?.close();
  };
  return checker;
}
