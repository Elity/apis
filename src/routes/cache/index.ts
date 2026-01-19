import type { FastifyRequest, FastifyReply } from 'fastify'
import { redis } from '../../redis.js'

export const method = 'GET'

export async function handler(_req: FastifyRequest, reply: FastifyReply) {
  try {
    const keys = await redis.keys('cache:*')
    const result: Record<string, string | null> = {}

    for (const key of keys) {
      result[key] = await redis.get(key)
    }

    return { keys: result }
  } catch (err) {
    return reply.status(500).send({ error: 'Redis connection failed' })
  }
}
