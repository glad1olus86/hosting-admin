FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy" npx prisma generate
COPY . .
RUN chmod +x docker-entrypoint.sh
RUN DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy" npm run build
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
