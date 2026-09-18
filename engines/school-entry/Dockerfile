FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npx playwright install --with-deps chromium && mkdir -p /data
COPY server ./server
COPY public ./public
COPY scripts ./scripts
RUN chown -R node:node /app /data /root/.cache/ms-playwright && mv /root/.cache/ms-playwright /app/.browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.browsers
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5185 DATA_DIR=/data
USER node
EXPOSE 5185
CMD ["node", "server/main.mjs"]
