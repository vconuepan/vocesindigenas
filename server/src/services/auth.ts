import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import prisma from '../lib/prisma.js'

const BCRYPT_ROUNDS = 12
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface AccessTokenPayload {
  userId: string
  email: string
  role: string
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is not set')
  return secret
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export function generateAccessToken(user: { id: string; email: string; role: string }): string {
  const payload: AccessTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }
  return jwt.sign(payload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getJwtSecret()) as AccessTokenPayload
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(40).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS)

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  })

  return token
}

export async function rotateRefreshToken(
  oldToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const record = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
    include: { user: true },
  })

  if (!record) throw new Error('Invalid refresh token')
  if (record.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: record.id } })
    throw new Error('Refresh token expired')
  }

  // Delete old token (rotation)
  await prisma.refreshToken.delete({ where: { id: record.id } })

  // Generate new pair
  const accessToken = generateAccessToken(record.user)
  const refreshToken = await generateRefreshToken(record.user.id)

  return { accessToken, refreshToken }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } })
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } })
}
