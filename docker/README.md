# Docker Build-Anleitung

## Backend
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t markjnt/palliroute-backend -f docker/backend.Dockerfile .
```

## Frontend
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t markjnt/palliroute-frontend -f docker/frontend.Dockerfile .
``` 