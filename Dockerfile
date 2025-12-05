# ============================================
# PromptVault - Multi-stage Docker Build
# Includes: Web UI + API Server
# ============================================

# ----- Stage 1: Build Web UI -----
FROM node:20-alpine AS build-web

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the web application
RUN npm run build

# ----- Stage 2: Build API Server -----
FROM node:20-alpine AS build-api

WORKDIR /app/server

# Copy server package files
COPY server/package.json ./

# Install dependencies
RUN npm install

# Copy server source
COPY server/ .

# Build the server
RUN npm run build

# ----- Stage 3: Production Image -----
FROM node:20-alpine AS production

WORKDIR /app

# Install nginx and supervisor
RUN apk add --no-cache nginx supervisor

# Copy built web UI
COPY --from=build-web /app/dist /usr/share/nginx/html

# Copy API server
COPY --from=build-api /app/server/dist /app/api/dist
COPY --from=build-api /app/server/node_modules /app/api/node_modules
COPY --from=build-api /app/server/package.json /app/api/

# Create data directory for SQLite
RUN mkdir -p /app/data

# Copy nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy supervisor config
COPY supervisord.conf /etc/supervisord.conf

# Expose ports
EXPOSE 2528 2529

# Set environment variables
ENV PROMPTVAULT_DB_PATH=/app/data/promptvault.db
ENV PORT=2529

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
