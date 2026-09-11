/**
 * dsh-image-studio — Node half.
 *
 * Owns the one thing the browser half cannot reach on this line: the
 * image-generation upstream call (server-side fetch of an OpenAI-compatible
 * or Volcano Ark images endpoint).
 *
 * The generation config (API style, base URLs, key, model, size) lives in the
 * harness user-settings document as the `image-studio` namespace: the Host
 * half registers the namespace schema through the `settings` service, the
 * browser half edits it through the settings plugin card, and this file reads
 * the resolved value at generate time. The API key is declared with
 * `role('secret')`, so settings wire surfaces never echo it back.
 *
 * The route reaches the page as an authenticated `connection.fetch` route —
 * the same plugin-route mechanism the shipped session-log-export plugin uses
 * for its ZIP download. The browser half is `lib/client.js` (module-table
 * bundle, no build step).
 *
 * Routes:
 *
 *   POST /api/image-studio/generate   { mode, prompt, imageDataUris?[] }
 *                                     → { ok: true, images: [{ b64, mime }] }
 *                                     → { ok: true, demo: true }   (no key configured)
 *                                     → { ok: false, error }
 *
 * The upstream baseUrl comes from the caller's own settings, so the plugin
 * talks exactly to the endpoint its user configured and nothing else. The API
 * key is stored in the user-settings document in plain text — same trust
 * model as the deployment's `.env`.
 *
 * Migration: a config left by the pre-settings build at
 * `~/.dsh/imgstudio/config.json` is merged into the namespace's user layer
 * once, then renamed to `config.json.migrated` so the import runs exactly
 * once and can never overwrite later UI edits.
 */

import { promises as fsp } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import Schema from '@deepseek-ai/schemastery'

export const name = 'image-studio'

export const inject = ['connection', 'settings']

const API_ROOT = '/api/image-studio'
const GENERATE_ROUTE = API_ROOT + '/generate'

/** Upstream call ceiling: image generation is slow, downloads are not. */
const GENERATE_TIMEOUT_MS = 280_000
const DOWNLOAD_TIMEOUT_MS = 120_000

/** Hard cap on reference images per request (mirrors the browser half). */
const MAX_REFERENCE_IMAGES = 4

/** Legacy pre-settings config file, imported once then renamed. */
const LEGACY_CONFIG_PATH = path.join(os.homedir(), '.dsh', 'imgstudio', 'config.json')

/** Config values are small strings; clamp anything read from the legacy file. */
const FIELD_LIMITS = { dialect: 20, url: 500, apiKey: 500, model: 200, size: 40 }

const CONFIG_SCHEMA = Schema.object({
  dialect: Schema.union(['openai', 'ark']).default('openai'),
  baseUrlOpenAI: Schema.string().default('https://api.openai.com/v1'),
  baseUrlArk: Schema.string().default('https://ark.cn-beijing.volces.com/api/v3'),
  apiKey: Schema.string().role('secret').default(''),
  model: Schema.string().default('gpt-image-1'),
  size: Schema.union(['1024x1024', '1536x1024', '1024x1536', 'auto']).default('1024x1024'),
})

/** Whitelist + clamp one config object read from the legacy file. */
function sanitizeLegacyConfig(value) {
  if (value === null || typeof value !== 'object') return null
  const out = {}
  if (value.dialect === 'openai' || value.dialect === 'ark') out.dialect = value.dialect
  if (typeof value.baseUrlOpenAI === 'string') out.baseUrlOpenAI = value.baseUrlOpenAI.slice(0, FIELD_LIMITS.url)
  if (typeof value.baseUrlArk === 'string') out.baseUrlArk = value.baseUrlArk.slice(0, FIELD_LIMITS.url)
  if (typeof value.apiKey === 'string') out.apiKey = value.apiKey.slice(0, FIELD_LIMITS.apiKey)
  if (typeof value.model === 'string') out.model = value.model.slice(0, FIELD_LIMITS.model)
  if (typeof value.size === 'string') out.size = value.size.slice(0, FIELD_LIMITS.size)
  return Object.keys(out).length > 0 ? out : null
}

/**
 * Import the pre-settings `~/.dsh/imgstudio/config.json` into the namespace's
 * user layer once. The rename is the once-guard: after it the import can
 * never run again, let alone overwrite edits made through the settings UI.
 */
async function migrateLegacyConfig(scope, logger) {
  let text
  try {
    text = await fsp.readFile(LEGACY_CONFIG_PATH, 'utf8')
  } catch {
    return // Missing file: nothing to migrate (the common case).
  }
  const clean = sanitizeLegacyConfig(JSON.parse(text))
  if (clean === null) {
    logger?.warn?.('[dsh-image-studio] legacy config had no usable fields; left in place')
    return
  }
  try {
    await scope.update(clean)
    await fsp.rename(LEGACY_CONFIG_PATH, LEGACY_CONFIG_PATH + '.migrated')
    logger?.info?.('[dsh-image-studio] imported legacy config into the image-studio settings namespace')
  } catch (error) {
    // Keep the file so the next boot can retry the import.
    logger?.warn?.('[dsh-image-studio] legacy config import failed; file kept:', error?.message || error)
  }
}

/** Decode one `data:` URI into { mime, bytes }. Throws when the shape is wrong. */
function dataUriToBytes(uri) {
  const comma = String(uri).indexOf(',')
  const head = String(uri).slice(0, comma)
  if (!head.startsWith('data:')) throw new Error('bad data uri')
  const mime = head.slice(5, head.indexOf(';')) || 'image/png'
  const buffer = Buffer.from(String(uri).slice(comma + 1), 'base64')
  if (buffer.length === 0) throw new Error('empty data uri')
  return { mime, buffer }
}

/**
 * Call one images endpoint. `dialect` selects the request shape:
 *
 *  - `ark` (and any JSON multi-reference API): POST <base>/images/generations
 *    with `image` as a data-URI array for img2img.
 *  - `openai`: txt2img posts JSON to <base>/images/generations; img2img posts a
 *    multipart body to <base>/images/edits with one `image` file field per
 *    reference (`image[]` when there are several).
 *
 * Responses are accepted as `data[].b64_json` or `data[].url` (urls are
 * downloaded and inlined as base64 so the browser needs no third-party origin).
 */
async function callUpstream(args) {
  const base = String(args.baseUrl || '').replace(/\/+$/, '')
  if (!/^https:\/\//.test(base + '/')) throw new Error('baseUrl must be an https URL')
  const uris = Array.isArray(args.imageDataUris)
    ? args.imageDataUris.filter((u) => typeof u === 'string' && u.startsWith('data:')).slice(0, MAX_REFERENCE_IMAGES)
    : []
  if (args.mode === 'img2img' && uris.length === 0) throw new Error('no source images provided')

  const isMultipart = args.mode === 'img2img' && args.dialect === 'openai'
  const url = base + (isMultipart ? '/images/edits' : '/images/generations')
  const auth = { Authorization: 'Bearer ' + String(args.apiKey || '') }
  const signal = AbortSignal.timeout(GENERATE_TIMEOUT_MS)
  let response

  if (isMultipart) {
    const form = new FormData()
    form.set('model', String(args.model || ''))
    form.set('prompt', String(args.prompt || ''))
    if (args.size && args.size !== 'auto') form.set('size', String(args.size))
    uris.forEach((uri, index) => {
      const part = dataUriToBytes(uri)
      form.append(filesFieldName(uris.length), new Blob([part.buffer], { type: part.mime }),
        'input' + index + (part.mime === 'image/jpeg' ? '.jpg' : '.png'))
    })
    response = await fetch(url, { method: 'POST', headers: auth, body: form, signal })
  } else {
    const body = { model: args.model, prompt: args.prompt, n: 1 }
    if (args.size && args.size !== 'auto') body.size = args.size
    else if (args.dialect === 'openai') body.size = 'auto'
    if (args.mode === 'img2img') body.image = uris
    if (args.dialect === 'ark') body.response_format = 'b64_json'
    response = await fetch(url, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  }

  const text = await response.text()
  if (!response.ok) {
    // Prefer the upstream error body over the bare status: it is the message
    // the user can act on (quota, model name, content policy).
    let upstream = text.slice(0, 400)
    try {
      const parsed = JSON.parse(text)
      if (parsed && parsed.error) upstream = parsed.error.message || JSON.stringify(parsed.error)
    } catch { /* non-JSON error body: keep the raw excerpt */ }
    throw new Error('HTTP ' + response.status + (upstream ? ': ' + upstream : ''))
  }
  const parsed = JSON.parse(text)
  if (parsed.error) throw new Error(parsed.error.message || JSON.stringify(parsed.error))

  const items = Array.isArray(parsed.data) ? parsed.data : []
  const images = []
  for (const item of items.slice(0, MAX_REFERENCE_IMAGES)) {
    if (item && typeof item.b64_json === 'string' && item.b64_json.length > 0) {
      images.push({ b64: item.b64_json, mime: 'image/png' })
    } else if (item && typeof item.url === 'string' && item.url.length > 0) {
      const download = await fetch(item.url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
      if (!download.ok) throw new Error('downloading the result image failed: HTTP ' + download.status)
      const buffer = Buffer.from(await download.arrayBuffer())
      const fromUrl = /\.jpe?g(?:\?|$)/i.test(item.url) ? 'image/jpeg' : 'image/png'
      const mime = (download.headers.get('content-type') || fromUrl).split(';')[0] || fromUrl
      images.push({ b64: buffer.toString('base64'), mime })
    }
  }
  if (images.length === 0) throw new Error('the upstream response contained no images')
  return images
}

/** OpenAI edits take repeated `image` fields; several references use `image[]`. */
function filesFieldName(count) {
  return count > 1 ? 'image[]' : 'image'
}

/**
 * Activate the plugin row: register the `image-studio` settings namespace and
 * the authenticated generate route.
 * @param ctx - cordis host context (injects `connection` and `settings`).
 */
export function apply(ctx) {
  const logger = ctx.logger
  const connection = ctx.get('connection')
  const settings = ctx.get('settings')
  if (!connection || !connection.fetch || typeof connection.fetch.register !== 'function') {
    logger?.warn?.('[dsh-image-studio] connection service unavailable — API routes not registered')
    return
  }
  if (!settings || typeof settings.register !== 'function') {
    logger?.warn?.('[dsh-image-studio] settings service unavailable — config namespace not registered')
    return
  }

  const scope = settings.register('image-studio', CONFIG_SCHEMA)
  void migrateLegacyConfig(scope, logger)

  const handleGenerate = async (request) => {
    let payload
    try {
      payload = await request.json()
    } catch {
      return fail(400, 'expected a JSON body')
    }
    if (!payload || typeof payload.prompt !== 'string') return fail(400, 'a prompt is required')
    // The config never crosses the wire from the browser: the Host reads the
    // namespace itself, so the key lives only in the settings document.
    const cfg = scope.get()
    if (!cfg || !cfg.apiKey) return json(200, { ok: true, demo: true })
    try {
      const images = await callUpstream({
        mode: payload.mode,
        prompt: payload.prompt,
        imageDataUris: payload.imageDataUris,
        dialect: cfg.dialect,
        baseUrl: cfg.dialect === 'ark' ? cfg.baseUrlArk : cfg.baseUrlOpenAI,
        apiKey: cfg.apiKey,
        model: cfg.model,
        size: cfg.size,
      })
      return json(200, { ok: true, images })
    } catch (error) {
      const message = error && error.name === 'TimeoutError'
        ? 'the upstream call timed out'
        : (error && error.message) || String(error)
      return json(200, { ok: false, error: message })
    }
  }

  ctx.effect(() => {
    const disposer = connection.fetch.register({
      path: GENERATE_ROUTE,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: handleGenerate,
    })
    return () => {
      try {
        Promise.resolve(disposer()).catch(() => {})
      } catch { /* already gone */ }
    }
  }, 'image-studio: api routes')
  logger?.debug?.('[dsh-image-studio] node half active (generate route + image-studio settings namespace)')
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function fail(status, message) {
  return json(status, { ok: false, error: message })
}
