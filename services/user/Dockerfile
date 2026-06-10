# Stage 1: Build TypeScript
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json tsconfig.json ./
RUN npm install
COPY src ./src
RUN npm run build

# Stage 2: Runtime Execution
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
# Install production packages only. (We need bcrypt, which builds native modules. Node alpine handles pre-built bin)
RUN npm install --only=production
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 5001
CMD ["node", "dist/index.js"]
