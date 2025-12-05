# Production Dockerfile for React frontend
FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL:-https://api.bessar.work/api}
ENV NODE_OPTIONS=--max-old-space-size=2048

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --loglevel verbose && \
    echo "=== npm ci completed ===" && \
    ls -la node_modules/.bin/ && \
    test -f node_modules/.bin/vite && echo "vite binary found" || (echo "ERROR: vite not found" && exit 1)

COPY . .
ENV PATH=/app/node_modules/.bin:$PATH
RUN VITE_API_URL=${VITE_API_URL} npm run build:clean

FROM nginx:1.28-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
