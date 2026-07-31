FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

FROM node:22-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend ./
COPY --from=frontend-build /app/frontend/dist ./public

FROM node:22-alpine
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_FILE=/app/data/financeiro.sqlite
ENV BACKUP_DIR=/app/backups
WORKDIR /app/backend
RUN mkdir -p /app/data /app/backups
COPY --from=backend-build /app/backend ./
EXPOSE 3000
VOLUME ["/app/data", "/app/backups"]
CMD ["npm", "start"]
