# Docker Build-Anleitung

## Backend API
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t markjnt/palliroute-backend-api --target main -f docker/backend.Dockerfile --push .
```

## Backend Scheduler
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t markjnt/palliroute-backend-scheduler --target scheduler-image -f docker/backend.Dockerfile --push .
```

## Frontend-Web
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t markjnt/palliroute-frontend-web -f docker/frontend_web.Dockerfile --push .
``` 

## Frontend-PWA
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t markjnt/palliroute-frontend-pwa -f docker/frontend_pwa.Dockerfile --push .
``` 