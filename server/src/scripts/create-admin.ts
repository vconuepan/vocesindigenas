import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../services/auth.js'
import * as readline from 'readline'

const prisma = new PrismaClient()

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function main() {
  console.log('Create Admin User\n')

  const email = await prompt('Email: ')
  if (!email) {
    console.error('Email is required')
    process.exit(1)
  }

  const name = await prompt('Name: ')
  if (!name) {
    console.error('Name is required')
    process.exit(1)
  }

  const password = await prompt('Password (min 8 chars): ')
  if (password.length < 8) {
    console.error('Password must be at least 8 characters')
    process.exit(1)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.error(`User with email ${email} already exists`)
    process.exit(1)
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role: 'admin' },
  })

  console.log(`\nAdmin user created: ${user.email} (${user.id})`)
  await prisma.$disconnect()
}

main().catch(err => {
  console.error('Failed to create admin:', err)
  process.exit(1)
})
