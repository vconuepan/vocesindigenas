import { describe, it, expect } from 'vitest'
import { normalizeUrl } from './urlNormalization.js'

describe('normalizeUrl', () => {
  it('removes trailing slash', () => {
    expect(normalizeUrl('https://example.com/article/')).toBe('https://example.com/article')
  })

  it('keeps root path slash', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/')
  })

  it('removes utm tracking parameters', () => {
    expect(normalizeUrl('https://example.com/article?utm_source=rss&utm_medium=feed'))
      .toBe('https://example.com/article')
  })

  it('removes fbclid and gclid', () => {
    expect(normalizeUrl('https://example.com/article?fbclid=abc123'))
      .toBe('https://example.com/article')
    expect(normalizeUrl('https://example.com/article?gclid=xyz'))
      .toBe('https://example.com/article')
  })

  it('removes ref and source parameters', () => {
    expect(normalizeUrl('https://example.com/article?ref=homepage&source=twitter'))
      .toBe('https://example.com/article')
  })

  it('normalizes http to https', () => {
    expect(normalizeUrl('http://example.com/article')).toBe('https://example.com/article')
  })

  it('removes fragment', () => {
    expect(normalizeUrl('https://example.com/article#section')).toBe('https://example.com/article')
  })

  it('sorts remaining query parameters', () => {
    expect(normalizeUrl('https://example.com/article?z=1&a=2'))
      .toBe('https://example.com/article?a=2&z=1')
  })

  it('preserves meaningful query parameters', () => {
    expect(normalizeUrl('https://example.com/search?q=test&page=2'))
      .toBe('https://example.com/search?page=2&q=test')
  })

  it('removes tracking but keeps other params', () => {
    expect(normalizeUrl('https://example.com/article?id=123&utm_source=rss'))
      .toBe('https://example.com/article?id=123')
  })

  it('lowercases hostname', () => {
    expect(normalizeUrl('https://EXAMPLE.COM/Article')).toBe('https://example.com/Article')
  })

  it('preserves path case', () => {
    expect(normalizeUrl('https://example.com/Article')).toBe('https://example.com/Article')
  })

  it('removes default port', () => {
    expect(normalizeUrl('https://example.com:443/article')).toBe('https://example.com/article')
  })
})
