FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json tsconfig.json eslint.config.js vitest.config.ts ./
COPY src ./src
COPY tests ./tests
RUN npm ci && npm run build && npm test

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 8080
ENTRYPOINT ["node", "dist/src/main.js"]
