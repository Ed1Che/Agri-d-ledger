FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml* yarn.lock* package-lock.json* ./
COPY packages/ ./packages/
COPY apps/iot/package.json ./apps/iot/
RUN npm install --workspace=apps/iot --omit=dev --ignore-scripts
COPY apps/iot ./apps/iot
WORKDIR /app/apps/iot
EXPOSE 3003
CMD ["node", "index.js"]
