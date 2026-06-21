# Monorepo-aware build — context is the repo root (see docker-compose build.context).
FROM node:20-alpine AS build
WORKDIR /repo
COPY . .
RUN npm install --legacy-peer-deps
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/core

FROM node:20-alpine AS run
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo /repo
WORKDIR /repo/apps/core
CMD ["node", "dist/main"]
