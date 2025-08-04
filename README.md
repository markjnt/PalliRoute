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

**Erforderliche Umgebungsvariablen:**
- `SECRET_KEY`: Ein sicherer Schlüssel für die Flask-Anwendung
- `GOOGLE_MAPS_API_KEY`: Ihr Google Maps API-Schlüssel für Geocoding und Routenplanung
- `CORS_ORIGINS`: Erlaubte Ursprünge für CORS (Comma-separated)

```yaml
environment:
  - SECRET_KEY=your_secret_key_here
  - GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
  - CORS_ORIGINS=http://localhost:3000,http://your-local-ip:3000,http://localhost:3001,http://your-local-ip:3001
```

#### 2.2 Excel-Import konfigurieren

Die Excel-Dateien werden über Docker Volumes gemountet. In der `docker-compose.yml` sind bereits folgende Volumes konfiguriert:

```yaml
volumes:
  - ./backend/data:/backend/data
  - /path/to/xlsx/Mitarbeiterliste:/backend/data/excel_import/Mitarbeiterliste
  - /path/to/xlsx/Export_PalliDoc:/backend/data/excel_import/Export_PalliDoc
```

**Wichtig:** Ersetzen Sie die Pfade `/path/to/xlsx/Mitarbeiterliste` und `/path/to/xlsx/Export_PalliDoc` mit den tatsächlichen Pfaden zu Ihren Excel-Dateien auf dem Host-System.

**Ordnerstruktur:**
In den jeweiligen gemounteten Ordnern sollten sich die entsprechenden Excel-Dateien befinden:
- `Mitarbeiterliste/` - hier die Mitarbeiterliste-Excel-Dateien ablegen
- `Export_PalliDoc/` - hier die PalliDoc-Export-Listen-Excel-Dateien ablegen

Die Anwendung wählt automatisch die neueste Excel-Datei aus dem jeweiligen Ordner aus.

### 3. Container starten

Starten Sie die Container mit Docker Compose:

```bash
docker-compose up -d
```

#### 3.1 Zugriff auf die Anwendung

Die Anwendung ist anschließend unter folgenden URLs erreichbar:
- **Frontend-Web**: `http://localhost:3000`
- **Frontend-PWA**: `http://localhost:3001`
- **Backend**: `http://localhost:9000`

#### 3.2 Container verwalten

Zum Stoppen der Container:
```bash
docker-compose down
```

## Lizenz

Dieses Projekt ist unter der MIT Lizenz veröffentlicht. Siehe [LICENSE](LICENSE) für Details.
