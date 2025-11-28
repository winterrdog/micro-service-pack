FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json tsconfig*.json ./

RUN npm ci

COPY . ./
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

EXPOSE 3000

RUN chmod +x ./docker-entrypoint.sh

USER node

CMD [ "sh","./docker-entrypoint.sh" ]