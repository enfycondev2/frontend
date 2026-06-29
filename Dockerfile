FROM node:20-alpine

WORKDIR /app

# Install dependencies required for parsing libraries
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the application code
COPY . .

# Generate Prisma Client (Required for database interactions)
RUN npx prisma generate

# Environment variables should be passed via docker-compose
# Command to run the local daemon
CMD ["npm", "run", "scrape:local", "--", "--daemon"]
