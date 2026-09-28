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

RUN pnpm build:frontend

FROM ${NODE_IMAGE} AS runtime

ENV BACKEND_ORIGIN=""
ENV BACKEND_AUTH_MODE=""
ENV BACKEND_AUTH_AUDIENCE=""
ENV FRONTEND_ALLOWED_ORIGINS=""
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

COPY --from=workspace --chown=node:node /workspace/apps/frontend/.next/standalone ./
COPY --from=workspace --chown=node:node /workspace/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=workspace --chown=node:node /workspace/apps/frontend/public ./apps/frontend/public

USER node

EXPOSE 8080

CMD ["node", "apps/frontend/server.js"]
