# Production Dockerfile for React frontend
FROM node:20-alpine AS build

# Add Google DNS to fix EAI_AGAIN errors
RUN echo "nameserver 8.8.8.8" > /etc/resolv.conf && \
    echo "nameserver 8.8.4.4" >> /etc/resolv.conf

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_OPTIONS=--max-old-space-size=2048

COPY package.json package-lock.json ./
# Use npm ci with legacy peer deps to avoid conflicts
RUN npm config set registry https://registry.npmjs.org/ \
	&& npm config set fetch-retries 10 \
	&& npm config set fetch-retry-factor 3 \
	&& npm config set fetch-retry-maxtimeout 120000 \
	&& npm config set fetch-timeout 120000 \
	&& npm ci --legacy-peer-deps --prefer-offline \
	&& echo "=== Verifying vite installation ===" \
	&& ls -la node_modules/.bin/vite \
	&& node_modules/.bin/vite --version

COPY . .
# Ensure local binaries (like vite) are on PATH to avoid npx hitting registry
ENV PATH=/app/node_modules/.bin:$PATH
RUN npm run build

FROM nginx:1.28-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
