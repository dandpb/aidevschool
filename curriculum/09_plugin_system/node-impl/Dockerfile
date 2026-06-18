FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json .eslintrc.json vitest.config.ts ./
COPY src ./src
COPY fixtures ./fixtures
RUN npm run lint && npm run test && npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY fixtures ./fixtures
EXPOSE 8081
CMD ["npm", "start"]
