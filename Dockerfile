FROM node:22-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/generate-env-js.sh /docker-entrypoint.d/10-generate-env-js.sh
RUN chmod +x /docker-entrypoint.d/10-generate-env-js.sh
EXPOSE 80
