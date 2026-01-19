import type { FastifyRequest, FastifyReply } from 'fastify'
import { redis } from '../../redis.js'

export const method = 'POST'

interface Params {
  key: string
}

interface Body {
  value: string
  ttl?: number
}

export async function handler(
  req: FastifyRequest<{ Params: Params; Body: Body }>,
  reply: FastifyReply
) {
  const { key } = req.params
  const { value, ttl } = req.body as Body
  const cacheKey = `cache:${key}`

  if (!value) {
    return reply.status(400).send({ error: 'value is required' })
  }

  try {
    if (ttl && ttl > 0) {
      await redis.set(cacheKey, value, 'EX', ttl)
    } else {
      await redis.set(cacheKey, value)
    }

    return { key: cacheKey, value, ttl: ttl ?? null }
  } catch (err) {
    return reply.status(500).send({ error: 'Redis connection failed' })
  }
}
