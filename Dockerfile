FROM node:20-alpine AS webbuild
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN npm --prefix server ci --omit=dev
COPY server/ ./server/
COPY --from=webbuild /app/web/dist ./web/dist
COPY web/public ./web/public
WORKDIR /app/server
ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000
CMD ["node", "index.js"]
