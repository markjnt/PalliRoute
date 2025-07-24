FROM node:22.13.1-alpine AS build

WORKDIR /frontend_pwa

# Copy package.json and package-lock.json first for better layer caching
COPY frontend_pwa/package.json frontend_pwa/package-lock.json ./
RUN npm ci

# Copy the frontend code
COPY frontend_pwa/ ./

# Build the app
RUN npm run build

# Kopiere manifest.json ins Build-Output
COPY public/manifest.json ./dist/manifest.json

# Production stage
FROM nginx:alpine

RUN apk update && apk upgrade

# Copy the build output from the previous stage
COPY --from=build /frontend_pwa/dist /usr/share/nginx/html

# Copy custom nginx config
COPY docker/nginx_pwa.conf /etc/nginx/conf.d/default.conf

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"] 