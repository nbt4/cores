# Plannercore — Design Specification

**Datum:** 2026-06-01  
**Typ:** Neuer Core-Service  
**Ziel:** 100% Microsoft Planner-Klon als vierter Core-Service  
**Scope:** Basic + Premium Features (ohne KI-Agent/Copilot)

---

## 1. Architektur-Übersicht

```
plannercore/
├── cmd/server/main.go          # Entrypoint, API-Routing, Startup
├── internal/
│   ├── core/                    # Domain-Typen, Events, Interfaces
│   ├── plans/                   # PlanService
│   ├── tasks/                   # TaskService (mit Checklisten)
│   ├── boards/                  # BoardService (Buckets, Drag&Drop)
│   ├── timeline/                # TimelineService (Gantt, Abhängigkeiten)
│   ├── sprints/                 # SprintService
│   ├── analytics/               # AnalyticsService (Charts, Burndown, Workload)
│   ├── auth/                    # Session-Auth (teilt users-Tabelle)
│   ├── websocket/               # WebSocket Hub + Events
│   └── integration/             # PlanLinks zu RentalCore/WarehouseCore
├── web/
│   ├── src/
│   │   ├── components/          # Wiederverwendbare UI-Komponenten
│   │   ├── features/            # Feature-Module pro View
│   │   │   ├── board/           # Kanban (@dnd-kit)
│   │   │   ├── grid/            # Tabellenansicht
│   │   │   ├── schedule/        # Kalender (react-big-calendar)
│   │   │   ├── charts/          # Analytics (recharts)
│   │   │   ├── timeline/        # Gantt (Frappe Gantt Wrapper)
│   │   │   ├── people/          # Team-Auslastung
│   │   │   ├── goals/           # Ziele-Management
│   │   │   └── tasks/           # Task-Detail-Panel
│   │   ├── services/            # API-Client + WebSocket
│   │   ├── hooks/               # Custom React Hooks
│   │   ├── contexts/            # React Context Providers
│   │   └── lib/                 # Utilities, Date-Helper
│   └── vite.config.ts
├── migrations/
│   └── postgresql/
│       └── 003_plannercore_schema.sql
├── Dockerfile
├── go.mod
└── README.md
```

**Pattern:** Modularer Monolith — ein Go-Binär + ein React-Frontend, intern in Domain-Services getrennt.

---

## 2. Tech-Stack

| Schicht | Technologie | Version |
|---------|-------------|---------|
| Backend | Go | 1.24 |
| HTTP-Router | Gin | v1.9 |
| ORM | GORM | v1.30 |
| DB | PostgreSQL | 16 |
| Auth | bcrypt + session_id Cookie | — |
| WebSocket | gorilla/websocket | latest |
| Frontend | React + TypeScript | 18 |
| Build | Vite | 6 |
| CSS | Tailwind CSS + tsunami-theme.css | 4 |
| Kanban DnD | @dnd-kit/core + @dnd-kit/sortable | latest |
| Kalender | react-big-calendar | latest |
| Gantt | Frappe Gantt (Custom React Wrapper) | latest |
| Charts | recharts | latest |
| Rich Text | @tiptap/react | latest |
| Icons | Lucide React | latest |

---

## 3. CSS-Variablen-Policy (HARD RULE)

**Sämtliche** visuellen Eigenschaften in Plannercore nutzen **ausschließlich** CSS-Variablen aus `/opt/dev/cores/theme/tsunami-theme.css`. Null hardcoded values.

```
Board Cards:      var(--color-surface), var(--shadow-md), var(--radius-lg)
Priority Badges:  var(--planner-priority-urgent), var(--planner-priority-important), ...
Label Colors:     var(--planner-label-red), var(--planner-label-blue), ...
Drag Over:        var(--color-primary-100), var(--border-dashed)
Progress Bar:     var(--color-success), var(--color-warning)
Bucket Header:    var(--color-surface-raised), var(--border-default)
Sidebar:          var(--color-surface-inset), var(--shadow-sidebar)
```

Plannercore-spezifische Variablen werden in `tsunami-theme.css` ergänzt unter einem `/* Planner */` Block.

---

## 4. Datenmodell (PostgreSQL)

### Core-Tabellen

```sql
-- Pläne
CREATE TABLE planner_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    background_color TEXT DEFAULT 'var(--color-surface)',
    is_favorite BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

-- Plan-Mitglieder
CREATE TABLE planner_members (
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    role TEXT DEFAULT 'member', -- owner, member
    PRIMARY KEY (plan_id, user_id)
);

-- Buckets (Board-Spalten)
CREATE TABLE planner_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position DOUBLE PRECISION NOT NULL DEFAULT 0,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE planner_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    bucket_id UUID REFERENCES planner_buckets(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    rich_text_notes TEXT,
    priority TEXT DEFAULT 'medium', -- urgent, important, medium, low
    progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    start_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    position DOUBLE PRECISION NOT NULL DEFAULT 0,
    checklist_completed_count INT DEFAULT 0,
    checklist_total_count INT DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist-Items
CREATE TABLE planner_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    position INT DEFAULT 0,
    completed_by UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Labels
CREATE TABLE planner_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL
);

-- Task-Label M:N
CREATE TABLE planner_task_labels (
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    label_id UUID REFERENCES planner_labels(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, label_id)
);

-- Task-Zuweisungen M:N
CREATE TABLE planner_task_assignees (
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    PRIMARY KEY (task_id, user_id)
);

-- Kommentare
CREATE TABLE planner_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dateianhänge
CREATE TABLE planner_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task-Abhängigkeiten (Premium)
CREATE TABLE planner_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    predecessor_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    successor_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    dependency_type TEXT DEFAULT 'finish-to-start', -- FS, SS, FF, SF
    lag INTERVAL DEFAULT '0',
    UNIQUE(predecessor_id, successor_id)
);
```

### Premium-Tabellen

```sql
-- Sprints
CREATE TABLE planner_sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    goal TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE planner_sprint_tasks (
    sprint_id UUID REFERENCES planner_sprints(id) ON DELETE CASCADE,
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (sprint_id, task_id)
);

-- Goals
CREATE TABLE planner_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    parent_goal_id UUID REFERENCES planner_goals(id),
    title TEXT NOT NULL,
    description TEXT,
    progress INT DEFAULT 0,
    status TEXT DEFAULT 'not-started',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Benutzerdefinierte Felder
CREATE TABLE planner_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    field_type TEXT NOT NULL, -- text, number, date, choice, person
    choices JSONB, -- für choice-Typ
    position INT DEFAULT 0
);

CREATE TABLE planner_custom_field_values (
    field_id UUID REFERENCES planner_custom_fields(id) ON DELETE CASCADE,
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    value TEXT,
    PRIMARY KEY (field_id, task_id)
);

-- Baselines
CREATE TABLE planner_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    snapshot JSONB, -- Snapshot aller Tasks mit Datum
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Integrations-Tabellen

```sql
-- Task-History (Änderungsprotokoll)
CREATE TABLE planner_task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    field_changed TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plan-Links zu Cores
CREATE TABLE planner_plan_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- job, customer, venue, case, storage_zone
    entity_id UUID NOT NULL,
    entity_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- "Mein Tag" (User-spezifisch)
CREATE TABLE planner_my_day (
    user_id UUID REFERENCES users(id),
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, task_id)
);
```

### Indizes

```sql
CREATE INDEX idx_tasks_plan_bucket ON planner_tasks(plan_id, bucket_id);
CREATE INDEX idx_tasks_due_date ON planner_tasks(due_date);
CREATE INDEX idx_tasks_position ON planner_tasks(bucket_id, position);
CREATE INDEX idx_task_assignees_user ON planner_task_assignees(user_id);
CREATE INDEX idx_task_history_task ON planner_task_history(task_id);
CREATE INDEX idx_plan_links_entity ON planner_plan_links(entity_type, entity_id);
```

---

## 5. API-Struktur

Alle Endpunkte unter `/api/v1/planner/`. Auth via `session_id` Cookie.

### Plans
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/plans` | Alle Pläne des Users (Mitgliedschaften) |
| POST | `/plans` | Plan erstellen |
| GET | `/plans/:planId` | Plan-Details |
| PUT | `/plans/:planId` | Plan aktualisieren |
| DELETE | `/plans/:planId` | Plan löschen (irreversibel) |
| POST | `/plans/:planId/copy` | Plan kopieren |
| POST | `/plans/:planId/favorite` | Favorit toggeln |
| GET | `/plans/:planId/members` | Mitglieder-Liste |

### Buckets
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/:planId/buckets` | Alle Buckets eines Plans |
| POST | `/:planId/buckets` | Bucket erstellen |
| PUT | `/:planId/buckets/:id` | Bucket updaten |
| DELETE | `/:planId/buckets/:id` | Bucket löschen |

### Tasks
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/:planId/tasks?bucket=&label=&assignee=` | Tasks mit Filtern |
| POST | `/:planId/tasks` | Task erstellen |
| GET | `/tasks/:taskId` | Task-Details |
| PUT | `/tasks/:taskId` | Task updaten (inkl. Bucket-Wechsel = Move) |
| DELETE | `/tasks/:taskId` | Task löschen |
| PATCH | `/tasks/:taskId/progress` | Fortschritt setzen |
| PATCH | `/tasks/reorder` | Batch-Reorder nach Drag & Drop |

### Checklisten
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| POST | `/tasks/:taskId/checklist` | Item hinzufügen |
| PATCH | `/checklist/:id` | Item toggeln/umbenennen |
| DELETE | `/checklist/:id` | Item löschen |

### Labels
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/:planId/labels` | Labels des Plans |
| POST | `/:planId/labels` | Label erstellen |
| DELETE | `/labels/:id` | Label löschen |

### Kommentare
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/tasks/:taskId/comments` | Kommentare laden |
| POST | `/tasks/:taskId/comments` | Kommentar hinzufügen |

### Anhänge
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| POST | `/tasks/:taskId/attachments` | Datei hochladen |
| DELETE | `/attachments/:id` | Anhang löschen |

### Zuweisungen
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| POST | `/tasks/:taskId/assignees` | User zuweisen |
| DELETE | `/tasks/:taskId/assignees/:userId` | Zuweisung entfernen |

### Persönliche Views
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/my/tasks` | "Meine Aufgaben" über alle Pläne |
| GET | `/my/day` | "Mein Tag" |
| POST | `/my/day/:taskId` | Task zu "Mein Tag" hinzufügen |
| DELETE | `/my/day/:taskId` | Task aus "Mein Tag" entfernen |

### Timeline (Premium)
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/:planId/timeline` | Timeline-Daten mit Abhängigkeiten |
| POST | `/tasks/:taskId/dependencies` | Abhängigkeit setzen |
| DELETE | `/dependencies/:id` | Abhängigkeit löschen |

### Sprints (Premium)
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/:planId/sprints` | Sprints laden |
| POST | `/:planId/sprints` | Sprint erstellen |
| PUT | `/sprints/:id` | Sprint updaten |
| DELETE | `/sprints/:id` | Sprint löschen |
| POST | `/sprints/:id/tasks` | Tasks zu Sprint zuweisen |

### Goals (Premium)
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/:planId/goals` | Goals laden |
| POST | `/:planId/goals` | Goal erstellen |
| PUT | `/goals/:id` | Goal updaten |
| DELETE | `/goals/:id` | Goal löschen |

### Custom Fields (Premium)
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/:planId/custom-fields` | Felder laden |
| POST | `/:planId/custom-fields` | Feld erstellen |
| PUT | `/custom-fields/:id` | Feld updaten |
| DELETE | `/custom-fields/:id` | Feld löschen |

### Analytics (Premium)
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/:planId/charts/tasks` | Tasks nach Status/Bucket/Label |
| GET | `/:planId/charts/workload` | Team-Auslastung |
| GET | `/:planId/charts/burndown` | Burndown-Chart Daten |

### Baselines (Premium)
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/:planId/baselines` | Baselines laden |
| POST | `/:planId/baselines` | Baseline-Snapshot erstellen |

### WebSocket
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/ws?plan=:planId` | WebSocket-Upgrade für Echtzeit |

---

## 6. Event-System & WebSocket

```go
// Event-Typen
const (
    EventTaskCreated     = "task.created"
    EventTaskMoved       = "task.moved"
    EventTaskUpdated     = "task.updated"
    EventTaskDeleted     = "task.deleted"
    EventBucketCreated   = "bucket.created"
    EventBucketUpdated   = "bucket.updated"
    EventBucketDeleted   = "bucket.deleted"
    EventCommentAdded    = "comment.added"
    EventChecklistToggled = "checklist.toggled"
    EventLabelCreated    = "label.created"
    EventMemberAdded     = "member.added"
)
```

- Jeder Service publisht Events in internen Channel
- WebSocket Hub broadcastet an alle Clients im gleichen Plan
- Reconnect mit Exponential Backoff auf Client-Seite
- Events tragen `userId` für Multi-User-Anzeige ("X hat Task Y verschoben")

---

## 7. Frontend — Views & Komponenten

### 7.1 Board View (Kanban) — Mobile-First

- Horizontale Bucket-Liste (scrollbar auf Mobile < 768px)
- TaskCards sind Drag-Source + Drag-Target via `@dnd-kit`
- Drag & Drop: Task zwischen Buckets verschieben + Reihenfolge ändern
- Inline-Task-Erstellung pro Bucket
- Bucket-Header mit Task-Count + Add-Button

### 7.2 Grid View (Tabelle)

- Sortierbare, filterbare Task-Tabelle
- Spalten: Titel, Bucket, Assignees, Priority, Due Date, Progress, Labels
- Gruppierung nach: Bucket, Label, Assignee, Status
- Inline-Edit für schnelle Änderungen

### 7.3 Schedule View (Kalender)

- `react-big-calendar` mit Monats-/Wochen-/Tagesansicht
- Tasks als Kalender-Einträge (farbig nach Bucket/Label)
- Drag & Drop zum Verschieben von Terminen
- Mobile: Agenda-Listenansicht

### 7.4 Charts View

- **Status-Donut:** Tasks gruppiert nach Bucket-Status
- **Priority-Bar:** Tasks nach Priorität
- **Label-Distribution:** Tasks pro Label
- **Member-Progress:** Fortschritt pro Teammitglied
- Alle Charts via `recharts`, gestylt mit CSS-Variablen

### 7.5 Timeline View (Gantt) — Premium

- Frappe Gantt mit Custom React Wrapper
- Tasks mit `start_date`/`due_date` als Balken
- Abhängigkeits-Pfeile zwischen verknüpften Tasks
- Kritischer Pfad-Hervorhebung
- Nur Desktop (min 1024px)

### 7.6 People View — Premium

- Grid: Mitglieder × Tasks
- Kapazitätsbalken pro Person
- Filter nach Sprint/Zeitraum

### 7.7 Goals View — Premium

- Hierarchische Goal-Darstellung (OKR-ähnlich)
- Fortschrittsbalken pro Goal
- Verknüpfte Tasks anzeigen

### 7.8 Task Detail Panel

- Slide-Over von rechts (Desktop, 480px) / Fullscreen Sheet (Mobile)
- **Sektionen:**
  - Titel (inline editierbar) + Fortschritt-Slider (0-100%)
  - Priority-Badge (urgent/important/medium/low)
  - Metadata-Row: Assignees, Due Date, Labels, Bucket
  - Checkliste mit Fortschrittsbalken
  - Rich-Text-Notizen (@tiptap/react)
  - Dateianhänge mit Upload-Zone
  - Kommentar-Thread
  - Abhängigkeiten (Premium)
  - Benutzerdefinierte Felder (Premium)
  - Aktivitätslog (Premium, Task-History)

### 7.9 Sidebar

- Plan-Liste mit Favoriten oben (angepinnt)
- "Meine Aufgaben" Link mit Badge (Anzahl offener Tasks)
- "Mein Tag" Link
- Plan erstellen Button
- Suche nach Plänen

---

## 8. Auth & Integration

### 8.1 Geteilter Login

- Liest dieselbe `users`-Tabelle wie RentalCore/WarehouseCore
- Validiert `session_id` Cookie gegen bestehende Sessions
- RBAC: `planner.admin`, `planner.edit`, `planner.view`
- Kein separater Login — User ist automatisch eingeloggt wenn in RentalCore eingeloggt

### 8.2 Plan-Links zu Cores

```json
// POST /api/v1/planner/plans/:planId/links
{
  "entity_type": "job",
  "entity_id": "uuid-des-jobs",
  "entity_name": "Tsunami Festival Main"
}
```

- Polymorphe Links zu Jobs, Kunden, Venues (RentalCore)
- Links zu Cases, Storage Zones (WarehouseCore)
- Anzeige im Plan-Header: "Verknüpft mit: Job 'Tsunami Festival Main'"

---

## 9. Deployment

### Dockerfile (3-Stage)

```
Stage 1: node:20-alpine     → npm ci + build (Vite/React)
Stage 2: golang:1.24-alpine → go build cmd/server/main.go
Stage 3: alpine:latest      → binary + web/dist + migrations
```

### Targets

| Target | Wert |
|--------|------|
| Docker Image | `nobentie/plannercore` |
| GitLab Repo | `git.server-nt.de/ntielmann/plannercore` |
| DB Migration | `migrations/postgresql/003_plannercore_schema.sql` |
| Stack Pfad | `/opt/docker/komodo/stacks/tscores/docker-compose.yml` |
| Port | 8083 |

### docker-compose.yml Eintrag

```yaml
plannercore:
  image: nobentie/plannercore:latest
  environment:
    DB_HOST: postgres
    DB_PORT: 5432
    DB_NAME: rentalcore
    DB_USER: rentalcore
    DB_PASS: ${DB_PASS}
    SESSION_SECRET: ${SESSION_SECRET}
  ports:
    - "8083:8080"
  depends_on:
    - postgres
```

---

## 10. Build-Phasen

| Phase | Inhalt | Geschätzte Dateien |
|-------|--------|-------------------|
| **1. Foundation** | Projektgerüst, go.mod, Dockerfile, DB-Schema, Auth, main.go, Sidebar, leeres Board | ~25 |
| **2. Core Board** | Bucket-CRUD, Task-CRUD, Task-Detail-Panel, Drag&Drop, Labels, Checklisten, API | ~30 |
| **3. Views** | Grid-View, Schedule-View, Charts-View mit ViewSwitcher | ~15 |
| **4. Basic Premium** | Kommentare, Anhänge, Rich-Text-Notizen, "Meine Aufgaben", "Mein Tag" | ~10 |
| **5. Echtzeit** | WebSocket-Hub, Client-Hook, Multi-User Board-Sync | ~5 |
| **6. Full Premium** | Gantt/Timeline, Abhängigkeiten, Sprints, Goals, Custom Fields | ~15 |
| **7. Integration+** | Cores-Links, Workload, Baselines, Task-History, Mobile-Polish | ~10 |

---

## 11. Constraints & Non-Goals

### Constraints
- Nur CSS-Variablen aus `tsunami-theme.css` — keine hardcoded Werte
- Keine `.env`-Dateien im Repo
- Commit-Messages ohne "Claude" oder "AI"
- README aktuell halten nach jedem Commit
- Standard-Git-Kommandos (kein `--force`, kein `--no-verify` ohne Grund)

### Non-Goals (Phase 1)
- KI-Agent/Copilot-Integration (kommt später mit Claude API)
- Azure DevOps / Project Online Integration
- Portfolio-Management (kommt in Phase 2)
- E-Mail-Benachrichtigungen (kommt in Phase 2)
- Offline/PWA Mode (kommt in Phase 2)

---

## 12. Offene Entscheidungen

1. **Gantt-Library:** Frappe Gantt vs. Eigenbau — Entscheidung bei Implementierung nach Evaluation
2. **Rich-Text:** @tiptap/react vs. einfaches Markdown — tiptap bevorzugt für MS-Planner-Parität
3. **Drag & Drop Mobile:** @dnd-kit Touch-Support evaluieren, ggf. Fallback auf Move-Buttons
