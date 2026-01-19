FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 复制核心源码（routes 通过 volume 挂载）
COPY src/index.ts src/route-loader.ts src/redis.ts ./src/
COPY src/routes/health.ts ./src/routes/
COPY tsconfig.json ./

# 创建挂载点
RUN mkdir -p /app/src/routes /app/storages

EXPOSE 3000

# 开发模式：tsx watch 支持热加载
CMD ["pnpm", "dev"]
