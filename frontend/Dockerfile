# Production Dockerfile for React frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Use npm install instead of ci for rolldown-vite compatibility
RUN npm install
COPY . ./
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_OPTIONS=--max-old-space-size=2048
# Create vite symlink manually if rolldown-vite doesn't create it
RUN if [ ! -f node_modules/.bin/vite ]; then \
      ln -s ../rolldown-vite/bin/vite.js node_modules/.bin/vite || \
      echo "Warning: Could not create vite symlink"; \
    fi
# Add node_modules/.bin to PATH and run build
ENV PATH="/app/node_modules/.bin:${PATH}"
RUN vite build --logLevel info || node node_modules/rolldown-vite/bin/vite.js build --logLevel info

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
