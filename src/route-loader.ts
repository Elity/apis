import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  FastifySchema,
  HTTPMethods,
} from 'fastify'
import { watch, type FSWatcher } from 'chokidar'
import { readdir, stat } from 'node:fs/promises'
import { join, relative, parse } from 'node:path'
import { pathToFileURL } from 'node:url'

type RouteHandler = (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>

export interface RouteModule {
  method?: HTTPMethods | HTTPMethods[]
  handler: RouteHandler
  schema?: FastifySchema
}

interface RouteEntry {
  filePath: string
  urlPath: string
  method: HTTPMethods | HTTPMethods[]
  handler: RouteHandler
  schema?: FastifySchema
}

export class RouteLoader {
  private fastify: FastifyInstance
  private routesDir: string
  private watcher: FSWatcher | null = null
  private routes = new Map<string, RouteEntry>()
  private hotReload: boolean
  private registeredPaths = new Set<string>()

  constructor(fastify: FastifyInstance, routesDir: string, hotReload = false) {
    this.fastify = fastify
    this.routesDir = routesDir
    this.hotReload = hotReload
  }

  async start(): Promise<void> {
    await this.loadAllRoutes()
    this.registerRoutes()

    if (this.hotReload) {
      this.startWatching()
    }
  }

  async stop(): Promise<void> {
    await this.watcher?.close()
    this.watcher = null
  }

  private async loadAllRoutes(): Promise<void> {
    const files = await this.scanRouteFiles(this.routesDir)
    await Promise.all(files.map((f) => this.loadRouteFile(f)))
  }

  private async scanRouteFiles(dir: string): Promise<string[]> {
    const files: string[] = []

    try {
      const entries = await readdir(dir)
      for (const entry of entries) {
        const fullPath = join(dir, entry)
        const s = await stat(fullPath)

        if (s.isDirectory()) {
          files.push(...(await this.scanRouteFiles(fullPath)))
        } else if (this.isRouteFile(entry)) {
          files.push(fullPath)
        }
      }
    } catch {
      // Directory doesn't exist yet
    }

    return files
  }

  private isRouteFile(filename: string): boolean {
    return /\.(ts|js)$/.test(filename) && !filename.startsWith('_')
  }

  private filePathToUrlPath(filePath: string): string {
    const relativePath = relative(this.routesDir, filePath)
    const { dir, name } = parse(relativePath)

    const convertParam = (segment: string) =>
      segment.replace(/\[([^\]]+)\]/g, ':$1')

    let urlPath = dir ? `/${dir}` : ''

    if (name !== 'index') {
      urlPath += `/${name}`
    }

    if (urlPath === '') {
      urlPath = '/'
    }

    return convertParam(urlPath).replace(/\\/g, '/')
  }

  private async loadRouteFile(filePath: string): Promise<void> {
    const urlPath = this.filePathToUrlPath(filePath)

    try {
      const fileUrl = pathToFileURL(filePath).href
      const cacheBuster = `?t=${Date.now()}`
      const module = (await import(fileUrl + cacheBuster)) as RouteModule

      if (!module.handler) {
        this.fastify.log.warn(`Route file missing handler: ${filePath}`)
        return
      }

      const entry: RouteEntry = {
        filePath,
        urlPath,
        method: module.method ?? 'GET',
        handler: module.handler,
        schema: module.schema as FastifySchema | undefined,
      }

      this.routes.set(filePath, entry)
      this.fastify.log.info(`Loaded: ${filePath} -> ${entry.method} ${urlPath}`)
    } catch (err) {
      this.fastify.log.error(`Failed to load ${filePath}: ${err}`)
    }
  }

  private registerRoutes(): void {
    for (const [filePath, entry] of this.routes) {
      this.registerRoute(filePath, entry)
    }
  }

  private registerRoute(filePath: string, entry: RouteEntry): void {
    const methods = Array.isArray(entry.method) ? entry.method : [entry.method]

    for (const method of methods) {
      const routeKey = `${method}:${entry.urlPath}`

      if (this.registeredPaths.has(routeKey)) {
        continue
      }

      this.registeredPaths.add(routeKey)

      // 使用闭包捕获 filePath，handler 在运行时从 map 中获取
      // 这样热加载更新 map 后，下次请求就会使用新的 handler
      this.fastify.route({
        method,
        url: entry.urlPath,
        schema: entry.schema,
        handler: async (req, reply) => {
          const currentEntry = this.routes.get(filePath)
          if (!currentEntry) {
            return reply.status(404).send({ error: 'Route not found' })
          }
          return currentEntry.handler(req, reply)
        },
      })
    }
  }

  private startWatching(): void {
    this.watcher = watch(this.routesDir, {
      ignored: /(^|[\/\\])\._/,
      persistent: true,
      ignoreInitial: true,
    })

    this.watcher.on('add', (path: string) => this.handleFileAdd(path))
    this.watcher.on('change', (path: string) => this.handleFileChange(path))
    this.watcher.on('unlink', (path: string) => this.handleFileUnlink(path))

    this.fastify.log.info(`Watching routes: ${this.routesDir}`)
  }

  private handleFileAdd(filePath: string): void {
    if (!this.isRouteFile(filePath)) return
    // Fastify 不支持运行时注册新路由，提示用户重启
    this.fastify.log.warn(`New route file detected: ${filePath} (restart to apply)`)
  }

  private async handleFileChange(filePath: string): Promise<void> {
    if (!this.isRouteFile(filePath)) return

    try {
      await this.loadRouteFile(filePath)
      const entry = this.routes.get(filePath)
      if (entry) {
        this.fastify.log.info(`Route reloaded: ${entry.method} ${entry.urlPath}`)
      }
    } catch (err) {
      this.fastify.log.error(`Failed to reload route ${filePath}: ${err}`)
    }
  }

  private handleFileUnlink(filePath: string): void {
    if (!this.isRouteFile(filePath)) return

    const entry = this.routes.get(filePath)
    if (entry) {
      this.routes.delete(filePath)
      // 路由仍然注册着，但 handler 会返回 404
      this.fastify.log.info(`Route removed: ${entry.method} ${entry.urlPath}`)
    }
  }
}
