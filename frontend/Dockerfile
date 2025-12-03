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
# Run vite directly from node_modules to avoid npx network call
RUN ./node_modules/.bin/vite build --logLevel info

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
