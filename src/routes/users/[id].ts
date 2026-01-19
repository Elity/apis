import type { FastifyRequest, FastifyReply } from 'fastify'

export const method = 'GET'

// 模拟数据
const users = new Map([
  [1, { id: 1, name: 'Alice' }],
  [2, { id: 2, name: 'Bob' }],
])

interface Params {
  id: string
}

export async function handler(
  req: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) {
  const id = parseInt(req.params.id, 10)
  const user = users.get(id)

  if (!user) {
    return reply.status(404).send({ error: 'User not found' })
  }

  return user
}
