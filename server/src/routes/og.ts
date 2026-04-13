import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { createLogger } from '../lib/logger.js'

const router = Router()
const log = createLogger('og-proxy')

const SITE_URL = 'https://impactoindigena.news'
const FALLBACK_IMAGE = `${SITE_URL}/images/og-image.png`

const BOT_UA = /bot|crawler|spider|crawling|facebookexternalhit|linkedinbot|twitterbot|slackbot|telegrambot|whatsapp|discordbot|curl|wget|python|java\/|go-http/i

function isBotRequest(req: import('express').Request): boolean {
  return BOT_UA.test(req.headers['user-agent'] || '')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// URLs in og:image content= must NOT have & encoded as &amp; —
// LinkedIn and many OG parsers use the raw attribute value as a URL
// without HTML-decoding it, so &amp; breaks the request.
// Only escape " and < > which could break the attribute context.
function escapeAttrUrl(url: string): string {
  return url.replace(/"/g, '%22').replace(/</g, '%3C').replace(/>/g, '%3E')
}

router.get('/stories/:slug', async (req, res) => {
  const { slug } = req.params

  try {
    const story = await prisma.story.findUnique({
      where: { slug },
      select: {
        slug: true,
        title: true,
        titleLabel: true,
        summary: true,
        imageUrl: true,
        datePublished: true,
      },
    })

    if (!story) {
      res.redirect(302, `${SITE_URL}/stories/${slug}`)
      return
    }

    // Regular browsers get a fast HTTP redirect to the React app.
    // Only serve OG HTML to crawlers (LinkedIn, Twitter, etc.).
    // If _r=1 is already present the Render route still hits this proxy —
    // break the loop by falling through and serving the shell (React loads fine).
    const storyUrl = `${SITE_URL}/stories/${story.slug}`
    const isRetry = req.query._r === '1'
    if (!isBotRequest(req) && !isRetry) {
      res.redirect(302, `${storyUrl}?_r=1`)
      return
    }

    const title = escapeHtml(story.title || story.slug || '')
    const titleLabel = story.titleLabel ? escapeHtml(story.titleLabel) : null
    const fullTitle = titleLabel ? `${titleLabel}: ${title}` : title
    const description = escapeHtml(story.summary?.slice(0, 200) || fullTitle)
    const image = escapeAttrUrl(story.imageUrl || FALLBACK_IMAGE)
    const url = storyUrl

    // Fetch the frontend shell to preserve React scripts
    let shell = ''
    try {
      const res2 = await fetch(`${SITE_URL}/`)
      shell = await res2.text()
    } catch {
      log.warn({ slug }, 'could not fetch frontend shell, using minimal HTML')
    }

    let html: string

    if (shell) {
      // Inject story OG tags right after <head> — LinkedIn uses first occurrence
      const ogTags = `
  <title>${fullTitle} - Impacto Indígena</title>
  <meta property="og:title" content="${fullTitle}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Impacto Indígena" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${fullTitle}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />`

      // Strip pre-existing title and OG/twitter tags from the shell so we don't
      // end up with two sets of meta tags. LinkedIn (and other parsers) get confused
      // by duplicate og:image tags even when the correct one appears first.
      const cleanShell = shell
        .replace(/<title>[^<]*<\/title>/gi, '')
        .replace(/<meta[^>]+(property=["']og:[^"']*["']|name=["']twitter:[^"']*["'])[^>]*\/?>/gi, '')

      // Inject story OG tags right after <head> and clear prerendered root content
      // (avoids React hydration mismatch when shell was prerendered as homepage)
      html = cleanShell
        .replace('<head>', `<head>${ogTags}`)
        .replace(/<div id="root">[\s\S]*?<\/div>(?=\s*<script)/, '<div id="root"></div>')
    } else {
      // Minimal fallback HTML
      html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${fullTitle} - Impacto Indígena</title>
  <meta property="og:title" content="${fullTitle}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Impacto Indígena" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${image}" />
  <meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body><script>window.location.replace('${url}')</script></body>
</html>`
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    // Override helmet's restrictive CSP — this page is served to browsers via
    // Render rewrite from impactoindigena.news, so the React app needs to
    // connect to the backend and load assets from impactoindigena.news.
    res.removeHeader('Content-Security-Policy')
    res.removeHeader('Cross-Origin-Resource-Policy')
    res.send(html)
  } catch (err) {
    log.error({ err, slug }, 'og proxy error')
    res.redirect(302, `${SITE_URL}/stories/${slug}`)
  }
})

export default router
