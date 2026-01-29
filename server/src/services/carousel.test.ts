import { describe, it, expect, afterEach } from 'vitest'
import { existsSync, unlinkSync, mkdirSync } from 'fs'
import { rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createStoryImage, generateCarouselZip, type CarouselStory } from './carousel.js'

const sampleStory: CarouselStory = {
  title: 'Major AI breakthrough in quantum computing research',
  category: 'AI & Technology',
  summary: 'Researchers have developed a new approach to quantum error correction that could accelerate the development of practical quantum computers.',
  publisher: 'Nature',
  date: '2024-06-15T00:00:00Z',
}

describe('createStoryImage', () => {
  it('returns a PNG buffer', () => {
    const buffer = createStoryImage(sampleStory)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
    // PNG magic bytes
    expect(buffer[0]).toBe(0x89)
    expect(buffer[1]).toBe(0x50) // P
    expect(buffer[2]).toBe(0x4e) // N
    expect(buffer[3]).toBe(0x47) // G
  })

  it('handles stories with no date', () => {
    const story = { ...sampleStory, date: null }
    const buffer = createStoryImage(story)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('handles stories with long titles', () => {
    const story = {
      ...sampleStory,
      title: 'This is a very long title that should be word-wrapped across multiple lines on the generated image to ensure readability',
    }
    const buffer = createStoryImage(story)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })
})

describe('generateCarouselZip', () => {
  const outputDir = join(tmpdir(), `test_carousel_${Date.now()}`)

  afterEach(async () => {
    // Clean up
    try {
      if (existsSync(outputDir)) await rm(outputDir, { recursive: true })
    } catch {
      // ignore cleanup errors
    }
  })

  it('generates a ZIP file', async () => {
    const stories: CarouselStory[] = [
      sampleStory,
      { ...sampleStory, title: 'Climate report shows progress', category: 'Planet & Climate' },
    ]

    const zipPath = await generateCarouselZip(stories, outputDir)
    expect(existsSync(zipPath)).toBe(true)
    expect(zipPath).toContain('carousel_images.zip')
  })

  it('handles a single story', async () => {
    const zipPath = await generateCarouselZip([sampleStory], outputDir)
    expect(existsSync(zipPath)).toBe(true)
  })
})
