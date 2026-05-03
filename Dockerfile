# Use a Debian-based Node.js image to support Electron dependencies
FROM node:20

# Set working directory
WORKDIR /app

# Install system dependencies for Electron and SQLite
RUN apt-get update && apt-get install -y \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrender1 \
    libxtst6 \
    libcups2 \
    libxss1 \
    libnss3 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    libgbm1 \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Build the application
RUN npm run build

# Create non-root user for security (match existing script names but use standard debian group/user creation)
RUN groupadd -r nodejs && useradd -r -g nodejs nextjs

# Expose port (Backend server)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Use entrypoint script to handle permissions
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Default command starts the Electron app in production mode
CMD ["npm", "run", "electron:start"]
