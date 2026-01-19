import type { FastifyRequest, FastifyReply } from 'fastify'

export const method = 'GET'

// 模拟数据
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
]

export async function handler(_req: FastifyRequest, _reply: FastifyReply) {
  return { users }
}
