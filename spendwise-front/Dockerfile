# Stage 1 — build the React app
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_API_BASE is injected at build time via --build-arg so the
# compiled JS knows where to reach the backend. Defaults to a relative
# path that nginx then proxies to the backend container.
ARG VITE_API_BASE=/api/v1
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

# Stage 2 — serve with nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
