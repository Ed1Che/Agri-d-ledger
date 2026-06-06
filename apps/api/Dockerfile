FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* yarn.lock* package-lock.json* ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
RUN npm install --workspace=apps/api --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
EXPOSE 3001
CMD ["node", "dist/index.js"]
