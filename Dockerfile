FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS builder
RUN npm ci
COPY . .
RUN npm run prisma:generate && npm run build

FROM base AS production
COPY --from=builder /app/dist  ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3001 9090
CMD ["node", "dist/server.js"]
