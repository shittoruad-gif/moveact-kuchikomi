FROM node:20 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim AS production
WORKDIR /app

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

EXPOSE 3001
ENV NODE_ENV=production
CMD ["npx", "tsx", "server/index.ts"]
