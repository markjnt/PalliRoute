# Routenoptimierungs-App für den Pflegedienst

Diese App dient der Optimierung von Routen für Pflegedienste. Sie ermöglicht es, Mitarbeiter und Patienten zu verwalten, deren Arbeits- und Besuchszeiten zu planen, und optimierte Routen basierend auf den eingegebenen Informationen zu erstellen.

## Tech Stack
- **Frontend**: React (TypeScript) mit Material UI
- **Backend**: Flask API mit SQLite-Datenbank und SQLAlchemy
- **Kartenservice**: Google Maps API
- **Routenoptimierung**: Google Maps Routes API mit Service Account Authentifizierung
- **Datenimport**: Excel-Dateien (Mitarbeiter und Patienten)
- **Export**: PDF-Dateien zur Weitergabe optimierter Routen

---

## 1. Benutzerverwaltung

### Benutzerübersicht
Beim Öffnen der App wird zunächst eine Benutzer-Auswahl angezeigt:
- **Hinzufügen, Bearbeiten und Entfernen von Benutzern**: Jeder Benutzer hat nur einen **Namen** und eine **Rolle** zur Auswahl.
- **Wechseln des Benutzers**: Nach Auswahl des Benutzers gelangt man zum Hauptbildschirm (Google Maps).

### Benutzerwechsel
Oben links auf dem Hauptbildschirm wird der ausgewählte Benutzer angezeigt. Es besteht die Möglichkeit, den Benutzer zu wechseln.

---

## 2. Hauptbildschirm: Google Maps

### Kartenanzeige
Der Hauptbildschirm zeigt eine Google Maps Karte, auf der Patienten und Mitarbeiter visualisiert werden. Die Informationen auf der Karte ändern sich je nach ausgewähltem Wochentag und den eingetragenen Daten (Patientenbesuche, Touren).

### Patienten- und Mitarbeiterauswahl
Die Auswahl des Wochentages rechts in der Seitenleiste zeigt die zugehörigen **Patienten** und **Mitarbeiter** für diesen Tag.

---

## 3. Linke Seitenleiste: Mitarbeiterverwaltung

### Excel-Import von Mitarbeitern
- **Excel-Datei**: Die Mitarbeiterdaten können als Excel-Datei importiert werden. Die Datei enthält folgende Spalten:
  - Vorname
  - Nachname
  - Straße
  - PLZ
  - Ort
  - Funktion
  - Stellenumfang (z.B. 100 % = 7 Stunden Arbeit pro Tag)

### Mitarbeitertabelle
Nach dem Import werden die Mitarbeiter in einer Tabelle dargestellt. Funktionen:
- **Manuelles Hinzufügen oder Entfernen von Mitarbeitern**
- **Aktivieren/Deaktivieren von Mitarbeitern**

### Vollbildansicht der Seitenleiste
Die linke Seitenleiste kann fast auf die gesamte Seite erweitert werden, um eine bessere Übersicht der Mitarbeiterliste zu ermöglichen.

---

## 4. Rechte Seitenleiste: Patientenverwaltung und Routenübersicht

### Excel-Import von Patienten
- **Excel-Datei**: Die Patientendaten können ebenfalls als Excel-Datei importiert werden. Die Datei enthält folgende Spalten:
  - Vorname
  - Nachname
  - Straße
  - PLZ
  - Ort
  - Telefon
  - Telefon2
  - KW (Kalenderwoche)
  - Montag bis Freitag: Uhrzeit/Info (z.B. TK, HB, NA)
  - Tour Pflegekraft (welcher Mitarbeiter den Patienten besucht)

### Patiententabelle und Wochentagsauswahl
Die rechte Seitenleiste zeigt die Patientendaten und die zugehörigen Touren der Mitarbeiter für den ausgewählten Wochentag. Jede Änderung des Wochentages aktualisiert die Kartenansicht sowie die Daten.

### Tourenübersicht
Die rechte Seitenleiste zeigt eine Übersicht der Touren der verschiedenen Mitarbeiter. **Auch Mitarbeiter ohne Patienten** werden in dieser Übersicht dargestellt.

---

## 5. Optimierung der Touren

### Zuordnung von Patienten zu Mitarbeitern
- **Kartenansicht**: Patienten können durch Drag-and-Drop auf der Karte einem Mitarbeiter zugeordnet werden.
- **Seitenleiste**: Alternativ kann die Zuordnung auch in der rechten Seitenleiste vorgenommen werden.

### Optimierung der Touren
Die Touren der Mitarbeiter können individuell optimiert werden. Dabei werden folgende Zeitvorgaben berücksichtigt:
- **Stellenumfang**: 100 % = 7 Stunden Arbeitszeit pro Tag
- **Zeiten für Besuche**:
  - HB (Hausbesuch): 25 Minuten
  - NA (Nachtbesuch): 120 Minuten
  - **Telefonkontakte** werden bei der Routenplanung nicht berücksichtigt.

### Google Maps Routes API Integration
Die Routenoptimierung erfolgt über die Google Maps Routes API:
- **Service Account Authentication**: Sichere Authentifizierung über Google Cloud Service Accounts
- **Optimierte Routenberechnung**: Berücksichtigung von Verkehr, Distanz und Zeitfenstern
- **Waypoint-Optimierung**: Automatische Neuanordnung der Stopps für effizienteste Route

---

## 6. Export der optimierten Routen

### PDF-Export
Nach der Optimierung können alle Daten zusammengefasst in einer PDF-Datei exportiert werden. Diese Datei enthält die optimierten Routen der Mitarbeiter und dient zur Weitergabe an das Pflegepersonal.

---

## 7. Datenbankschema

### Benutzer (Users)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    area TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Mitarbeiter (Employees)
```sql
CREATE TABLE employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    street TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    city TEXT NOT NULL,
    function TEXT NOT NULL,
    work_hours FLOAT NOT NULL, -- Stellenumfang in Prozent
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Patienten (Patients)
```sql
CREATE TABLE patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    street TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    city TEXT NOT NULL,
    phone1 TEXT,
    phone2 TEXT,
    calendar_week INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Termine (Appointments)
```sql
CREATE TABLE appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    employee_id INTEGER,
    weekday TEXT NOT NULL, -- 'monday', 'tuesday', etc.
    time TIME NOT NULL,
    visit_type TEXT NOT NULL, -- 'HB', 'NA', 'TK'
    duration INTEGER NOT NULL, -- in minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);
```

### Routen (Routes)
```sql
CREATE TABLE routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    weekday TEXT NOT NULL,
    route_order TEXT NOT NULL, -- JSON Array mit appointment_ids
    total_duration INTEGER NOT NULL, -- in minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);
```

## 8. Projektstruktur

```plaintext
pflegedienst-app/
├── frontend/                 # React Frontend
│   ├── public/
│   │   ├── index.html
│   │   └── assets/
│   ├── src/
│   │   ├── components/      # React Komponenten
│   │   │   ├── common/      # Wiederverwendbare Komponenten
│   │   │   ├── layout/      # Layout Komponenten
│   │   │   ├── maps/        # Google Maps Komponenten
│   │   │   ├── employees/   # Mitarbeiter-bezogene Komponenten
│   │   │   └── patients/    # Patienten-bezogene Komponenten
│   │   ├── contexts/        # React Contexts
│   │   ├── hooks/           # Custom Hooks
│   │   ├── services/        # API Services
│   │   ├── types/           # TypeScript Typdefinitionen
│   │   ├── utils/           # Hilfsfunktionen
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                  # Flask Backend
│   ├── app/
│   │   ├── models/          # SQLAlchemy Models
│   │   ├── routes/          # API Routen
│   │   ├── services/        # Geschäftslogik
│   │   ├── utils/           # Hilfsfunktionen
│   │   └── __init__.py
│   ├── migrations/          # Datenbank Migrationen
│   ├── tests/               # Unit Tests
│   ├── config.py            # Konfigurationsdatei
│   ├── requirements.txt
│   └── run.py
│
├── docs/                     # Dokumentation
│   ├── api/
│   ├── database/
│   └── deployment/
│
└── docker/                   # Docker Konfiguration
    ├── frontend/
    ├── backend/
    └── docker-compose.yml
```

Die Projektstruktur ist in Frontend und Backend aufgeteilt, wobei beide Teile in separate Docker-Container verpackt werden können. Die Dokumentation und Docker-Konfigurationen sind in eigenen Verzeichnissen organisiert.

---

## Zusammenfassung

Die App ermöglicht eine umfassende Verwaltung von Mitarbeitern und Patienten, eine Visualisierung und Optimierung der Routen auf einer Google Maps Karte, sowie den Import und Export von Daten über Excel und PDF.
