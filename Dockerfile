FROM node:22-bookworm-slim

WORKDIR /app

RUN npm install -g npm@11
COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx tsx db/migrate.ts && npm start"]
