FROM node:20-alpine

# Install build dependencies for native modules (e.g. sharp, bcrypt if compiling on alpine)
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

COPY server/package*.json ./

RUN npm ci --only=production && npm cache clean --force

# Copy source code and config
COPY server/tsconfig.json ./
COPY server/src/ ./src/

# Development compiler to perform TS-build
RUN npm install -g typescript@5.4.5 && tsc

# Set production env
ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "dist/index.js"]
