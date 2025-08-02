# <img src="public/favicon.ico" alt="PalliRoute Logo" width="32" height="32" style="vertical-align: middle;"> PalliRoute

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

**Erforderliche Umgebungsvariablen:**
- `SECRET_KEY`: Ein sicherer Schlüssel für die Flask-Anwendung
- `GOOGLE_MAPS_API_KEY`: Ihr Google Maps API-Schlüssel für Geocoding und Routenplanung
- `CORS_ORIGINS`: Erlaubte Ursprünge für CORS (Comma-separated)
- `XLSX_IMPORT_PATH`: Pfad zum Ordner mit den Excel-Dateien für den Import

**Hinweis zu XLSX_IMPORT_PATH:**
Der angegebene Pfad sollte folgende Unterordner enthalten:
- `Mitarbeiterliste/` - für Mitarbeiter-Excel-Dateien
- `Export_PalliDoc/` - für Patienten-Excel-Dateien

Die Anwendung wählt automatisch die neueste Excel-Datei aus dem jeweiligen Ordner aus.

```yaml
environment:
  - SECRET_KEY=your_secret_key_here
  - GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
  - CORS_ORIGINS=http://localhost:3000,http://your-local-ip:3000,http://localhost:3001,http://your-local-ip:3001
  - XLSX_IMPORT_PATH=/path/to/your/excel/files
```

### 3. Container starten

Starten Sie die Container mit Docker Compose:

```bash
docker-compose up -d
```

Die Anwendung ist anschließend unter folgenden URLs und der Host-IP erreichbar:
- Frontend-Web: `http://localhost:3000`
- Frontend-PWA: `http://localhost:3001`
- Backend: `http://localhost:9000`

Zum Stoppen der Container:
```bash
docker-compose down
```

## Lizenz

Dieses Projekt ist unter der MIT Lizenz veröffentlicht. Siehe [LICENSE](LICENSE) für Details.
