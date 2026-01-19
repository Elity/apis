import type { FastifyRequest, FastifyReply } from 'fastify'
import { redis } from '../../redis.js'

export const method = 'GET'

interface Params {
  key: string
}

export async function handler(
  req: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) {
  const { key } = req.params
  const cacheKey = `cache:${key}`

  try {
    const value = await redis.get(cacheKey)

    if (value === null) {
      return reply.status(404).send({ error: 'Key not found' })
    }

    return { key: cacheKey, value }
  } catch (err) {
    return reply.status(500).send({ error: 'Redis connection failed' })
  }
}
