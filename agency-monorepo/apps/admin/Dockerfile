# Базовый образ
FROM node:20-alpine AS base
RUN npm i -g pnpm@9.15.0

# Этап установки зависимостей
FROM base AS deps
WORKDIR /app

# Копируем корневые манифесты
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/ ./packages/

# Устанавливаем все зависимости (включая внутренние пакеты)
RUN pnpm install --frozen-lockfile

# Этап сборки
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .

# Собираем админку
WORKDIR /app/apps/admin
RUN pnpm run build

# Финальный образ
FROM node:20-alpine AS runner
WORKDIR /app

# Копируем standalone (сервер и зависимости)
COPY --from=builder /app/apps/admin/.next/standalone ./

# Копируем статические файлы из .next/static в правильное место
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static

# Копируем public файлы
COPY --from=builder /app/apps/admin/public ./apps/admin/public

WORKDIR /app/apps/admin

EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]