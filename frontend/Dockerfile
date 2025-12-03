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
# Debug: list what's actually in node_modules/.bin
RUN ls -la ./node_modules/.bin/ || echo "No .bin directory"
RUN find ./node_modules -name "*vite*" -o -name "*rolldown*" | head -20
# Run vite build with PATH set to include node_modules/.bin
RUN PATH="$PATH:./node_modules/.bin" npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
