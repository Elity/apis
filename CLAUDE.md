# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

基于 Fastify 的 API 服务后端，支持文件系统路由和开发环境热加载。

## Development Commands

```bash
pnpm install         # 安装依赖
pnpm dev             # 启动开发服务 (热加载)
pnpm build           # 构建生产版本
pnpm start           # 运行生产版本

# Docker
docker compose up    # 启动容器 (routes 和 storages 目录映射到宿主机)
```

## Architecture

```
src/
├── index.ts           # 服务入口
├── route-loader.ts    # 路由加载器 (热加载核心)
├── redis.ts           # Redis 客户端
└── routes/            # 路由文件目录 (Docker 挂载)
    ├── index.ts       # GET /
    ├── health.ts      # GET /health
    ├── users/
    │   ├── index.ts   # GET /users
    │   └── [id].ts    # GET /users/:id
    └── cache/         # Redis 缓存示例
        ├── index.ts       # GET /cache (列出所有缓存)
        ├── [key].ts       # GET /cache/:key (获取)
        ├── set/[key].ts   # POST /cache/set/:key (设置)
        └── del/[key].ts   # DELETE /cache/del/:key (删除)
storages/              # 存储目录 (Docker 挂载)
└── redis/             # Redis 持久化数据
```

## Route File Convention

每个路由文件导出:
- `method`: HTTP 方法，默认 `'GET'`
- `handler`: 请求处理函数
- `schema`: (可选) Fastify schema

文件路径映射规则:
- `routes/foo.ts` → `/foo`
- `routes/foo/index.ts` → `/foo`
- `routes/foo/[id].ts` → `/foo/:id`
- `_` 开头的文件会被忽略

## Hot Reload

开发环境 (`NODE_ENV !== 'production'`) 自动启用热加载:
- **修改**路由文件 → 下次请求自动使用新代码
- **新增/删除**路由文件 → 需重启生效（`tsx watch` 会自动重启）
- 加载错误不会导致服务崩溃

## Redis

Docker 环境通过 `REDIS_URL=redis://redis:6379` 连接 Redis。

持久化配置（混合模式）:
- AOF：每秒同步，保证数据安全
- RDB：定时快照，加快恢复速度
- 数据存储在 `storages/redis/`，重启自动恢复

使用示例:
```typescript
import { redis } from '../redis.js'

// 基本操作
await redis.set('key', 'value')
await redis.get('key')
await redis.del('key')

// 带过期时间 (秒)
await redis.set('key', 'value', 'EX', 60)
```
