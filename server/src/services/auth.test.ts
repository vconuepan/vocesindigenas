import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  refreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  $disconnect: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({ default: mockPrisma }))

const originalEnv = process.env.JWT_SECRET

beforeEach(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests'
  vi.clearAllMocks()
})

afterEach(() => {
  if (originalEnv !== undefined) {
    process.env.JWT_SECRET = originalEnv
  } else {
    delete process.env.JWT_SECRET
  }
})

const {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} = await import('./auth.js')

describe('hashPassword / verifyPassword', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('mypassword123')
    expect(hash).not.toBe('mypassword123')
    expect(hash).toMatch(/^\$2[aby]?\$/)
    expect(await verifyPassword('mypassword123', hash)).toBe(true)
  })

  it('rejects wrong password', async () => {
    const hash = await hashPassword('correct-password')
    expect(await verifyPassword('wrong-password', hash)).toBe(false)
  })
})

describe('generateAccessToken / verifyAccessToken', () => {
  it('generates and verifies a JWT', () => {
    const token = generateAccessToken({ id: 'user-1', email: 'a@b.com', role: 'admin' })
    expect(typeof token).toBe('string')

    const payload = verifyAccessToken(token)
    expect(payload.userId).toBe('user-1')
    expect(payload.email).toBe('a@b.com')
    expect(payload.role).toBe('admin')
  })

  it('throws for invalid token', () => {
    expect(() => verifyAccessToken('not.a.valid.token')).toThrow()
  })

  it('throws when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET
    expect(() =>
      generateAccessToken({ id: 'user-1', email: 'a@b.com', role: 'admin' })
    ).toThrow('JWT_SECRET')
  })
})

describe('generateRefreshToken', () => {
  it('creates a refresh token in the database', async () => {
    mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1', token: 'abc' })

    const token = await generateRefreshToken('user-1')
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(20)
    expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        token: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    })
  })
})

describe('rotateRefreshToken', () => {
  it('rotates token and returns new pair', async () => {
    const user = { id: 'user-1', email: 'a@b.com', role: 'admin' }
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      token: 'old-token',
      userId: 'user-1',
      user,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    })
    mockPrisma.refreshToken.delete.mockResolvedValue({})
    mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-2', token: 'new-token' })

    const result = await rotateRefreshToken('old-token')
    expect(result.accessToken).toBeDefined()
    expect(result.refreshToken).toBeDefined()
    expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } })
  })

  it('throws for invalid token', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue(null)
    await expect(rotateRefreshToken('bad-token')).rejects.toThrow('Invalid refresh token')
  })

  it('throws for expired token and deletes it', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      token: 'expired-token',
      userId: 'user-1',
      user: { id: 'user-1', email: 'a@b.com', role: 'admin' },
      expiresAt: new Date(Date.now() - 1000),
    })
    mockPrisma.refreshToken.delete.mockResolvedValue({})

    await expect(rotateRefreshToken('expired-token')).rejects.toThrow('Refresh token expired')
    expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } })
  })
})

describe('revokeRefreshToken', () => {
  it('deletes the token', async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 })
    await revokeRefreshToken('some-token')
    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { token: 'some-token' } })
  })
})

describe('revokeAllUserTokens', () => {
  it('deletes all tokens for user', async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 })
    await revokeAllUserTokens('user-1')
    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
  })
})
