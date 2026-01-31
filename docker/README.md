# Docker Build-Anleitung

## SSL-Zertifikate (HTTPS)

Vor dem ersten Start mit HTTPS einmal Zertifikate erzeugen:

```bash
./docker/generate-certs.sh
# oder mit Servername/IP: SERVER_HOST=192.168.1.100 ./docker/generate-certs.sh
```

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