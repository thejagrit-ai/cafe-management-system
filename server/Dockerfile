# Build context is the repository root so that the npm workspace root
# (package.json, package-lock.json, tsconfig.json) is available. server/tsconfig.json
# extends ../tsconfig.json, which is outside a ./server-only context.
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first so this layer is cached across source changes.
COPY package.json package-lock.json tsconfig.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci

COPY server ./server
RUN npm run db:generate --workspace=server \
 && npm run build --workspace=server

# Drop dev dependencies for the runtime image.
RUN npm prune --omit=dev


FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Run as the unprivileged user that the node image already provides.
RUN chown -R node:node /app
USER node

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/server/package.json ./server/package.json
COPY --from=builder --chown=node:node /app/server/dist ./server/dist
COPY --from=builder --chown=node:node /app/server/prisma ./server/prisma

EXPOSE 3001

# `prisma migrate deploy` applies committed migrations before the API accepts
# traffic; it is a no-op when the schema is already current.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=server/prisma/schema.prisma && node server/dist/index.js"]
