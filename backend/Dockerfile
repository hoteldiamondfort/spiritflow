FROM node:22-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install dependencies
WORKDIR /app/backend
RUN npm ci --omit=dev

# Copy backend source
COPY backend/src ./src
COPY backend/server.js .

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]