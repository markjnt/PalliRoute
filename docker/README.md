# Docker Build-Anleitung

## Backend
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t markjnt/palliroute-backend -f docker/backend.Dockerfile .
```

## Frontend-Web
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t markjnt/palliroute-frontend-web -f docker/frontend_web.Dockerfile .
``` 