import type { FastifyRequest, FastifyReply } from 'fastify'
import { redis } from '../../redis.js'

export const method = 'DELETE'

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
    const deleted = await redis.del(cacheKey)

    if (deleted === 0) {
      return reply.status(404).send({ error: 'Key not found' })
    }

    return { deleted: cacheKey }
  } catch (err) {
    return reply.status(500).send({ error: 'Redis connection failed' })
  }
}
