# Production Dockerfile for React frontend
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_OPTIONS=--max-old-space-size=2048

COPY package.json package-lock.json ./
# Harden npm networking to reduce DNS flakiness
RUN npm config set registry https://registry.npmjs.org/ \
	&& npm config set fetch-retries 5 \
	&& npm config set fetch-retry-factor 2 \
	&& npm config set fetch-retry-maxtimeout 60000 \
	&& npm config set fetch-timeout 60000 \
	&& npm ci --omit=optional --prefer-offline --no-audit --progress=false

COPY . .
RUN npx vite build --logLevel info

FROM nginx:1.28-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
