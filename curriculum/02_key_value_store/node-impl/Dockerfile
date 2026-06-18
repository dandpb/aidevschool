FROM node:20-alpine AS builder
WORKDIR /src
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json vitest.config.ts .eslintrc.json ./
COPY src ./src
COPY tests ./tests
RUN npm test && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=builder /src/dist ./dist
EXPOSE 8081
CMD ["node", "dist/src/main.js"]
