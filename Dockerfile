FROM node:20-alpine AS webbuild
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache python3 make g++ wget
WORKDIR /app

# Install Litestream
RUN wget -q https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-linux-amd64-musl.tar.gz -O /tmp/litestream.tar.gz && \
    tar -xzf /tmp/litestream.tar.gz -C /usr/local/bin litestream && \
    rm /tmp/litestream.tar.gz

COPY server/package*.json ./server/
RUN npm --prefix server ci --omit=dev
COPY server/ ./server/
COPY --from=webbuild /app/web/dist ./web/dist
COPY web/public ./web/public
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

WORKDIR /app/server
ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000
CMD ["../start.sh"]
