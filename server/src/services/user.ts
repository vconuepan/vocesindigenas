import prisma from '../lib/prisma.js'
import { hashPassword } from './auth.js'
import type { UserRole } from '@prisma/client'

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
}

export async function createUser(data: {
  email: string
  name: string
  password: string
  role?: UserRole
}) {
  const passwordHash = await hashPassword(data.password)
  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      role: data.role || 'viewer',
    },
    select: userSelect,
  })
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: userSelect,
  })
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  })
}

export async function listUsers() {
  return prisma.user.findMany({
    select: userSelect,
    orderBy: { createdAt: 'asc' },
  })
}

export async function updateUser(id: string, data: { name?: string; role?: UserRole }) {
  return prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  })
}

export async function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } })
}
