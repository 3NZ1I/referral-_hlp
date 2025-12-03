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
# Check what's actually in the vite package
RUN ls -R node_modules/vite/ | head -50 || echo "No vite dir"
# Find all .js files in vite package
RUN find node_modules/vite -name "*.js" | head -20 || echo "No JS files"

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
