// @ts-nocheck server code (CommonJS, like server.js); its pure parts are tested in test/
'use strict';

/**
 * The picture a restaurant's own website shares (its og:image, or failing
 * that twitter:image), for places OpenStreetMap has no photo for.
 *
 * The server fetches whatever web address a restaurant lists, so it guards
 * against being pointed at itself or the network it runs in (Cloud Run's
 * metadata server, private addresses): only http(s) on the usual ports, every
 * address the name resolves to must be public, the request goes to the
 * address that was checked (no second lookup to swap it), every redirect is
 * checked the same way, and it stops after a few seconds and 256 KB. Only an
 * image address ever goes back to the app, never the page.
 *
 * The parsing is pure and tested in test/pageImage.test.js.
 */

const dns = require('dns');
const http = require('http');
const https = require('https');
const net = require('net');

const TIMEOUT_MS = 3500;
const MAX_BYTES = 256 * 1024;
const MAX_REDIRECTS = 3;

/**
 * A web address as listed in OpenStreetMap ("www.example.com" often has no
 * scheme), if it is one we would fetch.
 *
 * @param {string} raw
 * @returns {URL | null}
 */
function normalizePageUrl(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed || trimmed.length > 500) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch (error) {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== '80' && url.port !== '443') return null;
  if (!url.hostname.includes('.') || url.hostname.endsWith('.local') || url.hostname.endsWith('.internal')) return null;
  return url;
}

/**
 * Whether an IP address is on the public internet: not loopback, private,
 * link-local (the cloud metadata server is 169.254.169.254), carrier-grade
 * NAT, multicast or reserved, in IPv4 or IPv6 (IPv4-mapped included).
 *
 * @param {string} address
 * @returns {boolean}
 */
function isPublicAddress(address) {
  const family = net.isIP(address);
  if (family === 4) {
    const [a, b] = address.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && (b === 168 || b === 0)) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    return true;
  }
  if (family === 6) {
    const lower = address.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped) return isPublicAddress(mapped[1]);
    if (lower === '::' || lower === '::1') return false;
    if (/^f[cd]/.test(lower)) return false; // unique local fc00::/7
    if (/^fe[89ab]/.test(lower)) return false; // link-local fe80::/10
    if (/^ff/.test(lower)) return false; // multicast
    return true;
  }
  return false;
}

/** @param {string} value */
function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

/**
 * The content of a <meta> tag in the page's head, whichever order its
 * attributes come in.
 *
 * @param {string} html
 * @param {'property' | 'name'} attribute
 * @param {string} value e.g. og:image
 * @returns {string | null}
 */
function metaContent(html, attribute, value) {
  const head = /<head[\s\S]*?<\/head>/i.exec(html);
  const scope = head ? head[0] : html.slice(0, 50000);
  const tags = scope.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const key = new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, 'i').exec(tag);
    if (!key || key[1].toLowerCase() !== value.toLowerCase()) continue;
    const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag);
    if (content && content[1].trim()) return content[1].trim();
  }
  return null;
}

/**
 * An image address from a page, made absolute against the page's address;
 * only http(s), never data: URLs.
 *
 * @param {string | null} raw
 * @param {URL} base
 * @returns {string | null}
 */
function resolveImageUrl(raw, base) {
  if (!raw) return null;
  const cleaned = decodeHtmlEntities(raw.trim());
  if (!cleaned || cleaned.startsWith('data:')) return null;
  try {
    const url = new URL(cleaned, base);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch (error) {
    return null;
  }
}

/**
 * The picture a page shares: og:image (or og:image:secure_url), else
 * twitter:image.
 *
 * @param {string} html
 * @param {URL} base the page's final address, after redirects
 * @returns {string | null}
 */
function pageImageFromHtml(html, base) {
  return resolveImageUrl(metaContent(html, 'property', 'og:image'), base)
    || resolveImageUrl(metaContent(html, 'property', 'og:image:secure_url'), base)
    || resolveImageUrl(metaContent(html, 'name', 'twitter:image') || metaContent(html, 'property', 'twitter:image'), base);
}

/**
 * The first public address a host name resolves to, or null when it has none
 * or any of them is not public (a name that also resolves inward is refused).
 *
 * @param {string} hostname
 * @returns {Promise<{address: string, family: number} | null>}
 */
async function publicAddressOf(hostname) {
  const bare = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(bare)) return isPublicAddress(bare) ? { address: bare, family: net.isIP(bare) } : null;
  let found;
  try {
    found = await dns.promises.lookup(bare, { all: true, verbatim: true });
  } catch (error) {
    return null;
  }
  if (found.length === 0 || !found.every(entry => isPublicAddress(entry.address))) return null;
  return found[0];
}

/**
 * Fetches a page (following a few redirects, each checked) and returns its
 * shared picture, or null for anything that goes wrong: not a page, too slow,
 * blocked, refused or no picture.
 *
 * @param {string} pageUrl as listed
 * @returns {Promise<string | null>}
 */
async function fetchPageImage(pageUrl) {
  let url = normalizePageUrl(pageUrl);
  const deadline = Date.now() + TIMEOUT_MS;
  for (let hop = 0; url && hop <= MAX_REDIRECTS; hop++) {
    const target = await publicAddressOf(url.hostname);
    if (!target || Date.now() >= deadline) return null;
    const answer = await getPage(url, target, deadline - Date.now());
    if (!answer) return null;
    if (answer.redirect) {
      url = normalizePageUrl(new URL(answer.redirect, url).toString());
      continue;
    }
    return pageImageFromHtml(answer.html, url);
  }
  return null;
}

/**
 * One GET to the checked address, reading at most MAX_BYTES of HTML.
 *
 * @param {URL} url
 * @param {{address: string, family: number}} target
 * @param {number} timeoutMs
 * @returns {Promise<{redirect?: string, html?: string} | null>}
 */
function getPage(url, target, timeoutMs) {
  return new Promise(resolve => {
    const client = url.protocol === 'https:' ? https : http;
    let settled = false;
    const done = (/** @type {any} */ value) => { if (!settled) { settled = true; resolve(value); } };
    const request = client.get(url, {
      // connect to the address that was checked; TLS still verifies the name
      lookup: (hostname, options, callback) => {
        if (options && options.all) callback(null, [{ address: target.address, family: target.family }]);
        else callback(null, target.address, target.family);
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SwrlList/2; +https://swrl-list.com)',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
        'Accept-Language': 'en-GB,en;q=0.9'
      },
      timeout: timeoutMs
    }, response => {
      const status = response.statusCode || 0;
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        return done({ redirect: response.headers.location });
      }
      const type = String(response.headers['content-type'] || '');
      if (status !== 200 || !/text\/html|application\/xhtml\+xml/i.test(type)) {
        response.resume();
        return done(null);
      }
      let received = 0;
      const chunks = [];
      response.on('data', chunk => {
        received += chunk.length;
        chunks.push(chunk);
        if (received >= MAX_BYTES) {
          request.destroy();
          done({ html: Buffer.concat(chunks).subarray(0, MAX_BYTES).toString('utf8') });
        }
      });
      response.on('end', () => done({ html: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', () => done(null));
    });
    request.on('timeout', () => { request.destroy(); done(null); });
    request.on('error', () => done(null));
  });
}

module.exports = { normalizePageUrl, isPublicAddress, metaContent, resolveImageUrl, pageImageFromHtml, fetchPageImage };
