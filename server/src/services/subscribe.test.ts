import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockPrisma = {
  pendingSubscription: {
    findFirst: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
}

const mockBrevo = {
  createContact: vi.fn(),
  sendTransactional: vi.fn(),
  verifyEmail: vi.fn(),
  listContacts: vi.fn(),
}

vi.mock('../lib/prisma.js', () => ({ default: mockPrisma }))
vi.mock('./brevo.js', () => mockBrevo)

const { subscribe, EmailValidationError, cleanupExpiredPendingSubscriptions, reconcileUnsubscribedFromBrevo } = await import('./subscribe.js')

describe('subscribe service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.pendingSubscription.findFirst.mockResolvedValue(null)
    mockPrisma.pendingSubscription.create.mockResolvedValue({ id: '1' })
    mockPrisma.pendingSubscription.deleteMany.mockResolvedValue({ count: 0 })
    mockBrevo.createContact.mockResolvedValue({ id: 'contact-1' })
    mockBrevo.sendTransactional.mockResolvedValue(undefined)
    mockBrevo.verifyEmail.mockResolvedValue({ valid: true, domainExists: true, isDisposable: false })
    mockBrevo.listContacts.mockResolvedValue({ items: [], nextCursor: null, hasMore: false, total: 0 })
  })

  describe('email verification', () => {
    it('calls verifyEmail before creating contact', async () => {
      const callOrder: string[] = []
      mockBrevo.verifyEmail.mockImplementation(async () => {
        callOrder.push('verify')
        return { valid: true, domainExists: true, isDisposable: false }
      })
      mockBrevo.createContact.mockImplementation(async () => {
        callOrder.push('createContact')
        return { id: 'contact-1' }
      })

      await subscribe({ email: 'test@example.com' })

      expect(callOrder).toEqual(['verify', 'createContact'])
    })

    it('throws EmailValidationError when email is invalid', async () => {
      mockBrevo.verifyEmail.mockResolvedValue({ valid: false, domainExists: true, isDisposable: false })

      await expect(subscribe({ email: 'bad@example.com' })).rejects.toThrow(EmailValidationError)
    })

    it('throws EmailValidationError when domain does not exist', async () => {
      mockBrevo.verifyEmail.mockResolvedValue({ valid: true, domainExists: false, isDisposable: false })

      await expect(subscribe({ email: 'user@nodomain.fake' })).rejects.toThrow(EmailValidationError)
    })

    it('throws EmailValidationError for disposable emails', async () => {
      mockBrevo.verifyEmail.mockResolvedValue({ valid: true, domainExists: true, isDisposable: true })

      await expect(subscribe({ email: 'temp@mailinator.com' })).rejects.toThrow(EmailValidationError)
    })

    it('includes user-facing message in EmailValidationError', async () => {
      mockBrevo.verifyEmail.mockResolvedValue({ valid: false, domainExists: true, isDisposable: false })

      try {
        await subscribe({ email: 'bad@example.com' })
        expect.fail('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(EmailValidationError)
        expect((err as InstanceType<typeof EmailValidationError>).message).toBeTruthy()
      }
    })

    it('skips verification gracefully if Brevo verify API fails', async () => {
      mockBrevo.verifyEmail.mockRejectedValue(new Error('Brevo API down'))

      // Should not throw — graceful degradation
      await subscribe({ email: 'test@example.com' })

      expect(mockBrevo.createContact).toHaveBeenCalled()
    })
  })

  describe('firstName parameter', () => {
    it('passes firstName to createContact data', async () => {
      await subscribe({ email: 'test@example.com', firstName: 'John' })

      expect(mockBrevo.createContact).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ NOMBRE: 'John' }),
        }),
      )
    })

    it('works without firstName', async () => {
      await subscribe({ email: 'test@example.com' })

      expect(mockBrevo.createContact).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          subscribed: false,
        }),
      )
    })

    it('personalizes confirmation email when firstName provided', async () => {
      await subscribe({ email: 'test@example.com', firstName: 'Jane' })

      const emailBody = mockBrevo.sendTransactional.mock.calls[0][0].body
      expect(emailBody).toContain('Jane')
    })

    it('does not include a name in greeting when firstName not provided', async () => {
      await subscribe({ email: 'test@example.com' })

      const emailBody = mockBrevo.sendTransactional.mock.calls[0][0].body
      expect(emailBody).not.toContain('Jane')
    })
  })

  describe('existing subscription', () => {
    it('returns early if already confirmed', async () => {
      mockPrisma.pendingSubscription.findFirst.mockResolvedValue({ confirmedAt: new Date() })

      await subscribe({ email: 'existing@example.com' })

      expect(mockBrevo.verifyEmail).not.toHaveBeenCalled()
      expect(mockBrevo.createContact).not.toHaveBeenCalled()
    })
  })

  describe('re-subscribe (unconfirmed)', () => {
    it('deletes existing unconfirmed entries before creating new one', async () => {
      mockPrisma.pendingSubscription.deleteMany.mockResolvedValue({ count: 1 })

      await subscribe({ email: 'retry@example.com' })

      expect(mockPrisma.pendingSubscription.deleteMany).toHaveBeenCalledWith({
        where: { email: 'retry@example.com', confirmedAt: null },
      })
      expect(mockPrisma.pendingSubscription.create).toHaveBeenCalled()
    })

    it('deletes unconfirmed entries after email verification', async () => {
      const callOrder: string[] = []
      mockBrevo.verifyEmail.mockImplementation(async () => {
        callOrder.push('verify')
        return { valid: true, domainExists: true, isDisposable: false }
      })
      mockPrisma.pendingSubscription.deleteMany.mockImplementation(async () => {
        callOrder.push('deleteMany')
        return { count: 0 }
      })

      await subscribe({ email: 'test@example.com' })

      expect(callOrder).toEqual(['verify', 'deleteMany'])
    })

    it('does not delete confirmed entries', async () => {
      await subscribe({ email: 'test@example.com' })

      expect(mockPrisma.pendingSubscription.deleteMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ confirmedAt: null }),
      })
    })

    it('skips re-subscribe cleanup when already confirmed', async () => {
      mockPrisma.pendingSubscription.findFirst.mockResolvedValue({ confirmedAt: new Date() })

      await subscribe({ email: 'confirmed@example.com' })

      expect(mockPrisma.pendingSubscription.deleteMany).not.toHaveBeenCalled()
    })
  })

  describe('cleanupExpiredPendingSubscriptions (retention — Ley 21.719)', () => {
    it('deletes only unconfirmed pending subscriptions whose token expired', async () => {
      mockPrisma.pendingSubscription.deleteMany.mockResolvedValue({ count: 3 })

      const count = await cleanupExpiredPendingSubscriptions()

      expect(count).toBe(3)
      expect(mockPrisma.pendingSubscription.deleteMany).toHaveBeenCalledWith({
        where: { confirmedAt: null, expiresAt: { lt: expect.any(Date) } },
      })
    })
  })
  describe('reconcileUnsubscribedFromBrevo (la baja del boletin)', () => {
    /**
     * La Politica promete borrar la fila «tras la baja», pero el enlace del pie
     * de la campaña es el merge tag de Brevo: da de baja alla y no toca esta
     * base. Esto lo reconcilia. Lo que se prueba aqui es sobre todo CUANDO NO
     * debe borrar: un borrado de mas aqui elimina suscriptores vivos.
     */

    const contacto = (email: string, subscribed: boolean) => ({
      id: email, email, subscribed, data: {}, createdAt: '', updatedAt: '',
    })

    it('borra las filas confirmadas de quienes se dieron de baja en Brevo', async () => {
      mockBrevo.listContacts.mockResolvedValue({
        items: [contacto('baja@example.com', false), contacto('activo@example.com', true)],
        nextCursor: null, hasMore: false, total: 2,
      })
      mockPrisma.pendingSubscription.deleteMany.mockResolvedValue({ count: 1 })

      const r = await reconcileUnsubscribedFromBrevo()

      expect(r.borrados).toBe(1)
      expect(r.omitidoPorSalvaguarda).toBe(false)
      // Solo el dado de baja, y solo filas CONFIRMADAS: las no confirmadas son
      // asunto del otro barrido y borrarlas aqui pisaria un opt-in en curso.
      expect(mockPrisma.pendingSubscription.deleteMany).toHaveBeenCalledWith({
        where: { email: { in: ['baja@example.com'] }, confirmedAt: { not: null } },
      })
    })

    it('normaliza el correo a minusculas antes de comparar', async () => {
      mockBrevo.listContacts.mockResolvedValue({
        items: [contacto('Baja@Example.COM', false)],
        nextCursor: null, hasMore: false, total: 1,
      })
      await reconcileUnsubscribedFromBrevo()
      expect(mockPrisma.pendingSubscription.deleteMany).toHaveBeenCalledWith({
        where: { email: { in: ['baja@example.com'] }, confirmedAt: { not: null } },
      })
    })

    it('recorre todas las paginas antes de borrar', async () => {
      mockBrevo.listContacts
        .mockResolvedValueOnce({ items: [contacto('uno@example.com', false)], nextCursor: '50', hasMore: true, total: 2 })
        .mockResolvedValueOnce({ items: [contacto('dos@example.com', false)], nextCursor: null, hasMore: false, total: 2 })
      mockPrisma.pendingSubscription.deleteMany.mockResolvedValue({ count: 2 })

      const r = await reconcileUnsubscribedFromBrevo()

      expect(mockBrevo.listContacts).toHaveBeenCalledTimes(2)
      expect(mockBrevo.listContacts).toHaveBeenNthCalledWith(2, '50')
      expect(r.revisados).toBe(2)
      expect(mockPrisma.pendingSubscription.deleteMany).toHaveBeenCalledWith({
        where: { email: { in: ['uno@example.com', 'dos@example.com'] }, confirmedAt: { not: null } },
      })
    })

    it('NO borra nada si el listado falla a mitad de camino', async () => {
      // Media lista leida es peor que ninguna: los contactos no leidos se verian
      // como «no dados de baja», pero los leidos si borrarian. Un fallo de red
      // no puede traducirse en un borrado parcial.
      mockBrevo.listContacts
        .mockResolvedValueOnce({ items: [contacto('uno@example.com', false)], nextCursor: '50', hasMore: true, total: 2 })
        .mockRejectedValueOnce(new Error('brevo caido'))

      const r = await reconcileUnsubscribedFromBrevo()

      expect(r.borrados).toBe(0)
      expect(r.omitidoPorSalvaguarda).toBe(true)
      expect(mockPrisma.pendingSubscription.deleteMany).not.toHaveBeenCalled()
    })

    it('NO borra nada si el recorrido se corta por el tope de paginas', async () => {
      // Un `hasMore` que nunca baja dejaria el recorrido incompleto; tampoco ahi
      // se borra.
      mockBrevo.listContacts.mockResolvedValue({
        items: [contacto('uno@example.com', false)], nextCursor: '50', hasMore: true, total: 99999,
      })

      const r = await reconcileUnsubscribedFromBrevo()

      expect(r.borrados).toBe(0)
      expect(r.omitidoPorSalvaguarda).toBe(true)
      expect(mockPrisma.pendingSubscription.deleteMany).not.toHaveBeenCalled()
    })

    it('no toca la base cuando nadie se dio de baja', async () => {
      mockBrevo.listContacts.mockResolvedValue({
        items: [contacto('activo@example.com', true)], nextCursor: null, hasMore: false, total: 1,
      })

      const r = await reconcileUnsubscribedFromBrevo()

      expect(r.borrados).toBe(0)
      expect(r.omitidoPorSalvaguarda).toBe(false)
      expect(mockPrisma.pendingSubscription.deleteMany).not.toHaveBeenCalled()
    })
  })
})
