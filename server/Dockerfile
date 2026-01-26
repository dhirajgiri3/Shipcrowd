# Base stage
FROM node:20-alpine AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5005

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 5005

CMD ["node", "dist/index.js"]
