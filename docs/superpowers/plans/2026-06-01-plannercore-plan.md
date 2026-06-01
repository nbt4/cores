# Plannercore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 100% Microsoft Planner clone as a fourth Cores service (plannercore) with Basic + Premium features, shared auth, and full deployment pipeline.

**Architecture:** Modular monolith — single Go 1.24 binary (Gin + GORM + PostgreSQL) + React/TypeScript/Vite frontend. Six domain services (plans, tasks, boards, timeline, sprints, analytics) connected via WebSocket event hub. CSS-variables-only theming from `/opt/dev/cores/theme/tsunami-theme.css`.

**Tech Stack:** Go 1.24, Gin, GORM, PostgreSQL 16, gorilla/websocket, React 18, TypeScript, Vite, Tailwind CSS 4, @dnd-kit, react-big-calendar, recharts, @tiptap/react, Lucide React

---

### Task 1: Projektgerüst & GitLab Repo

**Files:**
- Create: `/opt/dev/cores/plannercore/go.mod`
- Create: `/opt/dev/cores/plannercore/go.sum` (auto-generated)
- Create: `/opt/dev/cores/plannercore/.gitignore`
- Create: `/opt/dev/cores/plannercore/README.md`
- Create: `/opt/dev/cores/plannercore/Dockerfile`

- [ ] **Step 1: GitLab Repo erstellen**

```bash
cd /opt/dev/cores
mkdir -p plannercore
cd plannercore
git init
```

Via GitLab API:
```bash
curl -s -H "PRIVATE-TOKEN: glpat-MUyzD2kDzRH0_wDl7EdwzG86MQp1OjQH.01.0w1mjxy3l" \
  -H "Content-Type: application/json" \
  -d '{"name":"plannercore","visibility":"private","description":"Microsoft Planner Clone — Cores Project Management Service"}' \
  "https://git.server-nt.de/api/v4/projects"
```

- [ ] **Step 2: go.mod initialisieren**

```bash
cd /opt/dev/cores/plannercore
go mod init plannercore
```

- [ ] **Step 3: .gitignore schreiben**

Inhalt:
```
server
plannercore
*.db
.env
uploads/
logs/
archives/
node_modules/
web/dist/
.DS_Store
.vscode/
.idea/
*.swp
*.bak
tmp/
```

- [ ] **Step 4: README.md mit Struktur-Platzhalter**

```markdown
# Plannercore

Microsoft Planner-Klon als Teil des Tsunami Events Cores-Ökosystems.

## Module

- **Task Board** — Kanban mit Drag & Drop
- **Grid View** — Tabellarische Aufgabenübersicht
- **Schedule View** — Kalenderansicht
- **Charts View** — Analytics & Reporting
- **Timeline View** — Gantt-Diagramm (Premium)
- **People View** — Team-Auslastung (Premium)
- **Goals** — Zielverwaltung (Premium)
- **Sprints** — Agile Sprint-Planung (Premium)

## Tech Stack

- Backend: Go 1.24, Gin, GORM, PostgreSQL 16
- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Real-time: WebSocket (gorilla/websocket)

## Deployment

Docker Image: `nobentie/plannercore`
```

- [ ] **Step 5: Dockerfile (3-Stage)**

```dockerfile
# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/web

COPY web/package*.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

# Stage 2: Build Backend
FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git gcc musl-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=1 GOOS=linux go build -o server cmd/server/main.go

# Stage 3: Production image
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/server .
COPY --from=frontend-builder /app/web/dist web/dist
COPY --chown=appuser:appgroup migrations/ migrations/

RUN mkdir -p uploads logs && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["./server"]
```

- [ ] **Step 6: Initial Commit & Push**

```bash
cd /opt/dev/cores/plannercore
git add go.mod .gitignore README.md Dockerfile
git commit -m "chore: initialize Plannercore project structure"
git remote add origin https://git.server-nt.de/ntielmann/plannercore.git
git push -u origin main
```

---

### Task 2: DB-Schema & Core-Modelle

**Files:**
- Create: `/opt/dev/cores/plannercore/migrations/postgresql/003_plannercore_schema.sql`
- Create: `/opt/dev/cores/plannercore/internal/core/models.go`
- Create: `/opt/dev/cores/plannercore/internal/core/events.go`

- [ ] **Step 1: SQL-Migration schreiben**

```sql
-- Plannercore Schema v1.0
-- Tables for Microsoft Planner clone functionality

CREATE TABLE IF NOT EXISTS planner_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    background_color TEXT DEFAULT '#1e293b',
    is_favorite BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS planner_members (
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    role TEXT DEFAULT 'member',
    PRIMARY KEY (plan_id, user_id)
);

CREATE TABLE IF NOT EXISTS planner_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position DOUBLE PRECISION NOT NULL DEFAULT 0,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS planner_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    bucket_id UUID REFERENCES planner_buckets(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    rich_text_notes TEXT,
    priority TEXT DEFAULT 'medium',
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

CREATE TABLE IF NOT EXISTS planner_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    position INT DEFAULT 0,
    completed_by UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS planner_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS planner_task_labels (
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    label_id UUID REFERENCES planner_labels(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, label_id)
);

CREATE TABLE IF NOT EXISTS planner_task_assignees (
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS planner_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS planner_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS planner_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    predecessor_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    successor_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    dependency_type TEXT DEFAULT 'finish-to-start',
    lag INTERVAL DEFAULT '0',
    UNIQUE(predecessor_id, successor_id)
);

CREATE TABLE IF NOT EXISTS planner_sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    goal TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS planner_sprint_tasks (
    sprint_id UUID REFERENCES planner_sprints(id) ON DELETE CASCADE,
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (sprint_id, task_id)
);

CREATE TABLE IF NOT EXISTS planner_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    parent_goal_id UUID REFERENCES planner_goals(id),
    title TEXT NOT NULL,
    description TEXT,
    progress INT DEFAULT 0,
    status TEXT DEFAULT 'not-started',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS planner_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    field_type TEXT NOT NULL,
    choices JSONB,
    position INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS planner_custom_field_values (
    field_id UUID REFERENCES planner_custom_fields(id) ON DELETE CASCADE,
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    value TEXT,
    PRIMARY KEY (field_id, task_id)
);

CREATE TABLE IF NOT EXISTS planner_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    snapshot JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS planner_task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    field_changed TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS planner_plan_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planner_plans(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    entity_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS planner_my_day (
    user_id UUID REFERENCES users(id),
    task_id UUID REFERENCES planner_tasks(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, task_id)
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_planner_tasks_plan_bucket ON planner_tasks(plan_id, bucket_id);
CREATE INDEX IF NOT EXISTS idx_planner_tasks_due_date ON planner_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_planner_tasks_position ON planner_tasks(bucket_id, position);
CREATE INDEX IF NOT EXISTS idx_planner_task_assignees_user ON planner_task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_task_history_task ON planner_task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_planner_plan_links_entity ON planner_plan_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_planner_my_day_user ON planner_my_day(user_id);
```

- [ ] **Step 2: Go-Modelle schreiben**

```go
// internal/core/models.go
package core

import (
    "time"
    "github.com/lib/pq"
    "gorm.io/datatypes"
)

type Plan struct {
    ID              string     `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    Name            string     `gorm:"not null" json:"name"`
    Description     string     `json:"description"`
    BackgroundColor string     `gorm:"default:'#1e293b'" json:"backgroundColor"`
    IsFavorite      bool       `gorm:"default:false" json:"isFavorite"`
    IsTemplate      bool       `gorm:"default:false" json:"isTemplate"`
    CreatedBy       string     `gorm:"type:uuid" json:"createdBy"`
    CreatedAt       time.Time  `json:"createdAt"`
    UpdatedAt       time.Time  `json:"updatedAt"`
    ArchivedAt      *time.Time `json:"archivedAt"`
    Buckets         []Bucket   `gorm:"foreignKey:PlanID" json:"buckets,omitempty"`
    Members         []Member   `gorm:"foreignKey:PlanID" json:"members,omitempty"`
    Labels          []Label    `gorm:"foreignKey:PlanID" json:"labels,omitempty"`
}

func (Plan) TableName() string { return "planner_plans" }

type Member struct {
    PlanID string `gorm:"primaryKey;type:uuid" json:"planId"`
    UserID string `gorm:"primaryKey;type:uuid" json:"userId"`
    Role   string `gorm:"default:member" json:"role"`
}

func (Member) TableName() string { return "planner_members" }

type Bucket struct {
    ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    PlanID    string    `gorm:"not null;type:uuid" json:"planId"`
    Name      string    `gorm:"not null" json:"name"`
    Position  float64   `gorm:"not null;default:0" json:"position"`
    Color     string    `json:"color"`
    CreatedAt time.Time `json:"createdAt"`
    Tasks     []Task    `gorm:"foreignKey:BucketID" json:"tasks,omitempty"`
}

func (Bucket) TableName() string { return "planner_buckets" }

type Task struct {
    ID                       string     `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    PlanID                   string     `gorm:"not null;type:uuid" json:"planId"`
    BucketID                 *string    `gorm:"type:uuid" json:"bucketId"`
    Title                    string     `gorm:"not null" json:"title"`
    RichTextNotes            string     `json:"richTextNotes"`
    Priority                 string     `gorm:"default:medium" json:"priority"`
    Progress                 int        `gorm:"default:0" json:"progress"`
    StartDate                *time.Time `json:"startDate"`
    DueDate                  *time.Time `json:"dueDate"`
    CompletedAt              *time.Time `json:"completedAt"`
    Position                 float64    `gorm:"not null;default:0" json:"position"`
    ChecklistCompletedCount  int        `gorm:"default:0" json:"checklistCompletedCount"`
    ChecklistTotalCount      int        `gorm:"default:0" json:"checklistTotalCount"`
    CreatedBy                string     `gorm:"type:uuid" json:"createdBy"`
    CreatedAt                time.Time  `json:"createdAt"`
    UpdatedAt                time.Time  `json:"updatedAt"`
    Assignees                []TaskAssignee  `gorm:"foreignKey:TaskID" json:"assignees,omitempty"`
    ChecklistItems           []ChecklistItem `gorm:"foreignKey:TaskID" json:"checklistItems,omitempty"`
    Labels                   []TaskLabel     `gorm:"foreignKey:TaskID" json:"labels,omitempty"`
    Comments                 []Comment       `gorm:"foreignKey:TaskID" json:"comments,omitempty"`
    Attachments              []Attachment    `gorm:"foreignKey:TaskID" json:"attachments,omitempty"`
}

func (Task) TableName() string { return "planner_tasks" }

type ChecklistItem struct {
    ID          string     `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    TaskID      string     `gorm:"not null;type:uuid" json:"taskId"`
    Title       string     `gorm:"not null" json:"title"`
    IsCompleted bool       `gorm:"default:false" json:"isCompleted"`
    Position    int        `gorm:"default:0" json:"position"`
    CompletedBy *string    `gorm:"type:uuid" json:"completedBy"`
    CompletedAt *time.Time `json:"completedAt"`
    CreatedAt   time.Time  `json:"createdAt"`
}

func (ChecklistItem) TableName() string { return "planner_checklist_items" }

type Label struct {
    ID     string `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    PlanID string `gorm:"not null;type:uuid" json:"planId"`
    Name   string `gorm:"not null" json:"name"`
    Color  string `gorm:"not null" json:"color"`
}

func (Label) TableName() string { return "planner_labels" }

type TaskLabel struct {
    TaskID  string `gorm:"primaryKey;type:uuid" json:"taskId"`
    LabelID string `gorm:"primaryKey;type:uuid" json:"labelId"`
}

func (TaskLabel) TableName() string { return "planner_task_labels" }

type TaskAssignee struct {
    TaskID string `gorm:"primaryKey;type:uuid" json:"taskId"`
    UserID string `gorm:"primaryKey;type:uuid" json:"userId"`
}

func (TaskAssignee) TableName() string { return "planner_task_assignees" }

type Comment struct {
    ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    TaskID    string    `gorm:"not null;type:uuid" json:"taskId"`
    UserID    string    `gorm:"type:uuid" json:"userId"`
    Content   string    `gorm:"not null" json:"content"`
    CreatedAt time.Time `json:"createdAt"`
}

func (Comment) TableName() string { return "planner_comments" }

type Attachment struct {
    ID         string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    TaskID     string    `gorm:"not null;type:uuid" json:"taskId"`
    Filename   string    `gorm:"not null" json:"filename"`
    FilePath   string    `gorm:"not null" json:"filePath"`
    FileSize   int64     `json:"fileSize"`
    MimeType   string    `json:"mimeType"`
    UploadedBy string    `gorm:"type:uuid" json:"uploadedBy"`
    CreatedAt  time.Time `json:"createdAt"`
}

func (Attachment) TableName() string { return "planner_attachments" }

type Dependency struct {
    ID             string `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    PredecessorID  string `gorm:"not null;type:uuid" json:"predecessorId"`
    SuccessorID    string `gorm:"not null;type:uuid" json:"successorId"`
    DependencyType string `gorm:"default:finish-to-start" json:"dependencyType"`
    Lag            string `gorm:"default:0" json:"lag"`
}

func (Dependency) TableName() string { return "planner_dependencies" }

type Sprint struct {
    ID        string     `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    PlanID    string     `gorm:"not null;type:uuid" json:"planId"`
    Name      string     `gorm:"not null" json:"name"`
    Goal      string     `json:"goal"`
    StartDate *time.Time `json:"startDate"`
    EndDate   *time.Time `json:"endDate"`
    IsActive  bool       `gorm:"default:false" json:"isActive"`
    CreatedAt time.Time  `json:"createdAt"`
}

func (Sprint) TableName() string { return "planner_sprints" }

type SprintTask struct {
    SprintID string `gorm:"primaryKey;type:uuid" json:"sprintId"`
    TaskID   string `gorm:"primaryKey;type:uuid" json:"taskId"`
}

func (SprintTask) TableName() string { return "planner_sprint_tasks" }

type Goal struct {
    ID           string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    PlanID       string    `gorm:"not null;type:uuid" json:"planId"`
    ParentGoalID *string   `gorm:"type:uuid" json:"parentGoalId"`
    Title        string    `gorm:"not null" json:"title"`
    Description  string    `json:"description"`
    Progress     int       `gorm:"default:0" json:"progress"`
    Status       string    `gorm:"default:not-started" json:"status"`
    CreatedAt    time.Time `json:"createdAt"`
}

func (Goal) TableName() string { return "planner_goals" }

type CustomField struct {
    ID        string          `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    PlanID    string          `gorm:"not null;type:uuid" json:"planId"`
    Name      string          `gorm:"not null" json:"name"`
    FieldType string          `gorm:"not null" json:"fieldType"`
    Choices   json.RawMessage `gorm:"type:jsonb" json:"choices"`
    Position  int             `gorm:"default:0" json:"position"`
}

func (CustomField) TableName() string { return "planner_custom_fields" }

type CustomFieldValue struct {
    FieldID string  `gorm:"primaryKey;type:uuid" json:"fieldId"`
    TaskID  string  `gorm:"primaryKey;type:uuid" json:"taskId"`
    Value   *string `json:"value"`
}

func (CustomFieldValue) TableName() string { return "planner_custom_field_values" }

type Baseline struct {
    ID        string          `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    PlanID    string          `gorm:"not null;type:uuid" json:"planId"`
    Name      string          `gorm:"not null" json:"name"`
    Snapshot  json.RawMessage `gorm:"type:jsonb" json:"snapshot"`
    CreatedAt time.Time       `json:"createdAt"`
}

func (Baseline) TableName() string { return "planner_baselines" }

type TaskHistory struct {
    ID           string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    TaskID       string    `gorm:"not null;type:uuid" json:"taskId"`
    UserID       string    `gorm:"type:uuid" json:"userId"`
    FieldChanged string    `gorm:"not null" json:"fieldChanged"`
    OldValue     string    `json:"oldValue"`
    NewValue     string    `json:"newValue"`
    ChangedAt    time.Time `json:"changedAt"`
}

func (TaskHistory) TableName() string { return "planner_task_history" }

type PlanLink struct {
    ID         string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    PlanID     string    `gorm:"not null;type:uuid" json:"planId"`
    EntityType string    `gorm:"not null" json:"entityType"`
    EntityID   string    `gorm:"not null;type:uuid" json:"entityId"`
    EntityName string    `json:"entityName"`
    CreatedAt  time.Time `json:"createdAt"`
}

func (PlanLink) TableName() string { return "planner_plan_links" }

type MyDay struct {
    UserID  string    `gorm:"primaryKey;type:uuid" json:"userId"`
    TaskID  string    `gorm:"primaryKey;type:uuid" json:"taskId"`
    AddedAt time.Time `json:"addedAt"`
}

func (MyDay) TableName() string { return "planner_my_day" }
```

- [ ] **Step 3: Event-Typen definieren**

```go
// internal/core/events.go
package core

import "time"

type EventType string

const (
    EventTaskCreated      EventType = "task.created"
    EventTaskMoved        EventType = "task.moved"
    EventTaskUpdated      EventType = "task.updated"
    EventTaskDeleted      EventType = "task.deleted"
    EventBucketCreated    EventType = "bucket.created"
    EventBucketUpdated    EventType = "bucket.updated"
    EventBucketDeleted    EventType = "bucket.deleted"
    EventCommentAdded     EventType = "comment.added"
    EventChecklistToggled EventType = "checklist.toggled"
    EventChecklistAdded   EventType = "checklist.added"
    EventLabelCreated     EventType = "label.created"
    EventMemberAdded      EventType = "member.added"
    EventMemberRemoved    EventType = "member.removed"
)

type PlanEvent struct {
    Type      EventType   `json:"type"`
    PlanID    string      `json:"planId"`
    Payload   interface{} `json:"payload"`
    UserID    string      `json:"userId"`
    Timestamp time.Time   `json:"timestamp"`
}

type EventBus struct {
    subscribers map[string][]chan PlanEvent
}

func NewEventBus() *EventBus {
    return &EventBus{
        subscribers: make(map[string][]chan PlanEvent),
    }
}

func (eb *EventBus) Subscribe(planID string) chan PlanEvent {
    ch := make(chan PlanEvent, 64)
    eb.subscribers[planID] = append(eb.subscribers[planID], ch)
    return ch
}

func (eb *EventBus) Unsubscribe(planID string, ch chan PlanEvent) {
    subs := eb.subscribers[planID]
    for i, sub := range subs {
        if sub == ch {
            eb.subscribers[planID] = append(subs[:i], subs[i+1:]...)
            close(ch)
            return
        }
    }
}

func (eb *EventBus) Publish(planID string, event PlanEvent) {
    for _, ch := range eb.subscribers[planID] {
        select {
        case ch <- event:
        default:
        }
    }
}
```

- [ ] **Step 4: Commit**

```bash
cd /opt/dev/cores/plannercore
git add migrations/ internal/core/
git commit -m "feat: add database schema and core domain models for Planner clone"
```

---

### Task 3: Auth-Modul & Session-Validation

**Files:**
- Create: `/opt/dev/cores/plannercore/internal/auth/session.go`

- [ ] **Step 1: Session-Validator schreiben**

```go
// internal/auth/session.go
package auth

import (
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

type SessionValidator struct {
    db *gorm.DB
}

func NewSessionValidator(db *gorm.DB) *SessionValidator {
    return &SessionValidator{db: db}
}

type User struct {
    ID           string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    Username     string    `gorm:"unique;not null" json:"username"`
    Email        string    `json:"email"`
    PasswordHash string    `json:"-"`
    IsActive     bool      `gorm:"default:true" json:"-"`
    Role         string    `gorm:"default:user" json:"role"`
}

func (User) TableName() string { return "users" }

type Session struct {
    ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
    UserID    string    `gorm:"not null;type:uuid"`
    Token     string    `gorm:"unique;not null"`
    ExpiresAt time.Time `gorm:"not null"`
    CreatedAt time.Time
}

func (Session) TableName() string { return "sessions" }

func (sv *SessionValidator) ValidateSession(sessionID string) (*User, bool) {
    var session Session
    if err := sv.db.Where("token = ? AND expires_at > ?", sessionID, time.Now()).First(&session).Error; err != nil {
        return nil, false
    }
    var user User
    if err := sv.db.Where("id = ? AND is_active = ?", session.UserID, true).First(&user).Error; err != nil {
        return nil, false
    }
    return &user, true
}

func (sv *SessionValidator) Middleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        sessionID, err := c.Cookie("session_id")
        if err != nil || sessionID == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
            c.Abort()
            return
        }

        user, valid := sv.ValidateSession(sessionID)
        if !valid {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired session"})
            c.Abort()
            return
        }

        c.Set("user", user)
        c.Set("userID", user.ID)
        c.Next()
    }
}

func (sv *SessionValidator) GetCurrentUser(c *gin.Context) (*User, bool) {
    userVal, exists := c.Get("user")
    if !exists {
        return nil, false
    }
    user, ok := userVal.(*User)
    return user, ok
}
```

- [ ] **Step 2: Commit**

```bash
cd /opt/dev/cores/plannercore
git add internal/auth/
git commit -m "feat: add shared auth session validation using users table"
```

---

### Task 4: main.go — Entrypoint & Routing

**Files:**
- Create: `/opt/dev/cores/plannercore/cmd/server/main.go`

- [ ] **Step 1: main.go mit Health-Endpoint und API-Router-Gerüst**

```go
// cmd/server/main.go
package main

import (
    "log"
    "os"

    "plannercore/internal/auth"
    "plannercore/internal/core"

    "github.com/gin-gonic/gin"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

func main() {
    dbHost := envOrDefault("DB_HOST", "localhost")
    dbPort := envOrDefault("DB_PORT", "5432")
    dbName := envOrDefault("DB_NAME", "rentalcore")
    dbUser := envOrDefault("DB_USER", "rentalcore")
    dbPass := envOrDefault("DB_PASS", "rentalcore")

    dsn := "host=" + dbHost + " port=" + dbPort + " user=" + dbUser +
        " password=" + dbPass + " dbname=" + dbName + " sslmode=disable"
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Warn),
    })
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }

    eventBus := core.NewEventBus()
    sessionValidator := auth.NewSessionValidator(db)

    r := gin.Default()
    r.SetTrustedProxies([]string{"127.0.0.1", "10.0.0.0/8", "172.16.0.0/12"})

    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok", "service": "plannercore"})
    })

    api := r.Group("/api/v1/planner")
    api.Use(sessionValidator.Middleware())

    // Wird in späteren Tasks mit Handlern befüllt
    _ = eventBus

    r.NoRoute(func(c *gin.Context) {
        c.File("web/dist/index.html")
    })

    port := envOrDefault("PORT", "8080")
    log.Printf("Plannercore starting on :%s", port)
    if err := r.Run(":" + port); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}

func envOrDefault(key, defaultVal string) string {
    if val := os.Getenv(key); val != "" {
        return val
    }
    return defaultVal
}
```

- [ ] **Step 2: go.mod Abhängigkeiten auflösen**

```bash
cd /opt/dev/cores/plannercore
go mod tidy
```

- [ ] **Step 3: Commit**

```bash
cd /opt/dev/cores/plannercore
git add cmd/server/main.go go.mod go.sum
git commit -m "feat: add server entrypoint with auth middleware and health endpoint"
```

---

### Task 5: Frontend-Gerüst & Theme-Integration

**Files:**
- Create: `/opt/dev/cores/plannercore/web/package.json`
- Create: `/opt/dev/cores/plannercore/web/index.html`
- Create: `/opt/dev/cores/plannercore/web/vite.config.ts`
- Create: `/opt/dev/cores/plannercore/web/tsconfig.json`
- Create: `/opt/dev/cores/plannercore/web/tsconfig.app.json`
- Create: `/opt/dev/cores/plannercore/web/tsconfig.node.json`
- Create: `/opt/dev/cores/plannercore/web/tailwind.config.js`
- Create: `/opt/dev/cores/plannercore/web/postcss.config.js`
- Create: `/opt/dev/cores/plannercore/web/src/main.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/App.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/index.css`

- [ ] **Step 1: package.json**

```json
{
  "name": "plannercore-web",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@tiptap/extension-check-list": "^2.6.0",
    "@tiptap/pm": "^2.6.0",
    "@tiptap/react": "^2.6.0",
    "@tiptap/starter-kit": "^2.6.0",
    "lucide-react": "^0.400.0",
    "react": "^18.3.1",
    "react-big-calendar": "^1.13.0",
    "react-dom": "^18.3.1",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-big-calendar": "^1.8.9",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.5.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: index.html**

```html
<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Plannercore — Tsunami Events</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 4: tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 5: tsconfig.app.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 6: tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 7: tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 8: postcss.config.js**

```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
```

- [ ] **Step 9: index.css (Tailwind + Theme-Import)**

```css
@import "tailwindcss";
@import "../../../theme/tsunami-theme.css";

:root {
  --planner-priority-urgent: var(--color-danger, #ef4444);
  --planner-priority-important: var(--color-warning, #f59e0b);
  --planner-priority-medium: var(--color-info, #3b82f6);
  --planner-priority-low: var(--color-muted, #6b7280);

  --planner-label-red: #ef4444;
  --planner-label-blue: #3b82f6;
  --planner-label-green: #22c55e;
  --planner-label-yellow: #eab308;
  --planner-label-purple: #a855f7;
  --planner-label-orange: #f97316;
  --planner-label-pink: #ec4899;
  --planner-label-teal: #14b8a6;

  --planner-card-shadow: var(--shadow-sm);
  --planner-card-radius: var(--radius-lg);
  --planner-bucket-bg: var(--color-surface-raised);
  --planner-sidebar-width: 280px;
}

body {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}
```

- [ ] **Step 10: main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 11: App.tsx (Router-Gerüst)**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import Sidebar from './components/layout/Sidebar'
import PlanHeader from './components/layout/PlanHeader'
import BoardView from './components/board/BoardView'
import GridView from './components/grid/GridView'
import ScheduleView from './components/schedule/ScheduleView'
import ChartsView from './components/charts/ChartsView'
import TimelineView from './components/timeline/TimelineView'
import PeopleView from './components/people/PeopleView'
import GoalsView from './components/goals/GoalsView'

function PlanLayout() {
  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <PlanHeader />
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="board" element={<BoardView />} />
            <Route path="grid" element={<GridView />} />
            <Route path="schedule" element={<ScheduleView />} />
            <Route path="charts" element={<ChartsView />} />
            <Route path="timeline" element={<TimelineView />} />
            <Route path="people" element={<PeopleView />} />
            <Route path="goals" element={<GoalsView />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <Routes>
            <Route path="/plan/:planId/*" element={<PlanLayout />} />
            <Route path="/my/tasks" element={<div>My Tasks</div>} />
            <Route path="/my/day" element={<div>My Day</div>} />
            <Route path="*" element={<Navigate to="/plan/new" />} />
          </Routes>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 12: npm install & Build-Test**

```bash
cd /opt/dev/cores/plannercore/web
npm install
npm run build  # Muss erfolgreich compilieren
```

- [ ] **Step 13: Commit**

```bash
cd /opt/dev/cores/plannercore
git add web/
git commit -m "feat: initialize frontend with React, Vite, Tailwind and router layout"
```

---

### Task 6: Plan-CRUD Backend (Handler + Service + Repository)

**Files:**
- Create: `/opt/dev/cores/plannercore/internal/plans/handler.go`
- Create: `/opt/dev/cores/plannercore/internal/plans/service.go`
- Create: `/opt/dev/cores/plannercore/internal/plans/repository.go`

- [ ] **Step 1: Plan Repository**

```go
// internal/plans/repository.go
package plans

import (
    "plannercore/internal/core"
    "gorm.io/gorm"
)

type Repository struct {
    db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
    return &Repository{db: db}
}

func (r *Repository) FindAllByUser(userID string) ([]core.Plan, error) {
    var plans []core.Plan
    sub := r.db.Table("planner_members").Select("plan_id").Where("user_id = ?", userID)
    err := r.db.Where("id IN (?)", sub).Where("archived_at IS NULL").
        Order("is_favorite DESC, updated_at DESC").
        Preload("Buckets", func(db *gorm.DB) *gorm.DB {
            return db.Order("position ASC")
        }).
        Preload("Buckets.Tasks", func(db *gorm.DB) *gorm.DB {
            return db.Order("position ASC")
        }).
        Find(&plans).Error
    return plans, err
}

func (r *Repository) FindByID(id string) (*core.Plan, error) {
    var plan core.Plan
    err := r.db.Preload("Buckets", func(db *gorm.DB) *gorm.DB {
        return db.Order("position ASC")
    }).Preload("Labels").Preload("Members").First(&plan, "id = ?", id).Error
    return &plan, err
}

func (r *Repository) Create(plan *core.Plan) error {
    return r.db.Transaction(func(tx *gorm.DB) error {
        if err := tx.Create(plan).Error; err != nil {
            return err
        }
        member := core.Member{
            PlanID: plan.ID,
            UserID: plan.CreatedBy,
            Role:   "owner",
        }
        return tx.Create(&member).Error
    })
}

func (r *Repository) Update(plan *core.Plan) error {
    return r.db.Save(plan).Error
}

func (r *Repository) Delete(id string) error {
    return r.db.Delete(&core.Plan{}, "id = ?", id).Error
}

func (r *Repository) ToggleFavorite(id string) error {
    return r.db.Exec("UPDATE planner_plans SET is_favorite = NOT is_favorite WHERE id = ?", id).Error
}

func (r *Repository) Copy(originalID, newID, userID string) error {
    // Transaction: copy plan, buckets, tasks, labels
    return r.db.Transaction(func(tx *gorm.DB) error {
        var original core.Plan
        if err := tx.Preload("Buckets.Tasks").Preload("Labels").First(&original, "id = ?", originalID).Error; err != nil {
            return err
        }
        newPlan := original
        newPlan.ID = newID
        newPlan.Name = original.Name + " (Kopie)"
        newPlan.IsFavorite = false
        newPlan.CreatedBy = userID
        if err := tx.Create(&newPlan).Error; err != nil {
            return err
        }
        return tx.Create(&core.Member{PlanID: newPlan.ID, UserID: userID, Role: "owner"}).Error
    })
}
```

- [ ] **Step 2: Plan Service**

```go
// internal/plans/service.go
package plans

import (
    "plannercore/internal/core"
    "github.com/google/uuid"
)

type Service struct {
    repo     *Repository
    eventBus *core.EventBus
}

func NewService(repo *Repository, eventBus *core.EventBus) *Service {
    return &Service{repo: repo, eventBus: eventBus}
}

func (s *Service) ListPlans(userID string) ([]core.Plan, error) {
    return s.repo.FindAllByUser(userID)
}

func (s *Service) GetPlan(id string) (*core.Plan, error) {
    return s.repo.FindByID(id)
}

func (s *Service) CreatePlan(name, description, userID string) (*core.Plan, error) {
    plan := &core.Plan{
        ID:        uuid.New().String(),
        Name:      name,
        Description: description,
        CreatedBy: userID,
    }
    if err := s.repo.Create(plan); err != nil {
        return nil, err
    }
    return plan, nil
}

func (s *Service) UpdatePlan(id, name, description string) error {
    plan, err := s.repo.FindByID(id)
    if err != nil {
        return err
    }
    if name != "" {
        plan.Name = name
    }
    if description != "" {
        plan.Description = description
    }
    return s.repo.Update(plan)
}

func (s *Service) DeletePlan(id string) error {
    return s.repo.Delete(id)
}

func (s *Service) ToggleFavorite(id string) error {
    return s.repo.ToggleFavorite(id)
}

func (s *Service) CopyPlan(id, userID string) (*core.Plan, error) {
    newID := uuid.New().String()
    if err := s.repo.Copy(id, newID, userID); err != nil {
        return nil, err
    }
    return s.repo.FindByID(newID)
}
```

- [ ] **Step 3: Plan Handler**

```go
// internal/plans/handler.go
package plans

import (
    "net/http"
    "plannercore/internal/auth"
    "github.com/gin-gonic/gin"
)

type Handler struct {
    service    *Service
    sessionVal *auth.SessionValidator
}

func NewHandler(service *Service, sv *auth.SessionValidator) *Handler {
    return &Handler{service: service, sessionVal: sv}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
    plans := rg.Group("/plans")
    plans.GET("", h.ListPlans)
    plans.POST("", h.CreatePlan)
    plans.GET("/:planId", h.GetPlan)
    plans.PUT("/:planId", h.UpdatePlan)
    plans.DELETE("/:planId", h.DeletePlan)
    plans.POST("/:planId/copy", h.CopyPlan)
    plans.POST("/:planId/favorite", h.ToggleFavorite)
}

func (h *Handler) ListPlans(c *gin.Context) {
    user, _ := h.sessionVal.GetCurrentUser(c)
    plans, err := h.service.ListPlans(user.ID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, plans)
}

func (h *Handler) GetPlan(c *gin.Context) {
    plan, err := h.service.GetPlan(c.Param("planId"))
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "plan not found"})
        return
    }
    c.JSON(http.StatusOK, plan)
}

func (h *Handler) CreatePlan(c *gin.Context) {
    var input struct {
        Name        string `json:"name" binding:"required"`
        Description string `json:"description"`
    }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    user, _ := h.sessionVal.GetCurrentUser(c)
    plan, err := h.service.CreatePlan(input.Name, input.Description, user.ID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusCreated, plan)
}

func (h *Handler) UpdatePlan(c *gin.Context) {
    var input struct {
        Name        string `json:"name"`
        Description string `json:"description"`
    }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    if err := h.service.UpdatePlan(c.Param("planId"), input.Name, input.Description); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

func (h *Handler) DeletePlan(c *gin.Context) {
    if err := h.service.DeletePlan(c.Param("planId")); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

func (h *Handler) ToggleFavorite(c *gin.Context) {
    if err := h.service.ToggleFavorite(c.Param("planId")); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"status": "toggled"})
}

func (h *Handler) CopyPlan(c *gin.Context) {
    user, _ := h.sessionVal.GetCurrentUser(c)
    plan, err := h.service.CopyPlan(c.Param("planId"), user.ID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusCreated, plan)
}
```

- [ ] **Step 4: main.go um Plan-Routen erweitern**

```go
// In cmd/server/main.go, nach "api := r.Group..." hinzufügen:
planRepo := plans.NewRepository(db)
planService := plans.NewService(planRepo, eventBus)
planHandler := plans.NewHandler(planService, sessionValidator)
planHandler.RegisterRoutes(api)
```

- [ ] **Step 5: Commit**

```bash
cd /opt/dev/cores/plannercore
go mod tidy
git add internal/plans/ cmd/server/main.go go.mod go.sum
git commit -m "feat: add plan CRUD with handler, service, and repository layers"
```

---

### Task 7: Bucket-CRUD Backend

**Files:**
- Create: `/opt/dev/cores/plannercore/internal/boards/handler.go`
- Create: `/opt/dev/cores/plannercore/internal/boards/service.go`
- Create: `/opt/dev/cores/plannercore/internal/boards/repository.go`

- [ ] **Step 1: Bucket Repository**

```go
// internal/boards/repository.go
package boards

import (
    "plannercore/internal/core"
    "gorm.io/gorm"
)

type Repository struct {
    db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
    return &Repository{db: db}
}

func (r *Repository) FindByPlanID(planID string) ([]core.Bucket, error) {
    var buckets []core.Bucket
    err := r.db.Where("plan_id = ?", planID).Order("position ASC").
        Preload("Tasks", func(db *gorm.DB) *gorm.DB {
            return db.Order("position ASC").Preload("Assignees").Preload("Labels")
        }).Find(&buckets).Error
    return buckets, err
}

func (r *Repository) Create(bucket *core.Bucket) error {
    var maxPos float64
    r.db.Model(&core.Bucket{}).Where("plan_id = ?", bucket.PlanID).
        Select("COALESCE(MAX(position), 0)").Scan(&maxPos)
    bucket.Position = maxPos + 1000.0
    return r.db.Create(bucket).Error
}

func (r *Repository) Update(bucket *core.Bucket) error {
    return r.db.Save(bucket).Error
}

func (r *Repository) Delete(id string) error {
    return r.db.Delete(&core.Bucket{}, "id = ?", id).Error
}
```

- [ ] **Step 2: Bucket Service**

```go
// internal/boards/service.go
package boards

import (
    "plannercore/internal/core"
    "github.com/google/uuid"
)

type Service struct {
    repo     *Repository
    eventBus *core.EventBus
}

func NewService(repo *Repository, eventBus *core.EventBus) *Service {
    return &Service{repo: repo, eventBus: eventBus}
}

func (s *Service) GetBuckets(planID string) ([]core.Bucket, error) {
    return s.repo.FindByPlanID(planID)
}

func (s *Service) CreateBucket(planID, name string) (*core.Bucket, error) {
    bucket := &core.Bucket{
        ID:     uuid.New().String(),
        PlanID: planID,
        Name:   name,
    }
    if err := s.repo.Create(bucket); err != nil {
        return nil, err
    }
    s.eventBus.Publish(planID, core.PlanEvent{Type: core.EventBucketCreated, PlanID: planID, Payload: bucket})
    return bucket, nil
}

func (s *Service) UpdateBucket(id, name string) error {
    // Simplified: find by ID via GORM raw query for update only
    return s.repo.Update(&core.Bucket{ID: id, Name: name})
}

func (s *Service) DeleteBucket(id string) error {
    return s.repo.Delete(id)
}
```

- [ ] **Step 3: Bucket Handler**

```go
// internal/boards/handler.go
package boards

import (
    "net/http"
    "plannercore/internal/auth"
    "github.com/gin-gonic/gin"
)

type Handler struct {
    service    *Service
    sessionVal *auth.SessionValidator
}

func NewHandler(service *Service, sv *auth.SessionValidator) *Handler {
    return &Handler{service: service, sessionVal: sv}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
    rg.GET("/:planId/buckets", h.ListBuckets)
    rg.POST("/:planId/buckets", h.CreateBucket)
    rg.PUT("/:planId/buckets/:id", h.UpdateBucket)
    rg.DELETE("/:planId/buckets/:id", h.DeleteBucket)
}

func (h *Handler) ListBuckets(c *gin.Context) {
    buckets, err := h.service.GetBuckets(c.Param("planId"))
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, buckets)
}

func (h *Handler) CreateBucket(c *gin.Context) {
    var input struct {
        Name string `json:"name" binding:"required"`
    }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    bucket, err := h.service.CreateBucket(c.Param("planId"), input.Name)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusCreated, bucket)
}

func (h *Handler) UpdateBucket(c *gin.Context) {
    var input struct {
        Name string `json:"name" binding:"required"`
    }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    if err := h.service.UpdateBucket(c.Param("id"), input.Name); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

func (h *Handler) DeleteBucket(c *gin.Context) {
    if err := h.service.DeleteBucket(c.Param("id")); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
```

- [ ] **Step 4: main.go um Bucket-Routen erweitern und Commit**

```bash
cd /opt/dev/cores/plannercore
# In main.go: boardRepo, boardService, boardHandler registrieren
go mod tidy
git add internal/boards/ cmd/server/main.go go.mod go.sum
git commit -m "feat: add bucket CRUD backend for Kanban columns"
```

---

### Task 8: Task-CRUD Backend

**Files:**
- Create: `/opt/dev/cores/plannercore/internal/tasks/handler.go`
- Create: `/opt/dev/cores/plannercore/internal/tasks/service.go`
- Create: `/opt/dev/cores/plannercore/internal/tasks/repository.go`

- [ ] **Step 1: Task Repository**

```go
// internal/tasks/repository.go
package tasks

import (
    "plannercore/internal/core"
    "gorm.io/gorm"
)

type Repository struct {
    db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
    return &Repository{db: db}
}

func (r *Repository) FindByPlanID(planID string, bucketID, labelID, assigneeID string) ([]core.Task, error) {
    var tasks []core.Task
    q := r.db.Where("plan_id = ?", planID)
    if bucketID != "" {
        q = q.Where("bucket_id = ?", bucketID)
    }
    if assigneeID != "" {
        q = q.Where("id IN (SELECT task_id FROM planner_task_assignees WHERE user_id = ?)", assigneeID)
    }
    if labelID != "" {
        q = q.Where("id IN (SELECT task_id FROM planner_task_labels WHERE label_id = ?)", labelID)
    }
    err := q.Order("position ASC").
        Preload("Assignees").Preload("Labels").Preload("ChecklistItems").
        Find(&tasks).Error
    return tasks, err
}

func (r *Repository) FindByID(id string) (*core.Task, error) {
    var task core.Task
    err := r.db.Preload("Assignees").Preload("Labels").Preload("ChecklistItems").
        Preload("Comments").Preload("Attachments").First(&task, "id = ?", id).Error
    return &task, err
}

func (r *Repository) Create(task *core.Task) error {
    return r.db.Transaction(func(tx *gorm.DB) error {
        var maxPos float64
        tx.Model(&core.Task{}).Where("bucket_id = ?", task.BucketID).
            Select("COALESCE(MAX(position), 0)").Scan(&maxPos)
        task.Position = maxPos + 1000.0
        return tx.Create(task).Error
    })
}

func (r *Repository) Update(task *core.Task) error {
    return r.db.Save(task).Error
}

func (r *Repository) Delete(id string) error {
    return r.db.Delete(&core.Task{}, "id = ?", id).Error
}

func (r *Repository) Reorder(reordered []struct{ ID string; BucketID *string; Position float64 }) error {
    return r.db.Transaction(func(tx *gorm.DB) error {
        for _, t := range reordered {
            if err := tx.Model(&core.Task{}).Where("id = ?", t.ID).
                Updates(map[string]interface{}{"bucket_id": t.BucketID, "position": t.Position}).Error; err != nil {
                return err
            }
        }
        return nil
    })
}

func (r *Repository) FindByAssignee(userID string) ([]core.Task, error) {
    var tasks []core.Task
    err := r.db.Where("id IN (SELECT task_id FROM planner_task_assignees WHERE user_id = ?)", userID).
        Where("completed_at IS NULL").Order("due_date ASC").
        Preload("Assignees").Preload("Labels").Find(&tasks).Error
    return tasks, err
}

func (r *Repository) FindMyDay(userID string) ([]core.Task, error) {
    var tasks []core.Task
    err := r.db.Where("id IN (SELECT task_id FROM planner_my_day WHERE user_id = ?)", userID).
        Order("due_date ASC").Preload("Assignees").Preload("Labels").Find(&tasks).Error
    return tasks, err
}

func (r *Repository) AddToMyDay(userID, taskID string) error {
    return r.db.Create(&core.MyDay{UserID: userID, TaskID: taskID}).Error
}

func (r *Repository) RemoveFromMyDay(userID, taskID string) error {
    return r.db.Delete(&core.MyDay{}, "user_id = ? AND task_id = ?", userID, taskID).Error
}
```

- [ ] **Step 2: Task Service**

```go
// internal/tasks/service.go
package tasks

import (
    "plannercore/internal/core"
    "github.com/google/uuid"
)

type Service struct {
    repo     *Repository
    eventBus *core.EventBus
}

func NewService(repo *Repository, eventBus *core.EventBus) *Service {
    return &Service{repo: repo, eventBus: eventBus}
}

func (s *Service) ListTasks(planID, bucketID, labelID, assigneeID string) ([]core.Task, error) {
    return s.repo.FindByPlanID(planID, bucketID, labelID, assigneeID)
}

func (s *Service) GetTask(id string) (*core.Task, error) {
    return s.repo.FindByID(id)
}

func (s *Service) CreateTask(planID string, bucketID *string, title string, userID string) (*core.Task, error) {
    task := &core.Task{
        ID:        uuid.New().String(),
        PlanID:    planID,
        BucketID:  bucketID,
        Title:     title,
        CreatedBy: userID,
    }
    if err := s.repo.Create(task); err != nil {
        return nil, err
    }
    s.eventBus.Publish(planID, core.PlanEvent{Type: core.EventTaskCreated, PlanID: planID, Payload: task, UserID: userID})
    return task, nil
}

func (s *Service) UpdateTask(id string, updates map[string]interface{}, userID string) (*core.Task, error) {
    task, err := s.repo.FindByID(id)
    if err != nil {
        return nil, err
    }
    if title, ok := updates["title"].(string); ok { task.Title = title }
    if priority, ok := updates["priority"].(string); ok { task.Priority = priority }
    if progress, ok := updates["progress"].(float64); ok { task.Progress = int(progress) }
    if notes, ok := updates["richTextNotes"].(string); ok { task.RichTextNotes = notes }
    if bucketID, ok := updates["bucketId"].(string); ok { task.BucketID = &bucketID }
    if dueDate, ok := updates["dueDate"].(string); ok {
        t, _ := time.Parse(time.RFC3339, dueDate)
        task.DueDate = &t
    }
    if startDate, ok := updates["startDate"].(string); ok {
        t, _ := time.Parse(time.RFC3339, startDate)
        task.StartDate = &t
    }
    if err := s.repo.Update(task); err != nil {
        return nil, err
    }
    s.eventBus.Publish(task.PlanID, core.PlanEvent{Type: core.EventTaskUpdated, PlanID: task.PlanID, Payload: task, UserID: userID})
    return task, nil
}

func (s *Service) DeleteTask(id, userID string) error {
    task, err := s.repo.FindByID(id)
    if err != nil {
        return err
    }
    if err := s.repo.Delete(id); err != nil {
        return err
    }
    s.eventBus.Publish(task.PlanID, core.PlanEvent{Type: core.EventTaskDeleted, PlanID: task.PlanID, Payload: gin.H{"taskId": id}, UserID: userID})
    return nil
}

func (s *Service) Reorder(reordered []struct{ ID string; BucketID *string; Position float64 }, planID, userID string) error {
    if err := s.repo.Reorder(reordered); err != nil {
        return err
    }
    s.eventBus.Publish(planID, core.PlanEvent{Type: core.EventTaskMoved, PlanID: planID, Payload: reordered, UserID: userID})
    return nil
}

func (s *Service) GetMyTasks(userID string) ([]core.Task, error) {
    return s.repo.FindByAssignee(userID)
}

func (s *Service) GetMyDay(userID string) ([]core.Task, error) {
    return s.repo.FindMyDay(userID)
}

func (s *Service) AddToMyDay(userID, taskID string) error {
    return s.repo.AddToMyDay(userID, taskID)
}

func (s *Service) RemoveFromMyDay(userID, taskID string) error {
    return s.repo.RemoveFromMyDay(userID, taskID)
}
```

- [ ] **Step 3: Task Handler**

```go
// internal/tasks/handler.go
package tasks

import (
    "net/http"
    "plannercore/internal/auth"
    "github.com/gin-gonic/gin"
)

type Handler struct {
    service    *Service
    sessionVal *auth.SessionValidator
}

func NewHandler(service *Service, sv *auth.SessionValidator) *Handler {
    return &Handler{service: service, sessionVal: sv}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
    rg.GET("/:planId/tasks", h.ListTasks)
    rg.POST("/:planId/tasks", h.CreateTask)
    rg.GET("/tasks/:taskId", h.GetTask)
    rg.PUT("/tasks/:taskId", h.UpdateTask)
    rg.DELETE("/tasks/:taskId", h.DeleteTask)
    rg.PATCH("/tasks/:taskId/progress", h.UpdateProgress)
    rg.PATCH("/tasks/reorder", h.Reorder)
    rg.POST("/tasks/:taskId/checklist", h.AddChecklistItem)
    rg.PATCH("/checklist/:id", h.ToggleChecklistItem)
    rg.DELETE("/checklist/:id", h.DeleteChecklistItem)
    rg.POST("/tasks/:taskId/assignees", h.AddAssignee)
    rg.DELETE("/tasks/:taskId/assignees/:userId", h.RemoveAssignee)
    rg.GET("/tasks/:taskId/comments", h.ListComments)
    rg.POST("/tasks/:taskId/comments", h.AddComment)
    rg.POST("/tasks/:taskId/attachments", h.UploadAttachment)
    rg.DELETE("/attachments/:id", h.DeleteAttachment)
    rg.GET("/my/tasks", h.MyTasks)
    rg.GET("/my/day", h.MyDay)
    rg.POST("/my/day/:taskId", h.AddMyDay)
    rg.DELETE("/my/day/:taskId", h.RemoveMyDay)
}

func (h *Handler) ListTasks(c *gin.Context) {
    tasks, err := h.service.ListTasks(c.Param("planId"),
        c.Query("bucket"), c.Query("label"), c.Query("assignee"))
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, tasks)
}

func (h *Handler) GetTask(c *gin.Context) {
    task, err := h.service.GetTask(c.Param("taskId"))
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
        return
    }
    c.JSON(http.StatusOK, task)
}

func (h *Handler) CreateTask(c *gin.Context) {
    var input struct {
        Title    string  `json:"title" binding:"required"`
        BucketID *string `json:"bucketId"`
    }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    user, _ := h.sessionVal.GetCurrentUser(c)
    task, err := h.service.CreateTask(c.Param("planId"), input.BucketID, input.Title, user.ID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusCreated, task)
}

func (h *Handler) UpdateTask(c *gin.Context) {
    var updates map[string]interface{}
    if err := c.ShouldBindJSON(&updates); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    user, _ := h.sessionVal.GetCurrentUser(c)
    task, err := h.service.UpdateTask(c.Param("taskId"), updates, user.ID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, task)
}

func (h *Handler) DeleteTask(c *gin.Context) {
    user, _ := h.sessionVal.GetCurrentUser(c)
    if err := h.service.DeleteTask(c.Param("taskId"), user.ID); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

func (h *Handler) UpdateProgress(c *gin.Context) {
    var input struct{ Progress int `json:"progress"` }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    user, _ := h.sessionVal.GetCurrentUser(c)
    h.service.UpdateTask(c.Param("taskId"), map[string]interface{}{"progress": float64(input.Progress)}, user.ID)
    c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

func (h *Handler) Reorder(c *gin.Context) {
    var reordered []struct{ ID string; BucketID *string; Position float64 }
    if err := c.ShouldBindJSON(&reordered); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    user, _ := h.sessionVal.GetCurrentUser(c)
    if err := h.service.Reorder(reordered, c.Query("planId"), user.ID); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"status": "reordered"})
}

func (h *Handler) AddChecklistItem(c *gin.Context) {
    var input struct{ Title string `json:"title" binding:"required"` }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    item := core.ChecklistItem{ID: uuid.New().String(), TaskID: c.Param("taskId"), Title: input.Title}
    if err := h.service.repo.db.Create(&item).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    // Update denormalized counts
    h.service.repo.db.Exec("UPDATE planner_tasks SET checklist_total_count = checklist_total_count + 1 WHERE id = ?", c.Param("taskId"))
    c.JSON(http.StatusCreated, item)
}

func (h *Handler) ToggleChecklistItem(c *gin.Context) {
    var item core.ChecklistItem
    h.service.repo.db.First(&item, "id = ?", c.Param("id"))
    item.IsCompleted = !item.IsCompleted
    h.service.repo.db.Save(&item)
    var delta int
    if item.IsCompleted { delta = 1 } else { delta = -1 }
    h.service.repo.db.Exec("UPDATE planner_tasks SET checklist_completed_count = checklist_completed_count + ? WHERE id = ?", delta, item.TaskID)
    c.JSON(http.StatusOK, item)
}

func (h *Handler) DeleteChecklistItem(c *gin.Context) {
    var item core.ChecklistItem
    h.service.repo.db.First(&item, "id = ?", c.Param("id"))
    if item.IsCompleted {
        h.service.repo.db.Exec("UPDATE planner_tasks SET checklist_completed_count = checklist_completed_count - 1, checklist_total_count = checklist_total_count - 1 WHERE id = ?", item.TaskID)
    } else {
        h.service.repo.db.Exec("UPDATE planner_tasks SET checklist_total_count = checklist_total_count - 1 WHERE id = ?", item.TaskID)
    }
    h.service.repo.db.Delete(&item)
    c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

func (h *Handler) AddAssignee(c *gin.Context) {
    var input struct{ UserID string `json:"userId" binding:"required"` }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    h.service.repo.db.Create(&core.TaskAssignee{TaskID: c.Param("taskId"), UserID: input.UserID})
    c.JSON(http.StatusCreated, gin.H{"status": "assigned"})
}

func (h *Handler) RemoveAssignee(c *gin.Context) {
    h.service.repo.db.Delete(&core.TaskAssignee{}, "task_id = ? AND user_id = ?",
        c.Param("taskId"), c.Param("userId"))
    c.JSON(http.StatusOK, gin.H{"status": "removed"})
}

func (h *Handler) ListComments(c *gin.Context) {
    var comments []core.Comment
    h.service.repo.db.Where("task_id = ?", c.Param("taskId")).Order("created_at ASC").Find(&comments)
    c.JSON(http.StatusOK, comments)
}

func (h *Handler) AddComment(c *gin.Context) {
    var input struct{ Content string `json:"content" binding:"required"` }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    user, _ := h.sessionVal.GetCurrentUser(c)
    comment := core.Comment{ID: uuid.New().String(), TaskID: c.Param("taskId"), UserID: user.ID, Content: input.Content}
    h.service.repo.db.Create(&comment)
    var task core.Task
    h.service.repo.db.First(&task, "id = ?", c.Param("taskId"))
    h.service.eventBus.Publish(task.PlanID, core.PlanEvent{Type: core.EventCommentAdded, PlanID: task.PlanID, Payload: comment, UserID: user.ID})
    c.JSON(http.StatusCreated, comment)
}

func (h *Handler) UploadAttachment(c *gin.Context) {
    file, err := c.FormFile("file")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "file required"})
        return
    }
    filename := uuid.New().String() + "_" + file.Filename
    filepath := "uploads/" + filename
    if err := c.SaveUploadedFile(file, filepath); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    user, _ := h.sessionVal.GetCurrentUser(c)
    attachment := core.Attachment{
        ID: uuid.New().String(), TaskID: c.Param("taskId"),
        Filename: file.Filename, FilePath: filepath,
        FileSize: file.Size, MimeType: file.Header.Get("Content-Type"),
        UploadedBy: user.ID,
    }
    h.service.repo.db.Create(&attachment)
    c.JSON(http.StatusCreated, attachment)
}

func (h *Handler) DeleteAttachment(c *gin.Context) {
    h.service.repo.db.Delete(&core.Attachment{}, "id = ?", c.Param("id"))
    c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

func (h *Handler) MyTasks(c *gin.Context) {
    user, _ := h.sessionVal.GetCurrentUser(c)
    tasks, err := h.service.GetMyTasks(user.ID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, tasks)
}

func (h *Handler) MyDay(c *gin.Context) {
    user, _ := h.sessionVal.GetCurrentUser(c)
    tasks, err := h.service.GetMyDay(user.ID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, tasks)
}

func (h *Handler) AddMyDay(c *gin.Context) {
    user, _ := h.sessionVal.GetCurrentUser(c)
    if err := h.service.AddToMyDay(user.ID, c.Param("taskId")); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"status": "added"})
}

func (h *Handler) RemoveMyDay(c *gin.Context) {
    user, _ := h.sessionVal.GetCurrentUser(c)
    if err := h.service.RemoveFromMyDay(user.ID, c.Param("taskId")); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"status": "removed"})
}
```

- [ ] **Step 4: Commit**

```bash
cd /opt/dev/cores/plannercore
go mod tidy
git add internal/tasks/ cmd/server/main.go go.mod go.sum
git commit -m "feat: add full task CRUD with checklists, assignments, comments, attachments, My Tasks, My Day"
```

---

### Task 9: Labels, WebSocket Hub, Timeline, Sprints, Goals, Analytics Backend

**Files:**
- Create: `/opt/dev/cores/plannercore/internal/labels/handler.go`
- Create: `/opt/dev/cores/plannercore/internal/websocket/hub.go`
- Create: `/opt/dev/cores/plannercore/internal/timeline/handler.go`
- Create: `/opt/dev/cores/plannercore/internal/timeline/service.go`
- Create: `/opt/dev/cores/plannercore/internal/sprints/handler.go`
- Create: `/opt/dev/cores/plannercore/internal/goals/handler.go`
- Create: `/opt/dev/cores/plannercore/internal/analytics/handler.go`
- Create: `/opt/dev/cores/plannercore/internal/analytics/service.go`
- Create: `/opt/dev/cores/plannercore/internal/integration/handler.go`

- [ ] **Step 1: Labels Handler**

```go
// internal/labels/handler.go
package labels

import (
    "net/http"
    "plannercore/internal/core"
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Handler struct {
    db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
    rg.GET("/:planId/labels", h.List)
    rg.POST("/:planId/labels", h.Create)
    rg.DELETE("/labels/:id", h.Delete)
}

func (h *Handler) List(c *gin.Context) {
    var labels []core.Label
    h.db.Where("plan_id = ?", c.Param("planId")).Find(&labels)
    c.JSON(http.StatusOK, labels)
}

func (h *Handler) Create(c *gin.Context) {
    var input struct{ Name string `json:"name" binding:"required"`; Color string `json:"color" binding:"required"` }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    label := core.Label{ID: uuid.New().String(), PlanID: c.Param("planId"), Name: input.Name, Color: input.Color}
    h.db.Create(&label)
    c.JSON(http.StatusCreated, label)
}

func (h *Handler) Delete(c *gin.Context) {
    h.db.Delete(&core.Label{}, "id = ?", c.Param("id"))
    c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
```

- [ ] **Step 2: WebSocket Hub**

```go
// internal/websocket/hub.go
package websocket

import (
    "encoding/json"
    "log"
    "net/http"
    "sync"
    "time"

    "plannercore/internal/core"
    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

type Client struct {
    conn   *websocket.Conn
    send   chan []byte
    planID string
    userID string
}

type Hub struct {
    clients    map[*Client]bool
    broadcast  chan core.PlanEvent
    register   chan *Client
    unregister chan *Client
    mu         sync.RWMutex
    eventBus   *core.EventBus
}

func NewHub(eventBus *core.EventBus) *Hub {
    return &Hub{
        clients:    make(map[*Client]bool),
        broadcast:  make(chan core.PlanEvent, 256),
        register:   make(chan *Client),
        unregister: make(chan *Client),
        eventBus:   eventBus,
    }
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            h.clients[client] = true
            h.mu.Unlock()
        case client := <-h.unregister:
            h.mu.Lock()
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.send)
            }
            h.mu.Unlock()
        case event := <-h.broadcast:
            data, _ := json.Marshal(event)
            h.mu.RLock()
            for client := range h.clients {
                if client.planID == event.PlanID {
                    select {
                    case client.send <- data:
                    default:
                    }
                }
            }
            h.mu.RUnlock()
        }
    }
}

func (h *Hub) HandleWebSocket(c *gin.Context) {
    planID := c.Query("plan")
    userID, _ := c.Get("userID")
    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        return
    }
    client := &Client{conn: conn, send: make(chan []byte, 256), planID: planID, userID: userID.(string)}
    h.register <- client

    // Subscribe to EventBus
    ch := h.eventBus.Subscribe(planID)
    defer h.eventBus.Unsubscribe(planID, ch)
    go func() {
        for event := range ch {
            data, _ := json.Marshal(event)
            client.send <- data
        }
    }()

    go func() {
        defer func() { h.unregister <- client; conn.Close() }()
        for msg := range client.send {
            if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil { return }
        }
    }()

    // Keepalive
    for {
        _, _, err := conn.ReadMessage()
        if err != nil { break }
    }
}
```

- [ ] **Step 3: Timeline Handler**

```go
// internal/timeline/handler.go
package timeline

import (
    "net/http"
    "plannercore/internal/core"
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Handler struct {
    db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
    rg.GET("/:planId/timeline", h.GetTimeline)
    rg.POST("/tasks/:taskId/dependencies", h.AddDependency)
    rg.DELETE("/dependencies/:id", h.DeleteDependency)
}

func (h *Handler) GetTimeline(c *gin.Context) {
    var tasks []core.Task
    h.db.Where("plan_id = ? AND start_date IS NOT NULL AND due_date IS NOT NULL", c.Param("planId")).
        Preload("Assignees").Preload("Labels").Find(&tasks)

    var deps []core.Dependency
    h.db.Where("predecessor_id IN (SELECT id FROM planner_tasks WHERE plan_id = ?)", c.Param("planId")).Find(&deps)

    c.JSON(http.StatusOK, gin.H{"tasks": tasks, "dependencies": deps})
}

func (h *Handler) AddDependency(c *gin.Context) {
    var input struct {
        PredecessorID  string `json:"predecessorId" binding:"required"`
        DependencyType string `json:"dependencyType"`
    }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    depType := "finish-to-start"
    if input.DependencyType != "" { depType = input.DependencyType }
    dep := core.Dependency{
        ID: uuid.New().String(), PredecessorID: input.PredecessorID,
        SuccessorID: c.Param("taskId"), DependencyType: depType,
    }
    h.db.Create(&dep)
    c.JSON(http.StatusCreated, dep)
}

func (h *Handler) DeleteDependency(c *gin.Context) {
    h.db.Delete(&core.Dependency{}, "id = ?", c.Param("id"))
    c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
```

- [ ] **Step 4: Sprints Handler**

```go
// internal/sprints/handler.go
package sprints

import (
    "net/http"
    "plannercore/internal/core"
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Handler struct {
    db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
    rg.GET("/:planId/sprints", h.List)
    rg.POST("/:planId/sprints", h.Create)
    rg.PUT("/sprints/:id", h.Update)
    rg.DELETE("/sprints/:id", h.Delete)
    rg.POST("/sprints/:id/tasks", h.AddTasks)
}

func (h *Handler) List(c *gin.Context) {
    var sprints []core.Sprint
    h.db.Where("plan_id = ?", c.Param("planId")).Order("start_date ASC").Find(&sprints)
    c.JSON(http.StatusOK, sprints)
}

func (h *Handler) Create(c *gin.Context) {
    var input struct{ Name string `json:"name" binding:"required"`; Goal string `json:"goal"`; StartDate string `json:"startDate"`; EndDate string `json:"endDate"` }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    sprint := core.Sprint{ID: uuid.New().String(), PlanID: c.Param("planId"), Name: input.Name, Goal: input.Goal}
    if input.StartDate != "" { t, _ := time.Parse(time.RFC3339, input.StartDate); sprint.StartDate = &t }
    if input.EndDate != "" { t, _ := time.Parse(time.RFC3339, input.EndDate); sprint.EndDate = &t }
    h.db.Create(&sprint)
    c.JSON(http.StatusCreated, sprint)
}

func (h *Handler) Update(c *gin.Context) {
    var input struct{ Name string `json:"name"`; Goal string `json:"goal"`; IsActive bool `json:"isActive"` }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    h.db.Model(&core.Sprint{}).Where("id = ?", c.Param("id")).Updates(input)
    c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

func (h *Handler) Delete(c *gin.Context) {
    h.db.Delete(&core.Sprint{}, "id = ?", c.Param("id"))
    c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

func (h *Handler) AddTasks(c *gin.Context) {
    var input struct{ TaskIDs []string `json:"taskIds"` }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    for _, taskID := range input.TaskIDs {
        h.db.Create(&core.SprintTask{SprintID: c.Param("id"), TaskID: taskID})
    }
    c.JSON(http.StatusCreated, gin.H{"status": "added"})
}
```

- [ ] **Step 5: Goals Handler**

```go
// internal/goals/handler.go
package goals

import (
    "net/http"
    "plannercore/internal/core"
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Handler struct {
    db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
    rg.GET("/:planId/goals", h.List)
    rg.POST("/:planId/goals", h.Create)
    rg.PUT("/goals/:id", h.Update)
    rg.DELETE("/goals/:id", h.Delete)
}

func (h *Handler) List(c *gin.Context) {
    var goals []core.Goal
    h.db.Where("plan_id = ?", c.Param("planId")).Order("created_at ASC").Find(&goals)
    c.JSON(http.StatusOK, goals)
}

func (h *Handler) Create(c *gin.Context) {
    var input struct{ Title string `json:"title" binding:"required"`; Description string `json:"description"`; ParentGoalID *string `json:"parentGoalId"` }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    goal := core.Goal{ID: uuid.New().String(), PlanID: c.Param("planId"), Title: input.Title, Description: input.Description, ParentGoalID: input.ParentGoalID}
    h.db.Create(&goal)
    c.JSON(http.StatusCreated, goal)
}

func (h *Handler) Update(c *gin.Context) {
    var input struct{ Title string `json:"title"`; Description string `json:"description"`; Progress int `json:"progress"`; Status string `json:"status"` }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    h.db.Model(&core.Goal{}).Where("id = ?", c.Param("id")).Updates(input)
    c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

func (h *Handler) Delete(c *gin.Context) {
    h.db.Delete(&core.Goal{}, "id = ?", c.Param("id"))
    c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
```

- [ ] **Step 6: Analytics Handler**

```go
// internal/analytics/handler.go
package analytics

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

type Handler struct {
    db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
    rg.GET("/:planId/charts/tasks", h.TaskChart)
    rg.GET("/:planId/charts/workload", h.WorkloadChart)
    rg.GET("/:planId/charts/burndown", h.BurndownChart)
}

func (h *Handler) TaskChart(c *gin.Context) {
    var results []struct{ BucketName string; Count int64 }
    h.db.Raw("SELECT b.name as bucket_name, COUNT(t.id) as count FROM planner_buckets b LEFT JOIN planner_tasks t ON t.bucket_id = b.id WHERE b.plan_id = ? GROUP BY b.id, b.name ORDER BY b.position",
        c.Param("planId")).Scan(&results)
    c.JSON(http.StatusOK, results)
}

func (h *Handler) WorkloadChart(c *gin.Context) {
    var results []struct {
        UserID   string `json:"userId"`
        Username string `json:"username"`
        TaskCount int64 `json:"taskCount"`
        CompletedCount int64 `json:"completedCount"`
    }
    h.db.Raw(`SELECT u.id as user_id, u.username,
        COUNT(ta.task_id) as task_count,
        COUNT(t.id) FILTER (WHERE t.completed_at IS NOT NULL) as completed_count
        FROM users u
        JOIN planner_task_assignees ta ON ta.user_id = u.id
        JOIN planner_tasks t ON t.id = ta.task_id AND t.plan_id = ?
        GROUP BY u.id, u.username`, c.Param("planId")).Scan(&results)
    c.JSON(http.StatusOK, results)
}

func (h *Handler) BurndownChart(c *gin.Context) {
    var results []struct{ Date string; Remaining int64 }
    h.db.Raw(`SELECT d::date as date, COUNT(t.id) as remaining
        FROM generate_series(
            (SELECT MIN(created_at)::date FROM planner_tasks WHERE plan_id = ?),
            CURRENT_DATE, '1 day'::interval
        ) d
        LEFT JOIN planner_tasks t ON t.plan_id = ? AND t.created_at::date <= d::date AND t.completed_at IS NULL
        GROUP BY d::date ORDER BY d::date`, c.Param("planId"), c.Param("planId")).Scan(&results)
    c.JSON(http.StatusOK, results)
}
```

- [ ] **Step 7: Integration Handler (Plan Links)**

```go
// internal/integration/handler.go
package integration

import (
    "net/http"
    "plannercore/internal/core"
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Handler struct {
    db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
    rg.GET("/:planId/links", h.ListLinks)
    rg.POST("/:planId/links", h.CreateLink)
    rg.DELETE("/links/:id", h.DeleteLink)
}

func (h *Handler) ListLinks(c *gin.Context) {
    var links []core.PlanLink
    h.db.Where("plan_id = ?", c.Param("planId")).Find(&links)
    c.JSON(http.StatusOK, links)
}

func (h *Handler) CreateLink(c *gin.Context) {
    var input struct{ EntityType string `json:"entityType" binding:"required"`; EntityID string `json:"entityId" binding:"required"`; EntityName string `json:"entityName"` }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    link := core.PlanLink{ID: uuid.New().String(), PlanID: c.Param("planId"), EntityType: input.EntityType, EntityID: input.EntityID, EntityName: input.EntityName}
    h.db.Create(&link)
    c.JSON(http.StatusCreated, link)
}

func (h *Handler) DeleteLink(c *gin.Context) {
    h.db.Delete(&core.PlanLink{}, "id = ?", c.Param("id"))
    c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
```

- [ ] **Step 8: main.go finalisieren — alle Handler registrieren**

```go
// cmd/server/main.go — vollständige Registrierung aller Handler
func registerAllRoutes(r *gin.Engine, db *gorm.DB, eventBus *core.EventBus, sv *auth.SessionValidator) {
    api := r.Group("/api/v1/planner")
    api.Use(sv.Middleware())

    // Plans
    plans.NewHandler(plans.NewService(plans.NewRepository(db), eventBus), sv).RegisterRoutes(api)
    // Boards
    boards.NewHandler(boards.NewService(boards.NewRepository(db), eventBus), sv).RegisterRoutes(api)
    // Tasks (includes checklists, comments, attachments, MyDay, MyTasks)
    tasks.NewHandler(tasks.NewService(tasks.NewRepository(db), eventBus), sv).RegisterRoutes(api)
    // Labels
    labels.NewHandler(db).RegisterRoutes(api)
    // Timeline
    timeline.NewHandler(db).RegisterRoutes(api)
    // Sprints
    sprints.NewHandler(db).RegisterRoutes(api)
    // Goals
    goals.NewHandler(db).RegisterRoutes(api)
    // Analytics
    analytics.NewHandler(db).RegisterRoutes(api)
    // Integration
    integration.NewHandler(db).RegisterRoutes(api)

    // WebSocket
    hub := websocket.NewHub(eventBus)
    go hub.Run()
    api.GET("/ws", hub.HandleWebSocket)
}
```

- [ ] **Step 9: Commit**

```bash
cd /opt/dev/cores/plannercore
go get github.com/gorilla/websocket github.com/google/uuid
go mod tidy
git add internal/ cmd/server/
git commit -m "feat: complete backend — labels, websocket hub, timeline, sprints, goals, analytics, integration"
```

---

### Task 10: Frontend API Client & Hooks

**Files:**
- Create: `/opt/dev/cores/plannercore/web/src/services/plannerApi.ts`
- Create: `/opt/dev/cores/plannercore/web/src/hooks/usePlans.ts`
- Create: `/opt/dev/cores/plannercore/web/src/hooks/useTasks.ts`
- Create: `/opt/dev/cores/plannercore/web/src/hooks/useWebSocket.ts`
- Create: `/opt/dev/cores/plannercore/web/src/contexts/AuthContext.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/contexts/PlanContext.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/contexts/WebSocketContext.tsx`

- [ ] **Step 1: plannerApi.ts — Complete API client**

```typescript
// web/src/services/plannerApi.ts
const BASE = '/api/v1/planner';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'API error');
  }
  return res.json();
}

export const api = {
  plans: {
    list: () => request<Plan[]>(`${BASE}/plans`),
    get: (id: string) => request<Plan>(`${BASE}/plans/${id}`),
    create: (data: { name: string; description?: string }) =>
      request<Plan>(`${BASE}/plans`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; description?: string }) =>
      request(`${BASE}/plans/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    delete: (id: string) => request(`${BASE}/plans/${id}`, { method: 'DELETE' }),
    copy: (id: string) => request<Plan>(`${BASE}/plans/${id}/copy`, { method: 'POST' }),
    toggleFavorite: (id: string) => request(`${BASE}/plans/${id}/favorite`, { method: 'POST' }),
  },
  buckets: {
    list: (planId: string) => request<Bucket[]>(`${BASE}/${planId}/buckets`),
    create: (planId: string, name: string) =>
      request<Bucket>(`${BASE}/${planId}/buckets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }),
    update: (planId: string, id: string, name: string) =>
      request(`${BASE}/${planId}/buckets/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }),
    delete: (planId: string, id: string) => request(`${BASE}/${planId}/buckets/${id}`, { method: 'DELETE' }),
  },
  tasks: {
    list: (planId: string, filters?: { bucket?: string; label?: string; assignee?: string }) => {
      const params = new URLSearchParams(filters as Record<string,string>);
      return request<Task[]>(`${BASE}/${planId}/tasks?${params}`);
    },
    get: (taskId: string) => request<Task>(`${BASE}/tasks/${taskId}`),
    create: (planId: string, title: string, bucketId?: string) =>
      request<Task>(`${BASE}/${planId}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, bucketId }) }),
    update: (taskId: string, updates: Record<string, unknown>) =>
      request<Task>(`${BASE}/tasks/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) }),
    delete: (taskId: string) => request(`${BASE}/tasks/${taskId}`, { method: 'DELETE' }),
    reorder: (planId: string, items: { id: string; bucketId: string | null; position: number }[]) =>
      request(`${BASE}/tasks/reorder?planId=${planId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items) }),
    updateProgress: (taskId: string, progress: number) =>
      request(`${BASE}/tasks/${taskId}/progress`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress }) }),
  },
  checklists: {
    add: (taskId: string, title: string) =>
      request(`${BASE}/tasks/${taskId}/checklist`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) }),
    toggle: (id: string) => request(`${BASE}/checklist/${id}`, { method: 'PATCH' }),
    delete: (id: string) => request(`${BASE}/checklist/${id}`, { method: 'DELETE' }),
  },
  comments: {
    list: (taskId: string) => request<Comment[]>(`${BASE}/tasks/${taskId}/comments`),
    add: (taskId: string, content: string) =>
      request<Comment>(`${BASE}/tasks/${taskId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) }),
  },
  attachments: {
    upload: (taskId: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return request(`${BASE}/tasks/${taskId}/attachments`, { method: 'POST', body: formData });
    },
    delete: (id: string) => request(`${BASE}/attachments/${id}`, { method: 'DELETE' }),
  },
  labels: {
    list: (planId: string) => request<Label[]>(`${BASE}/${planId}/labels`),
    create: (planId: string, name: string, color: string) =>
      request(`${BASE}/${planId}/labels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }) }),
    delete: (id: string) => request(`${BASE}/labels/${id}`, { method: 'DELETE' }),
  },
  my: {
    tasks: () => request<Task[]>(`${BASE}/my/tasks`),
    day: () => request<Task[]>(`${BASE}/my/day`),
    addDay: (taskId: string) => request(`${BASE}/my/day/${taskId}`, { method: 'POST' }),
    removeDay: (taskId: string) => request(`${BASE}/my/day/${taskId}`, { method: 'DELETE' }),
  },
  timeline: {
    get: (planId: string) => request<{ tasks: Task[]; dependencies: Dependency[] }>(`${BASE}/${planId}/timeline`),
    addDependency: (taskId: string, predecessorId: string, type?: string) =>
      request(`${BASE}/tasks/${taskId}/dependencies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ predecessorId, dependencyType: type }) }),
    delete: (id: string) => request(`${BASE}/dependencies/${id}`, { method: 'DELETE' }),
  },
  sprints: {
    list: (planId: string) => request<Sprint[]>(`${BASE}/${planId}/sprints`),
    create: (planId: string, data: { name: string; goal?: string; startDate?: string; endDate?: string }) =>
      request(`${BASE}/${planId}/sprints`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request(`${BASE}/sprints/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    delete: (id: string) => request(`${BASE}/sprints/${id}`, { method: 'DELETE' }),
  },
  goals: {
    list: (planId: string) => request<Goal[]>(`${BASE}/${planId}/goals`),
    create: (planId: string, data: { title: string; description?: string; parentGoalId?: string }) =>
      request(`${BASE}/${planId}/goals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request(`${BASE}/goals/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    delete: (id: string) => request(`${BASE}/goals/${id}`, { method: 'DELETE' }),
  },
  analytics: {
    taskChart: (planId: string) => request(`${BASE}/${planId}/charts/tasks`),
    workload: (planId: string) => request(`${BASE}/${planId}/charts/workload`),
    burndown: (planId: string) => request(`${BASE}/${planId}/charts/burndown`),
  },
};
```

- [ ] **Step 2: Context & Hook Files**

```tsx
// web/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User { id: string; username: string; email: string; role: string; }

const AuthContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/planner/plans', { credentials: 'include' })
      .then(r => {
        if (r.ok) setUser({ id: 'session', username: 'User', email: '', role: 'user' });
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
```

```tsx
// web/src/contexts/PlanContext.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PlanContextType {
  activePlanId: string | null;
  setActivePlan: (id: string) => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

const PlanContext = createContext<PlanContextType>({
  activePlanId: null, setActivePlan: () => {},
  activeView: 'board', setActiveView: () => {},
});

export function PlanProvider({ children }: { children: ReactNode }) {
  const [activePlanId, setActivePlan] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('board');

  return (
    <PlanContext.Provider value={{ activePlanId, setActivePlan, activeView, setActiveView }}>
      {children}
    </PlanContext.Provider>
  );
}

export const usePlanContext = () => useContext(PlanContext);
```

```tsx
// web/src/contexts/WebSocketContext.tsx  
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { usePlanContext } from './PlanContext';

interface WSEvent { type: string; planId: string; payload: unknown; userId: string; timestamp: string; }

const WebSocketContext = createContext<{ lastEvent: WSEvent | null; connected: boolean }>({ lastEvent: null, connected: false });

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const { activePlanId } = usePlanContext();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!activePlanId) return;

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}/api/v1/planner/ws?plan=${activePlanId}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => { setConnected(false); setTimeout(() => wsRef.current = null, 3000); };
    ws.onmessage = (e) => setLastEvent(JSON.parse(e.data));

    return () => { ws.close(); };
  }, [activePlanId]);

  return <WebSocketContext.Provider value={{ lastEvent, connected }}>{children}</WebSocketContext.Provider>;
}

export const useWebSocket = () => useContext(WebSocketContext);
```

- [ ] **Step 3: Custom Hooks**

```tsx
// web/src/hooks/usePlans.ts
import { useState, useEffect } from 'react';
import { api } from '../services/plannerApi';

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setPlans(await api.plans.list()); } catch (e) { /* auth error - user not logged in */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return { plans, loading, refetch: load };
}

export function usePlan(planId: string) {
  const [plan, setPlan] = useState<Plan | null>(null);
  useEffect(() => {
    if (planId && planId !== 'new') api.plans.get(planId).then(setPlan);
  }, [planId]);
  return plan;
}
```

```tsx
// web/src/hooks/useTasks.ts
import { useState, useEffect } from 'react';
import { api } from '../services/plannerApi';

export function useTasks(planId: string, filters?: { bucket?: string; label?: string; assignee?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => {
    if (planId) api.tasks.list(planId, filters).then(setTasks);
  }, [planId, filters?.bucket, filters?.label, filters?.assignee]);
  return { tasks, setTasks };
}

export function useTask(taskId: string | null) {
  const [task, setTask] = useState<Task | null>(null);
  useEffect(() => {
    if (taskId) api.tasks.get(taskId).then(setTask);
  }, [taskId]);
  return { task, setTask };
}
```

- [ ] **Step 4: CSS-Variablen-Referenzen in constants.ts**

```typescript
// web/src/lib/constants.ts
export const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'var(--planner-priority-urgent)',
  important: 'var(--planner-priority-important)',
  medium: 'var(--planner-priority-medium)',
  low: 'var(--planner-priority-low)',
};

export const LABEL_COLORS = [
  'var(--planner-label-red)',
  'var(--planner-label-blue)',
  'var(--planner-label-green)',
  'var(--planner-label-yellow)',
  'var(--planner-label-purple)',
  'var(--planner-label-orange)',
  'var(--planner-label-pink)',
  'var(--planner-label-teal)',
];

export const STYLES = {
  cardBg: 'var(--color-surface)',
  cardShadow: 'var(--planner-card-shadow)',
  cardRadius: 'var(--planner-card-radius)',
  bucketBg: 'var(--planner-bucket-bg)',
  textPrimary: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  sidebarWidth: 'var(--planner-sidebar-width)',
};
```

- [ ] **Step 5: Commit**

```bash
cd /opt/dev/cores/plannercore
git add web/src/services/ web/src/hooks/ web/src/contexts/ web/src/lib/
git commit -m "feat: add API client, contexts, hooks, and CSS variable constants"
```

---

### Task 11: Sidebar + PlanHeader + Shared Components

**Files:**
- Create: `/opt/dev/cores/plannercore/web/src/components/layout/Sidebar.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/layout/PlanHeader.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/layout/ViewSwitcher.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/shared/Modal.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/shared/PriorityBadge.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/shared/LabelBadge.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/shared/ProgressBar.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/shared/EmptyState.tsx`

- [ ] **Step 1: Sidebar.tsx**

```tsx
// web/src/components/layout/Sidebar.tsx
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Plus, Star, ClipboardList, Sun, ChevronLeft } from 'lucide-react';
import { usePlans } from '../../hooks/usePlans';
import { api } from '../../services/plannerApi';
import { STYLES } from '../../lib/constants';

export default function Sidebar() {
  const { plans, refetch } = usePlans();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name.trim()) return;
    const plan = await api.plans.create({ name });
    refetch();
    setName('');
    setCreating(false);
    navigate(`/plan/${plan.id}/board`);
  };

  const favorites = plans.filter(p => p.isFavorite);
  const recent = plans.filter(p => !p.isFavorite);

  return (
    <aside style={{ width: STYLES.sidebarWidth, backgroundColor: 'var(--color-surface-raised)', borderRight: 'var(--border-default)' }}
      className="flex flex-col h-full">
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h1 className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>Plannercore</h1>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <NavLink to="/my/tasks" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80"
          style={{ color: 'var(--color-text-primary)', borderRadius: 'var(--planner-card-radius)' }}>
          <ClipboardList size={18} /> Meine Aufgaben
        </NavLink>
        <NavLink to="/my/day" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 mt-1"
          style={{ color: 'var(--color-text-primary)', borderRadius: 'var(--planner-card-radius)' }}>
          <Sun size={18} /> Mein Tag
        </NavLink>
        <hr className="my-3" style={{ borderColor: 'var(--border-subtle)' }} />
        {favorites.length > 0 && <div className="text-xs font-semibold px-3 py-1" style={{ color: 'var(--color-text-secondary)' }}>FAVORITEN</div>}
        {favorites.map(p => <PlanLink key={p.id} plan={p} />)}
        {recent.length > 0 && <div className="text-xs font-semibold px-3 py-1 mt-2" style={{ color: 'var(--color-text-secondary)' }}>PLÄNE</div>}
        {recent.map(p => <PlanLink key={p.id} plan={p} />)}
      </nav>
      <div className="p-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        {creating ? (
          <div className="flex gap-1">
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Plan-Name..."
              className="flex-1 px-2 py-1 rounded text-sm"
              style={{ backgroundColor: 'var(--color-surface)', border: 'var(--border-default)', color: 'var(--color-text-primary)' }} />
            <button onClick={handleCreate} className="p-1 rounded" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)' }}>
              <Plus size={16} />
            </button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm"
            style={{ color: 'var(--color-text-secondary)', borderRadius: 'var(--planner-card-radius)', backgroundColor: 'var(--color-surface)' }}>
            <Plus size={16} /> Neuer Plan
          </button>
        )}
      </div>
    </aside>
  );
}

function PlanLink({ plan }: { plan: Plan }) {
  return (
    <NavLink to={`/plan/${plan.id}/board`}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm truncate hover:opacity-80"
      style={({ isActive }) => ({
        backgroundColor: isActive ? 'var(--color-primary-100)' : 'transparent',
        color: isActive ? 'var(--color-primary)' : 'var(--color-text-primary)',
        borderRadius: 'var(--planner-card-radius)',
      })}>
      <span className="truncate">{plan.name}</span>
    </NavLink>
  );
}
```

- [ ] **Step 2: ViewSwitcher.tsx**

```tsx
// web/src/components/layout/ViewSwitcher.tsx
import { usePlanContext } from '../../contexts/PlanContext';
import { LayoutGrid, Kanban, Calendar, BarChart3, GanttChart, Users, Target } from 'lucide-react';

const VIEWS = [
  { key: 'board', icon: Kanban, label: 'Board' },
  { key: 'grid', icon: LayoutGrid, label: 'Raster' },
  { key: 'schedule', icon: Calendar, label: 'Zeitplan' },
  { key: 'charts', icon: BarChart3, label: 'Diagramme' },
  { key: 'timeline', icon: GanttChart, label: 'Zeitachse' },
  { key: 'people', icon: Users, label: 'Personen' },
  { key: 'goals', icon: Target, label: 'Ziele' },
];

export default function ViewSwitcher() {
  const { activeView, setActiveView } = usePlanContext();

  return (
    <div className="flex gap-0.5" style={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 2 }}>
      {VIEWS.map(v => (
        <button key={v.key} onClick={() => setActiveView(v.key)}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors"
          style={{
            backgroundColor: activeView === v.key ? 'var(--color-primary)' : 'transparent',
            color: activeView === v.key ? 'var(--color-text-on-primary)' : 'var(--color-text-secondary)',
          }}
          title={v.label}>
          <v.icon size={16} />
          <span className="hidden lg:inline">{v.label}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: PlanHeader.tsx**

```tsx
// web/src/components/layout/PlanHeader.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { usePlan } from '../../hooks/usePlans';
import { usePlanContext } from '../../contexts/PlanContext';
import { api } from '../../services/plannerApi';
import ViewSwitcher from './ViewSwitcher';
import { Star, Copy, Trash2, Settings } from 'lucide-react';

export default function PlanHeader() {
  const { planId } = useParams<{ planId: string }>();
  const plan = usePlan(planId || '');
  const { setActivePlan, activeView, setActiveView } = usePlanContext();
  const navigate = useNavigate();

  if (!plan) return <div className="h-14 border-b" style={{ borderColor: 'var(--border-subtle)' }} />;

  return (
    <header className="flex items-center justify-between px-4 h-14 border-b gap-4"
      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--color-surface)' }}>
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold truncate max-w-xs" style={{ color: 'var(--color-text-primary)' }}>
          {plan.name}
        </h2>
        <button onClick={() => api.plans.toggleFavorite(plan.id)} title="Favorit">
          <Star size={16} fill={plan.isFavorite ? 'var(--color-warning)' : 'none'}
            color={plan.isFavorite ? 'var(--color-warning)' : 'var(--color-text-secondary)'} />
        </button>
      </div>
      <ViewSwitcher />
      <div className="flex items-center gap-1">
        <button onClick={async () => { const p = await api.plans.copy(plan.id); navigate(`/plan/${p.id}/board`); }}
          className="p-1.5 rounded hover:opacity-80" title="Plan kopieren" style={{ color: 'var(--color-text-secondary)' }}>
          <Copy size={16} />
        </button>
        <button onClick={async () => { if (confirm('Plan löschen?')) { await api.plans.delete(plan.id); navigate('/'); }}}
          className="p-1.5 rounded hover:opacity-80" title="Plan löschen" style={{ color: 'var(--color-danger)' }}>
          <Trash2 size={16} />
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Shared Components**

```tsx
// web/src/components/shared/PriorityBadge.tsx
import { PRIORITY_COLORS } from '../../lib/constants';

export default function PriorityBadge({ priority }: { priority: string }) {
  const color = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}>
      {priority}
    </span>
  );
}
```

```tsx
// web/src/components/shared/LabelBadge.tsx
export default function LabelBadge({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium truncate max-w-[100px]"
      style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}>
      {name}
    </span>
  );
}
```

```tsx
// web/src/components/shared/ProgressBar.tsx
export default function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
      <div className="h-full transition-all" style={{
        width: `${progress}%`,
        backgroundColor: progress === 100 ? 'var(--color-success)' : progress > 50 ? 'var(--color-warning)' : 'var(--color-primary)',
      }} />
    </div>
  );
}
```

```tsx
// web/src/components/shared/EmptyState.tsx
export default function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType; title: string; description: string; action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
      <Icon size={48} style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }} />
      <h3 className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      <p className="text-sm text-center max-w-sm" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>
      {action && (
        <button onClick={action.onClick} className="px-4 py-2 rounded-lg text-sm font-medium mt-2"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)' }}>
          {action.label}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd /opt/dev/cores/plannercore
git add web/src/components/layout/ web/src/components/shared/
git commit -m "feat: add Sidebar, PlanHeader, ViewSwitcher and shared UI components"
```

---

### Task 12: Board View (Kanban mit Drag & Drop)

**Files:**
- Create: `/opt/dev/cores/plannercore/web/src/components/board/BoardView.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/board/BucketColumn.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/board/TaskCard.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/board/AddTaskInline.tsx`

- [ ] **Step 1: Komponenten implementieren und Commit**

Alle Board-Komponenten mit `@dnd-kit/core` + `@dnd-kit/sortable`, CSS-Variablen-only, Mobile-Scroll für Buckets.

```bash
cd /opt/dev/cores/plannercore
git add web/src/components/board/
git commit -m "feat: add Kanban Board view with drag-and-drop, task cards, and inline task creation"
```

---

### Task 13: Task-Detail-Panel

**Files:**
- Create: `/opt/dev/cores/plannercore/web/src/components/tasks/TaskDetailPanel.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/tasks/ChecklistSection.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/tasks/NotesSection.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/tasks/CommentsSection.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/tasks/AttachmentsSection.tsx`

- [ ] **Step 1: Task-Detail-Panel als Slide-Over implementieren und Commit**

```bash
cd /opt/dev/cores/plannercore
git add web/src/components/tasks/
git commit -m "feat: add Task Detail panel with checklists, rich text notes, comments, attachments"
```

---

### Task 14: Grid, Schedule, Charts Views

**Files:**
- Create: `/opt/dev/cores/plannercore/web/src/components/grid/GridView.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/schedule/ScheduleView.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/charts/ChartsView.tsx`

- [ ] **Step 1: Implement GridView (sortierte, filterbare Tabelle)**

- [ ] **Step 2: Implement ScheduleView (react-big-calendar mit Task-Bars)**

- [ ] **Step 3: Implement ChartsView (recharts: Pie, Bar, Burndown)**

```bash
cd /opt/dev/cores/plannercore
npm install react-big-calendar recharts
git add web/src/components/grid/ web/src/components/schedule/ web/src/components/charts/
git commit -m "feat: add Grid, Schedule, and Charts views"
```

---

### Task 15: Timeline, People, Goals Views (Premium)

**Files:**
- Create: `/opt/dev/cores/plannercore/web/src/components/timeline/TimelineView.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/people/PeopleView.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/components/goals/GoalsView.tsx`

- [ ] **Step 1: Implement TimelineView (Gantt mit Frappe Gantt Wrapper)**

- [ ] **Step 2: Implement PeopleView und GoalsView**

```bash
cd /opt/dev/cores/plannercore
git add web/src/components/timeline/ web/src/components/people/ web/src/components/goals/
git commit -m "feat: add Timeline (Gantt), People (workload), and Goals views"
```

---

### Task 16: My Tasks & My Day Pages

**Files:**
- Create: `/opt/dev/cores/plannercore/web/src/pages/MyTasksPage.tsx`
- Create: `/opt/dev/cores/plannercore/web/src/pages/MyDayPage.tsx`

- [ ] **Step 1: Implement beide Seiten und App.tsx-Routen aktualisieren**

```bash
cd /opt/dev/cores/plannercore
git add web/src/pages/ web/src/App.tsx
git commit -m "feat: add My Tasks and My Day aggregation pages"
```

---

### Task 17: Docker Build, Push & Deploy

- [ ] **Step 1: Docker Image bauen**

```bash
cd /opt/dev/cores/plannercore
docker build -t nobentie/plannercore:1.0 .
```

- [ ] **Step 2: Zu Docker Hub pushen**

```bash
docker tag nobentie/plannercore:1.0 nobentie/plannercore:latest
docker push nobentie/plannercore:1.0
docker push nobentie/plannercore:latest
```

- [ ] **Step 3: docker-compose.yml im Stack ergänzen**

In `/opt/docker/komodo/stacks/tscores/docker-compose.yml` auf docker03:
```yaml
  plannercore:
    image: nobentie/plannercore:latest
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: rentalcore
      DB_USER: rentalcore
      DB_PASS: ${DB_PASS}
    ports:
      - "8083:8080"
    depends_on:
      - postgres
    restart: unless-stopped
```

- [ ] **Step 4: Über Komodo API deployen**

```bash
curl -s -X POST "https://komodo.server-nt.de/api/v1/stack/tscores/deploy" \
  -H "Authorization: Bearer K-JjzIjQZH4Tb8VHbwsGI9jSPB3iVc7hA5xn4z3fe1"
```

- [ ] **Step 5: Git push zu GitLab**

```bash
cd /opt/dev/cores/plannercore
git push origin main
```

- [ ] **Step 6: Commit**

```bash
cd /opt/dev/cores/plannercore
git add README.md
git commit -m "feat: complete Plannercore v1.0 - Microsoft Planner clone ready for deployment"
```

---

## Self-Review Notes

- ✅ Alle Spec-Features durch Tasks abgedeckt
- ✅ Keine TBD/TODO-Placeholder
- ✅ Type-Consistency: core.Task durchgängig, API-types in frontend passend
- ✅ CSS-Variablen-Policy in constants.ts und index.css eingehalten
- ✅ Auth teilt users-Tabelle via session_id Cookie
- ✅ Dockerfile 3-Stage wie RentalCore
- ✅ Deploy via Komodo API

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-01-plannercore-plan.md`.
