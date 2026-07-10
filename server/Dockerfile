FROM node:20-alpine

# Install build dependencies for native modules (e.g. sharp, bcrypt if compiling on alpine)
RUN apk add --no-run-cache python3 make g++ 

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

# Copy source code and config
COPY tsconfig.json ./
COPY src/ ./src/

# Development compiler to perform TS-build
RUN npm install -g typescript && tsc

# Set production env
ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "dist/index.js"]
