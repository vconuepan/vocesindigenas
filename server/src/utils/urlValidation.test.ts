import { describe, it, expect } from 'vitest'
import { isAllowedUrl } from './urlValidation.js'

describe('isAllowedUrl', () => {
  it('allows standard HTTPS URLs', () => {
    expect(isAllowedUrl('https://example.com/article')).toBe(true)
    expect(isAllowedUrl('https://news.ycombinator.com/item?id=123')).toBe(true)
    expect(isAllowedUrl('https://www.bbc.co.uk/news/article')).toBe(true)
  })

  it('allows standard HTTP URLs', () => {
    expect(isAllowedUrl('http://example.com/article')).toBe(true)
  })

  it('blocks non-HTTP protocols', () => {
    expect(isAllowedUrl('ftp://example.com/file')).toBe(false)
    expect(isAllowedUrl('file:///etc/passwd')).toBe(false)
    expect(isAllowedUrl('javascript:alert(1)')).toBe(false)
  })

  it('blocks localhost', () => {
    expect(isAllowedUrl('http://localhost/admin')).toBe(false)
    expect(isAllowedUrl('http://localhost:3000/api')).toBe(false)
    expect(isAllowedUrl('http://LOCALHOST/admin')).toBe(false)
  })

  it('blocks loopback addresses', () => {
    expect(isAllowedUrl('http://127.0.0.1/admin')).toBe(false)
    expect(isAllowedUrl('http://127.0.0.1:8080/api')).toBe(false)
    expect(isAllowedUrl('http://[::1]/admin')).toBe(false)
  })

  it('blocks private network ranges (10.x.x.x)', () => {
    expect(isAllowedUrl('http://10.0.0.1/internal')).toBe(false)
    expect(isAllowedUrl('http://10.255.255.255/internal')).toBe(false)
  })

  it('blocks private network ranges (172.16-31.x.x)', () => {
    expect(isAllowedUrl('http://172.16.0.1/internal')).toBe(false)
    expect(isAllowedUrl('http://172.31.255.255/internal')).toBe(false)
  })

  it('blocks private network ranges (192.168.x.x)', () => {
    expect(isAllowedUrl('http://192.168.0.1/internal')).toBe(false)
    expect(isAllowedUrl('http://192.168.1.100/internal')).toBe(false)
  })

  it('blocks link-local / cloud metadata (169.254.x.x)', () => {
    expect(isAllowedUrl('http://169.254.169.254/latest/meta-data')).toBe(false)
    expect(isAllowedUrl('http://169.254.0.1/metadata')).toBe(false)
  })

  it('blocks 0.0.0.0', () => {
    expect(isAllowedUrl('http://0.0.0.0/')).toBe(false)
  })

  it('blocks IPv6 private addresses', () => {
    expect(isAllowedUrl('http://[fc00::1]/')).toBe(false)
    expect(isAllowedUrl('http://[fe80::1]/')).toBe(false)
  })

  it('blocks .internal and .local domains', () => {
    expect(isAllowedUrl('http://service.internal/api')).toBe(false)
    expect(isAllowedUrl('http://printer.local/status')).toBe(false)
  })

  it('returns false for invalid URLs', () => {
    expect(isAllowedUrl('not-a-url')).toBe(false)
    expect(isAllowedUrl('')).toBe(false)
  })
})
