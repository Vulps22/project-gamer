# Two-stage build on Node 22. One image runs both processes:
#   bot:    node dist/index.js
#   worker: node dist/worker.js
# Migrations run from it too: npm run db:migrate -- --prod

FROM node:22-alpine AS builder
ARG NODE_AUTH_TOKEN
WORKDIR /app
COPY package*.json .npmrc ./
COPY vendor ./vendor
RUN echo "//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}" >> .npmrc \
    && npm ci \
    && rm .npmrc
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY database ./database
USER node
CMD ["node", "dist/index.js"]
