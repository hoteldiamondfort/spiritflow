FROM node:22-alpine

WORKDIR /app

# Copy all backend files
COPY . .

# Install dependencies
RUN npm ci --omit=dev

EXPOSE 3001

CMD ["npm", "start"]