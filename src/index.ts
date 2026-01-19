import Fastify from 'fastify'
import { RouteLoader } from './route-loader.js'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const isDev = process.env.NODE_ENV !== 'production'

const fastify = Fastify({
  logger: {
    level: isDev ? 'info' : 'warn',
    transport: isDev
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
})

const routeLoader = new RouteLoader(
  fastify,
  join(__dirname, 'routes'),
  isDev // 开发环境启用热加载
)

async function start() {
  try {
    await routeLoader.start()
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    console.log(`Server running at http://localhost:3000`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

async function shutdown() {
  await routeLoader.stop()
  await fastify.close()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

start()
