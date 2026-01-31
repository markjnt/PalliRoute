# <img src="public/favicon.ico" alt="PalliRoute Logo" width="32" height="32" style="vertical-align: middle;"> PalliRoute

PalliRoute ist ein Projekt zur automatischen Optimierung von Fahrtrouten im Gesundheitswesen.

## Installation und Start

Die Installation und Ausführung von PalliRoute erfolgt in drei einfachen Schritten mit Docker Compose:

### 1. docker-compose.yml Datei herunterladen

Laden Sie die Beispieldatei [`docker-compose.example.yml`](docker-compose.example.yml) herunter und benennen Sie sie um:

```bash
cp docker-compose.example.yml docker-compose.yml
```

### 2. Docker Compose anpassen

Öffnen Sie die Datei `docker-compose.yml` und passen Sie die folgenden Konfigurationen an:

#### 2.1 Umgebungsvariablen

**Backend API (erforderlich):**
- `SECRET_KEY`: Ein sicherer Schlüssel für die Flask-Anwendung
- `GOOGLE_MAPS_API_KEY`: Ihr Google Maps API-Schlüssel für Geocoding und Routenplanung
- `CORS_ORIGINS`: Erlaubte Ursprünge für CORS (kommagetrennt; für HTTPS z.B. `https://ihr-server:3000,https://ihr-server:3001`, für lokale Entwicklung zusätzlich `http://localhost:3000,http://localhost:3001`)
- `APLANO_API_KEY`: API-Schlüssel für die Aplano-Integration

**Backend Scheduler (automatisch konfiguriert):**
- `AUTO_IMPORT_ENABLED`: Automatischer Import aktiviert (Standard: true)
- `AUTO_IMPORT_TIMES`: Feste Importzeiten im Format HH:MM, kommasepariert (z.B. `08:00,12:30,16:00`)
- `BACKEND_API_URL`: URL zum Backend API (Standard: http://backend-api:9000)

```yaml
# Backend-API
environment:
  - SECRET_KEY=your_secret_key_here
  - GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
  - CORS_ORIGINS=https://ihr-server:3000,https://ihr-server:3001,http://localhost:3000,http://localhost:3001
  - APLANO_API_KEY=your-aplano-api-key-here

# Backend Scheduler (automatisch konfiguriert)
environment:
  - AUTO_IMPORT_ENABLED=true
  - AUTO_IMPORT_TIMES=08:00,12:30,16:00
  - BACKEND_API_URL=http://backend-api:9000
```

#### 2.2 Excel-Import konfigurieren

Die Excel-Dateien werden über Docker Volumes gemountet. In der `docker-compose.yml` sind bereits folgende Volumes konfiguriert:

```yaml
# Backend API (alle Volumes)
volumes:
  - ./backend/data:/backend/data
  - /path/to/xlsx/Mitarbeiterliste:/backend/data/excel_import/Mitarbeiterliste
  - /path/to/xlsx/Export_PalliDoc:/backend/data/excel_import/Export_PalliDoc

# Backend Scheduler (nur Excel-Import)
volumes:
  - /path/to/xlsx/Export_PalliDoc:/scheduler/data/excel_import/Export_PalliDoc
```

**Wichtig:** Ersetzen Sie die Pfade `/path/to/xlsx/Mitarbeiterliste` und `/path/to/xlsx/Export_PalliDoc` mit den tatsächlichen Pfaden zu Ihren Excel-Dateien auf dem Host-System.

**Ordnerstruktur:**
In den jeweiligen gemounteten Ordnern sollten sich die entsprechenden Excel-Dateien befinden:
- `Mitarbeiterliste/` - hier die Mitarbeiterliste-Excel-Dateien ablegen
- `Export_PalliDoc/` - hier die PalliDoc-Export-Listen-Excel-Dateien ablegen

Die Anwendung wählt automatisch die neueste Excel-Datei aus dem jeweiligen Ordner aus.

### 3. SSL-Zertifikate (HTTPS, interne Anwendung)

Für HTTPS (z.B. Zugriff über VPN) müssen einmalig selbstsignierte Zertifikate erzeugt werden:

```bash
# Im Projekt-Root; SERVER_HOST = Hostname oder IP, über die die Anwendung erreichbar ist
SERVER_HOST=192.168.1.100 ./docker/generate-certs.sh
# oder nur localhost:
./docker/generate-certs.sh
```

Die Zertifikate liegen danach in `docker/certs/`. Die Frontend-Container mounten diesen Ordner.

### 4. Container starten

Starten Sie die Container mit Docker Compose:

```bash
docker-compose up -d
```

#### 4.1 Zugriff auf die Anwendung

Die Anwendung ist anschließend unter folgenden URLs erreichbar (HTTPS, selbstsigniertes Zertifikat – Browser-Warnung einmal bestätigen):
- **Frontend-Web**: `https://localhost:3000` bzw. `https://ihr-server:3000`
- **Frontend-PWA**: `https://localhost:3001` bzw. `https://ihr-server:3001`
- **Backend-API**: nur intern; API-Zugriff erfolgt über die Frontends unter `/api`.

#### 4.2 Container verwalten

Zum Stoppen der Container:
```bash
docker-compose down
```

## Lizenz

Dieses Projekt ist urheberrechtlich geschützt. Alle Rechte vorbehalten. Siehe [LICENSE](LICENSE) für Details.
