# Routenoptimierungs-App für den Pflegedienst

## Inhaltsverzeichnis
- [Funktionsübersicht](#funktionsübersicht)

- [Überblick](#überblick)
- [Tech Stack](#tech-stack)
- [Funktionsbereiche](#funktionsbereiche)
  - [1. Benutzerverwaltung](#1-benutzerverwaltung)
  - [2. Hauptbildschirm: Google Maps](#2-hauptbildschirm-google-maps)
  - [3. Mitarbeiterverwaltung](#3-mitarbeiterverwaltung)
  - [4. Patientenverwaltung und Routenübersicht](#4-patientenverwaltung-und-routenübersicht)
  - [5. Routenoptimierung](#5-routenoptimierung)
  - [6. Datenexport](#6-datenexport)
- [Datenbankschema](#datenbankschema)
- [Projektstruktur](#projektstruktur)

## Funktionsübersicht

Diese App dient der Optimierung von Routen für Pflegedienste. Sie ermöglicht es, Mitarbeiter und Patienten zu verwalten, deren Arbeits- und Besuchszeiten zu planen, und optimierte Routen basierend auf den eingegebenen Informationen zu erstellen.

### Grundlegende Arbeitsweise der App

1. **Benutzeranmeldung**: 
   - Ein Benutzer (Pflegedienstleiter, Disponent) wählt sein Benutzerprofil oder erstellt ein neues
   - Jeder Benutzer hat nur einen Namen und eine Rolle

2. **Datenverwaltung**:
   - Import von Mitarbeiterdaten aus Excel-Dateien (mit Informationen zu Namen, Adresse, Funktion, Arbeitszeit)
   - Import von Patientendaten aus Excel-Dateien (mit Kontaktinformationen und Besuchszeiten)
   - Manuelle Bearbeitung der importierten Daten möglich

3. **Tagesplanung**:
   - Auswahl des relevanten Wochentags in der Seitenleiste
   - Anzeige verfügbarer Mitarbeiter und zu besuchender Patienten
   - Visualisierung der Termine mit ihren spezifischen Anforderungen (HB=25 Min, NA=120 Min, TK=kein Besuch nötig)

4. **Routengestaltung**:
   - Zuordnung von Patienten zu Mitarbeitern durch Drag-and-Drop auf der Karte oder über die Seitenleiste
   - Berücksichtigung der Arbeitszeiten der Mitarbeiter (basierend auf ihrem Stellenumfang)

5. **Routenoptimierung**:
   - Automatische Berechnung optimaler Routen durch die Google Maps Routes API
   - Berücksichtigung von Verkehr, Distanzen und Zeitfenstern
   - Optimierte Reihenfolge der Patientenbesuche für höchste Effizienz

6. **Visualisierung**:
   - Google Maps Karte zur Visualisierung aller Routen und Standorte
   - Übersichtliche Darstellung der Touren für jeden Mitarbeiter in der Seitenleiste

7. **Exportieren der Planung**:
   - Export fertiger Routenpläne als PDF-Dateien
   - Weitergabe der Pläne an das Pflegepersonal, das die Besuche durchführt

## Überblick

## Tech Stack

| Komponente | Technologie |
|------------|-------------|
| **Frontend** | React (TypeScript) mit Material UI |
| **Backend** | Flask API mit SQLite-Datenbank und SQLAlchemy |
| **Kartenservice** | Google Maps API |
| **Routenoptimierung** | Google Maps Routes API mit Service Account Authentifizierung |
| **Datenimport** | Excel-Dateien (Mitarbeiter und Patienten) |
| **Export** | PDF-Dateien zur Weitergabe optimierter Routen |

---

## Funktionsbereiche

### 1. Benutzerverwaltung

#### Benutzerübersicht
- Bei App-Start wird eine Benutzer-Auswahl angezeigt
- Funktionen:
  - **Hinzufügen, Bearbeiten und Entfernen** von Benutzern
  - Benutzer haben nur **Namen** und **Rolle**
  - **Auswahl** eines Benutzers führt zum Hauptbildschirm

#### Benutzerwechsel
- Anzeige des aktuellen Benutzers oben links auf dem Hauptbildschirm
- Möglichkeit zum Benutzerwechsel jederzeit verfügbar

### 2. Hauptbildschirm: Google Maps

#### Kartenanzeige
- Zentrale Google Maps Karte zur Visualisierung
- Darstellung von Patienten und Mitarbeitern 
- Dynamische Aktualisierung bei Wechsel des Wochentags

#### Patienten- und Mitarbeiterauswahl
- Wochentagsauswahl in der rechten Seitenleiste
- Anzeige der zugehörigen Patienten und Mitarbeiter für den gewählten Tag

### 3. Mitarbeiterverwaltung

#### Excel-Import von Mitarbeitern
**Datenstruktur der Excel-Datei:**
- Vorname
- Nachname
- Straße
- PLZ
- Ort
- Funktion
- Stellenumfang (z.B. 100% = 7 Stunden Arbeit pro Tag)

#### Mitarbeitertabelle
- Tabellarische Darstellung aller importierten Mitarbeiter
- Funktionen:
  - **Manuelles Hinzufügen/Entfernen** von Mitarbeitern
  - **Aktivieren/Deaktivieren** von Mitarbeitern

#### Vollbildansicht
- Erweiterbare linke Seitenleiste für bessere Übersicht

### 4. Patientenverwaltung und Routenübersicht

#### Excel-Import von Patienten
**Datenstruktur der Excel-Datei:**
- Vorname
- Nachname
- Straße
- PLZ
- Ort
- Telefon
- Telefon2
- KW (Kalenderwoche)
- Montag bis Freitag: Uhrzeit/Info (z.B. TK, HB, NA)
- Tour Pflegekraft (zugewiesener Mitarbeiter)

#### Patiententabelle und Wochentagsauswahl
- Anzeige der Patientendaten für den ausgewählten Wochentag
- Automatische Aktualisierung der Kartenansicht bei Änderung
- Darstellung der benötigten Besuchszeiten und -typen (HB, NA, TK)

#### Tourenübersicht
- Übersicht aller Mitarbeitertouren
- Anzeige auch von Mitarbeitern ohne zugewiesene Patienten

### 5. Routenoptimierung

#### Zuordnung von Patienten zu Mitarbeitern
- **Drag-and-Drop** auf der Karte
- Alternative Zuordnung über die Seitenleiste

#### Optimierung der Touren
**Zeitvorgaben:**
- Stellenumfang: 100% = 7 Stunden Arbeitszeit pro Tag
- Besuchszeiten:
  - **HB** (Hausbesuch): 25 Minuten
  - **NA** (Nachtbesuch): 120 Minuten
  - **TK** (Telefonkontakt): nicht in Routenplanung berücksichtigt

#### Google Maps Routes API Integration
- Sichere **Service Account Authentication**
- Optimierte Routenberechnung mit Berücksichtigung von:
  - Verkehr
  - Distanz
  - Zeitfenstern
- Automatische Waypoint-Optimierung für effizienteste Routen

### 6. Datenexport

#### PDF-Export
- Export aller optimierten Routen in einem PDF-Dokument
- Übersichtliche Darstellung zur Weitergabe an Pflegepersonal

---

## Datenbankschema

### Benutzer (Users)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    area TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Hauptnutzen der App

Die App bietet folgende Vorteile für Pflegedienste:

1. **Effizienzsteigerung**: 
   - Zeit- und Wegersparnis durch optimierte Routen
   - Mehr Zeit für die eigentliche Pflege statt für Fahrtwege

2. **Übersichtliche Planung**:
   - Visualisierung aller Termine und Routen auf einen Blick
   - Klare Zuordnung von Patienten zu Mitarbeitern

3. **Flexible Anpassung**:
   - Schnelle Reaktion auf Änderungen im Pflegeplan
   - Einfache Neuzuordnung von Patienten bei Personalausfällen

4. **Ressourcenoptimierung**:
   - Berücksichtigung der Arbeitszeiten der Mitarbeiter
   - Ausgewogene Verteilung der Arbeitsbelastung

5. **Datenmanagement**:
   - Zentrale Verwaltung aller relevanten Patienten- und Mitarbeiterdaten
   - Einfacher Import und Export von Informationen
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

## Projektstruktur

```plaintext
pflegedienst-app/
├── frontend/                  # React Frontend
│   ├── public/
│   │   ├── index.html
│   │   └── assets/          # Statische Assets (Bilder, Icons)
│   ├── src/
│   │   ├── components/      # React Komponenten
│   │   │   ├── common/      # Wiederverwendbare UI-Komponenten
│   │   │   ├── layout/      # Layout-Komponenten (Header, Sidebars)
│   │   │   ├── map/        # Google Maps Komponenten
│   │   │   │   ├── MapView.tsx
│   │   │   │   ├── Markers/
│   │   │   │   └── Routes/
│   │   │   ├── employees/   # Mitarbeiter-Komponenten
│   │   │   │   ├── EmployeeList/
│   │   │   │   ├── EmployeeForm/
│   │   │   │   └── EmployeeImport/
│   │   │   ├── patients/    # Patienten-Komponenten
│   │   │   │   ├── PatientList/
│   │   │   │   ├── PatientForm/
│   │   │   │   └── PatientImport/
│   │   │   └── routes/      # Routen-Komponenten
│   │   │       ├── RouteList/
│   │   │       └── RouteOptimization/
│   │   ├── contexts/        # React Contexts
│   │   │   ├── AuthContext.ts
│   │   │   └── AreaContext.ts
│   │   ├── hooks/          # Custom Hooks
│   │   │   ├── useMap.ts
│   │   │   └── useRoutes.ts
│   │   ├── services/       # API Services
│   │   │   ├── api/        # Backend API Calls
│   │   │   └── maps/       # Google Maps Services
│   │   ├── types/         # TypeScript Definitionen
│   │   │   ├── models.ts
│   │   │   └── api.ts
│   │   ├── utils/         # Hilfsfunktionen
│   │   │   ├── excel.ts   # Excel Import/Export
│   │   │   └── time.ts    # Zeitberechnungen
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                 # Flask Backend
│   ├── app/
│   │   ├── models/         # SQLAlchemy Models
│   │   │   ├── user.py
│   │   │   ├── employee.py
│   │   │   ├── patient.py
│   │   │   ├── appointment.py
│   │   │   └── route.py
│   │   ├── routes/         # API Endpoints
│   │   │   ├── auth.py
│   │   │   ├── employees.py
│   │   │   ├── patients.py
│   │   │   └── routes.py
│   │   ├── services/       # Business Logic
│   │   │   ├── excel_service.py
│   │   │   ├── route_optimizer.py
│   │   │   └── maps_service.py
│   │   └── utils/          # Hilfsfunktionen
│   │       ├── validators.py
│   │       └── converters.py
│   ├── migrations/         # Alembic Migrationen
│   ├── tests/             # Unit & Integration Tests
│   │   ├── test_models/
│   │   ├── test_routes/
│   │   └── test_services/
│   ├── config.py          # Konfiguration
│   └── requirements.txt
│
└── docker/                 # Docker Setup
    ├── frontend/
    │   └── Dockerfile
    ├── backend/
    │   └── Dockerfile
    └── docker-compose.yml
```