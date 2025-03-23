FROM node:22.13.1-alpine AS build

WORKDIR /frontend

# Copy package.json and package-lock.json first for better layer caching
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy the frontend code
COPY frontend/ ./

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

RUN apk update && apk upgrade

# Copy the build output from the previous stage
COPY --from=build /frontend/build /usr/share/nginx/html

# Copy custom nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"] 