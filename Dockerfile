FROM node:20-alpine AS webbuild
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ wget ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install Litestream from .deb
RUN wget -q https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.deb -O /tmp/litestream.deb && \
    dpkg -i /tmp/litestream.deb && \
    rm /tmp/litestream.deb

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
