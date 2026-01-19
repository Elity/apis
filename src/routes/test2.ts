import type { FastifyRequest, FastifyReply } from 'fastify'

export const method = 'GET'

export async function handler(_req: FastifyRequest, _reply: FastifyReply) {
  return {
    status: 'ok',
    uptime: process.uptime(),
  }
}
