# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:24.20.0-bookworm-slim

FROM ${NODE_IMAGE} AS workspace

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

WORKDIR /workspace

RUN corepack enable \
  && corepack prepare pnpm@11.24.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN --mount=type=cache,id=screenpilot-pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile

COPY . .

RUN pnpm build:backend \
  && pnpm --filter @screenpilot/backend deploy --prod --legacy /runtime/backend

FROM ${NODE_IMAGE} AS runtime

ENV APP_ENV=production
ENV NODE_ENV=production
ENV PAID_DEMO_ENABLED=false
ENV PORT=8080
ENV PROVIDER_MODE=live

WORKDIR /app

COPY --from=workspace --chown=node:node /runtime/backend ./

USER node

EXPOSE 8080

CMD ["node", "--enable-source-maps", "dist/server.js"]

