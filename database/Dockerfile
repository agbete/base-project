# ========================================
# Dockerfile for Database Migration Service
# ========================================

FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy migration files and scripts
COPY --chown=nodejs:nodejs migrations ./migrations
COPY --chown=nodejs:nodejs migrate.js ./
COPY --chown=nodejs:nodejs .env ./

# Switch to non-root user
USER nodejs

# Default command
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "migrate.js", "run"]

