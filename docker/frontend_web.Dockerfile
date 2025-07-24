FROM node:22.13.1-alpine AS build

WORKDIR /frontend_web

# Copy package.json and package-lock.json first for better layer caching
COPY frontend_web/package.json frontend_web/package-lock.json ./
RUN npm ci

# Copy the frontend code
COPY frontend_web/ ./

# Build the app
RUN npm run build

# Kopiere public ins Build-Output
COPY public/ ./dist/

# Production stage
FROM nginx:alpine

RUN apk update && apk upgrade

# Copy the build output from the previous stage
COPY --from=build /frontend_web/dist /usr/share/nginx/html

# Copy custom nginx config
COPY docker/nginx_web.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"] 