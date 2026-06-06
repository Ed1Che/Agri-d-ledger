FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml* yarn.lock* package-lock.json* ./
COPY packages/ ./packages/
COPY apps/ussd/package.json ./apps/ussd/
RUN npm install --workspace=apps/ussd --omit=dev --ignore-scripts
COPY apps/ussd ./apps/ussd
WORKDIR /app/apps/ussd
EXPOSE 3002
CMD ["node", "index.js"]
