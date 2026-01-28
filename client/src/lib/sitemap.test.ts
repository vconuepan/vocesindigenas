import { describe, it, expect } from 'vitest'
import { generateSitemapXml } from './sitemap'
import type { RouteConfig } from '../routes'

const BASE_URL = 'https://example.com'

describe('generateSitemapXml', () => {
  describe('XML structure', () => {
    it('includes correct XML declaration', () => {
      const result = generateSitemapXml([], BASE_URL)
      expect(result).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/)
    })

    it('includes urlset root element with correct xmlns', () => {
      const result = generateSitemapXml([], BASE_URL)
      expect(result).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    })

    it('closes the urlset tag', () => {
      const result = generateSitemapXml([], BASE_URL)
      expect(result).toContain('</urlset>')
    })

    it('produces valid structure with empty routes', () => {
      const result = generateSitemapXml([], BASE_URL)
      expect(result).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

</urlset>
`)
    })
  })

  describe('URL generation', () => {
    const singleRoute: RouteConfig[] = [{ path: '/about', priority: 0.8, changefreq: 'monthly' }]

    it('generates url element for each route', () => {
      const result = generateSitemapXml(singleRoute, BASE_URL)
      expect(result).toContain('<url>')
      expect(result).toContain('</url>')
    })

    it('combines baseUrl and path in loc element', () => {
      const result = generateSitemapXml(singleRoute, BASE_URL)
      expect(result).toContain(`<loc>${BASE_URL}/about</loc>`)
    })

    it('includes changefreq from route config', () => {
      const result = generateSitemapXml(singleRoute, BASE_URL)
      expect(result).toContain('<changefreq>monthly</changefreq>')
    })

    it('includes priority from route config', () => {
      const result = generateSitemapXml(singleRoute, BASE_URL)
      expect(result).toContain('<priority>0.8</priority>')
    })
  })

  describe('route handling', () => {
    it('includes all provided routes', () => {
      const routes: RouteConfig[] = [
        { path: '/', priority: 1.0, changefreq: 'daily' },
        { path: '/about', priority: 0.8, changefreq: 'monthly' },
        { path: '/contact', priority: 0.6, changefreq: 'yearly' },
      ]
      const result = generateSitemapXml(routes, BASE_URL)

      expect(result).toContain('<loc>https://example.com/</loc>')
      expect(result).toContain('<loc>https://example.com/about</loc>')
      expect(result).toContain('<loc>https://example.com/contact</loc>')
    })

    it('maintains route order', () => {
      const routes: RouteConfig[] = [
        { path: '/first', priority: 0.5, changefreq: 'monthly' },
        { path: '/second', priority: 0.5, changefreq: 'monthly' },
        { path: '/third', priority: 0.5, changefreq: 'monthly' },
      ]
      const result = generateSitemapXml(routes, BASE_URL)

      const firstIndex = result.indexOf('/first')
      const secondIndex = result.indexOf('/second')
      const thirdIndex = result.indexOf('/third')

      expect(firstIndex).toBeLessThan(secondIndex)
      expect(secondIndex).toBeLessThan(thirdIndex)
    })

    it('handles root path correctly', () => {
      const routes: RouteConfig[] = [{ path: '/', priority: 1.0, changefreq: 'daily' }]
      const result = generateSitemapXml(routes, BASE_URL)
      expect(result).toContain('<loc>https://example.com/</loc>')
    })
  })

  describe('priority formatting', () => {
    it('formats priority 1.0 as "1.0"', () => {
      const routes: RouteConfig[] = [{ path: '/', priority: 1.0, changefreq: 'daily' }]
      const result = generateSitemapXml(routes, BASE_URL)
      expect(result).toContain('<priority>1.0</priority>')
    })

    it('formats priority 0 as "0.0"', () => {
      const routes: RouteConfig[] = [{ path: '/low', priority: 0, changefreq: 'yearly' }]
      const result = generateSitemapXml(routes, BASE_URL)
      expect(result).toContain('<priority>0.0</priority>')
    })

    it('formats priority with single decimal place', () => {
      const routes: RouteConfig[] = [{ path: '/test', priority: 0.75, changefreq: 'monthly' }]
      const result = generateSitemapXml(routes, BASE_URL)
      expect(result).toContain('<priority>0.8</priority>')
    })
  })

  describe('changefreq values', () => {
    const changefreqs = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'] as const

    changefreqs.forEach((freq) => {
      it(`handles changefreq "${freq}"`, () => {
        const routes: RouteConfig[] = [{ path: '/test', priority: 0.5, changefreq: freq }]
        const result = generateSitemapXml(routes, BASE_URL)
        expect(result).toContain(`<changefreq>${freq}</changefreq>`)
      })
    })
  })
})
