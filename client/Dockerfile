# Build context is the repository root (npm workspace root). See server/Dockerfile.
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci

COPY client ./client
RUN npm run build --workspace=client


FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
