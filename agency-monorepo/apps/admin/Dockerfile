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

# Копируем всё из deps (уже есть node_modules, packages, package.json для apps/admin)
COPY --from=deps /app .

# Копируем оставшиеся исходники (перезапишут файлы, но не затронут node_modules)
COPY . .

# Собираем админку
WORKDIR /app/apps/admin
RUN pnpm run build

# Собираем админку
WORKDIR /app/apps/admin
RUN pnpm run build

# Финальный образ
FROM node:20-alpine AS runner
WORKDIR /app

# Копируем всё необходимое (как у вас и было)
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public ./apps/admin/public

WORKDIR /app/apps/admin

# ВАЖНО: Не указываем PORT явно. Railway сам её подставит.
# Но мы указываем, на каком интерфейсе слушать.
ENV HOST=0.0.0.0
EXPOSE ${PORT:-3000}

# Команда запуска: берём порт из переменной окружения Railway.
CMD ["sh", "-c", "PORT=$PORT node server.js"]