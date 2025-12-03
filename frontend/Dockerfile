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
# Debug: find the actual vite/rolldown location
RUN find node_modules -type f -name "vite.js" -o -name "vite" | head -10 || echo "No vite found"
RUN ls -la node_modules/.bin/ | grep -i vite || echo "No vite in .bin"
# Try running via node with the package's main entry
RUN node -e "require('vite/dist/node/cli.js')" build --logLevel info || \
    node node_modules/vite/bin/vite.js build --logLevel info

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
