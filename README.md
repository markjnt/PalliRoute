# <img src="frontend/public/logo512.png" alt="PalliRoute Logo" width="32" height="32" style="vertical-align: middle;"> PalliRoute

PalliRoute ist ein Projekt zur automatischen Optimierung von Fahrtrouten im Gesundheitswesen.

## Installation und Start

Die Installation und Ausführung von PalliRoute erfolgt in drei einfachen Schritten mit Docker Compose:

### 1. docker-compose.yml Datei herunterladen

Laden Sie die Beispieldatei [`docker-compose.example.yml`](docker-compose.example.yml) herunter und benennen Sie sie um:

```bash
cp docker-compose.example.yml docker-compose.yml
```

### 2. Umgebungsvariablen anpassen

Öffnen Sie die Datei `docker-compose.yml` und passen Sie die folgenden Umgebungsvariablen an:

```yaml
environment:
  - SECRET_KEY=your_secret_key_here
  - GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
  - CORS_ORIGINS=http://localhost:3000,http://your-local-ip:3000
```

### 3. Container starten

Starten Sie die Container mit Docker Compose:

```bash
docker-compose up -d
```

Die Anwendung ist anschließend unter folgenden URLs erreichbar:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:9000`

Zum Stoppen der Container:
```bash
docker-compose down
```

## Lizenz

Dieses Projekt ist unter der MIT Lizenz veröffentlicht. Siehe [LICENSE](LICENSE) für Details.