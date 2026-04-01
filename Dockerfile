FROM node:20 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim AS production
WORKDIR /app

# Install build tools for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the Vite-built frontend
COPY --from=build /app/dist ./dist

# Copy the server source (runs via tsx at runtime)
COPY server ./server
COPY shared ./shared
COPY tsconfig.json tsconfig.node.json ./

# tsx is needed at runtime to execute TypeScript server
RUN npm install tsx

# Create persistent data directory for SQLite
RUN mkdir -p /data

EXPOSE 3001
ENV NODE_ENV=production
ENV DB_DIR=/data
CMD ["npx", "tsx", "server/index.ts"]
