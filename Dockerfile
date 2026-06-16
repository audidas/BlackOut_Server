# Stage 1 — builder
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9

# 의존성 캐시 최적화 — lockfile 먼저
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# 소스 복사 + 빌드
COPY . .
RUN pnpm run build


# Stage 2 — runner (prod 의존성만)
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000 3001

# 시작 시 마이그레이션 자동 적용(prisma migrate deploy) 후 앱 실행 — 미적용분만, 멱등
CMD ["pnpm", "run", "start:prod"]
