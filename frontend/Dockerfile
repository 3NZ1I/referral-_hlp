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
# vite is installed as a package, find its main entry point
RUN ls -la node_modules/vite/ | head -20 || echo "No vite dir"
RUN cat node_modules/vite/package.json | grep -E '"main"|"bin"' || echo "No main/bin in package.json"
# Run vite via its package entry
RUN node node_modules/vite/dist/node/cli.js build --logLevel info

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
