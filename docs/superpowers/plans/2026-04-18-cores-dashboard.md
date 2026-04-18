# Cores Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new `cores-dashboard` service (port 8080) as central SSO hub with login, analytics, and global admin for RentalCore and WarehouseCore.

**Architecture:** New Go + React service on port 8080 shares `CORES_JWT_SECRET` with both cores. Dashboard issues a `cores_token` JWT cookie on login; both cores extend their auth middleware to accept it in parallel with their existing `session_id` cookies. The dashboard proxies admin API calls internally to both cores.

**Tech Stack:** Go 1.24 (net/http), React 19 + Vite 7 + TypeScript, Tailwind v4, `github.com/golang-jwt/jwt/v5`, axios, lucide-react, react-router-dom v7

---

## File Map

### New: `cores-dashboard/`

| File | Responsibility |
|---|---|
| `cmd/server/main.go` | HTTP server setup, routing, static file serving |
| `internal/config/config.go` | Load env vars (CORES_JWT_SECRET, RENTALCORE_URL, WAREHOUSECORE_URL, DB_*) |
| `internal/middleware/jwt.go` | Validate `cores_token` cookie, inject user into request context |
| `internal/handlers/auth.go` | `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` |
| `internal/handlers/analytics.go` | `GET /api/v1/analytics/summary` — aggregates data from both cores |
| `internal/handlers/admin_proxy.go` | `ANY /api/v1/proxy/rental/*` and `ANY /api/v1/proxy/warehouse/*` — forward requests to cores |
| `go.mod` | Module `coresdashboard` |
| `Dockerfile` | Two-stage build: Node (frontend) + Go (backend) |
| `web/package.json` | Same deps as warehousecore/web |
| `web/vite.config.ts` | Dev proxy to `:8080` |
| `web/tailwind.config.js` | Identical to warehousecore/web/tailwind.config.js |
| `web/index.html` | Title: "Cores" |
| `web/src/main.tsx` | React entry point |
| `web/src/App.tsx` | Routes: `/login`, `/`, `/admin` |
| `web/src/index.css` | Identical to warehousecore/web/src/index.css |
| `web/src/contexts/AuthContext.tsx` | Auth state, login/logout/me calls |
| `web/src/components/ProtectedRoute.tsx` | Redirect to `/login` if not authed |
| `web/src/components/Layout.tsx` | Sidebar: Dashboard, Admin; user info; logout |
| `web/src/lib/api.ts` | axios instance pointing to `/api/v1` |
| `web/src/pages/Login.tsx` | Glassmorphism login (glow + blur card) |
| `web/src/pages/Dashboard.tsx` | Two hub cards + analytics grid |
| `web/src/pages/AdminPage.tsx` | Combined admin tabs via proxy API |
| `web/src/components/admin/` | All admin tab components (adapted from warehousecore) |

### Modified: `rentalcore/`

| File | Change |
|---|---|
| `internal/handlers/auth_handler.go` | `AuthMiddleware`: accept `cores_token` cookie in addition to `session_id` |
| `web/src/App.tsx` | Remove `/admin` route |
| `web/src/pages/AdminPage.tsx` | Delete file |
| `web/src/components/Layout.tsx` | Add `← Cores` link at top of sidebar; rename cross-nav link |

### Modified: `warehousecore/`

| File | Change |
|---|---|
| `internal/middleware/auth.go` | `AuthMiddleware`: accept `cores_token` cookie in addition to `session_id` |
| `web/src/App.tsx` | Remove `/admin` route |
| `web/src/pages/AdminPage.tsx` | Delete file |
| `web/src/components/Layout.tsx` | Add `← Cores` link at top of sidebar; rename cross-nav link |

### Modified: root

| File | Change |
|---|---|
| `docker-compose.yml` | Add `cores-dashboard` service |

---

## Task 1: Go Backend — Project scaffold

**Files:**
- Create: `cores-dashboard/go.mod`
- Create: `cores-dashboard/internal/config/config.go`
- Create: `cores-dashboard/cmd/server/main.go`

- [ ] **Step 1: Create go.mod**

```
# File: cores-dashboard/go.mod
module coresdashboard

go 1.24.0

require (
	github.com/golang-jwt/jwt/v5 v5.2.2
	golang.org/x/crypto v0.37.0
	gorm.io/driver/postgres v1.5.11
	gorm.io/gorm v1.25.12
)
```

Run from `cores-dashboard/`:
```bash
go mod tidy
```
Expected: `go.sum` created, dependencies downloaded.

- [ ] **Step 2: Create config.go**

```go
// File: cores-dashboard/internal/config/config.go
package config

import "os"

type Config struct {
	Port             string
	JWTSecret        string
	RentalCoreURL    string
	WarehouseCoreURL string
	DBHost           string
	DBPort           string
	DBName           string
	DBUser           string
	DBPassword       string
	DBSSLMode        string
}

func Load() *Config {
	return &Config{
		Port:             getEnv("PORT", "8080"),
		JWTSecret:        getEnv("CORES_JWT_SECRET", "dev-secret-change-me"),
		RentalCoreURL:    getEnv("RENTALCORE_URL", "http://localhost:8081"),
		WarehouseCoreURL: getEnv("WAREHOUSECORE_URL", "http://localhost:8082"),
		DBHost:           getEnv("DB_HOST", "localhost"),
		DBPort:           getEnv("DB_PORT", "5432"),
		DBName:           getEnv("DB_NAME", "rentalcore"),
		DBUser:           getEnv("DB_USER", "rentalcore"),
		DBPassword:       getEnv("DB_PASSWORD", "rentalcore123"),
		DBSSLMode:        getEnv("DB_SSLMODE", "disable"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
```

- [ ] **Step 3: Create main.go skeleton**

```go
// File: cores-dashboard/cmd/server/main.go
package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"

	"coresdashboard/internal/config"
	"coresdashboard/internal/handlers"
	"coresdashboard/internal/middleware"
)

//go:embed all:dist
var staticFiles embed.FS

func main() {
	cfg := config.Load()

	mux := http.NewServeMux()

	// Auth endpoints (no auth required)
	authHandler := handlers.NewAuthHandler(cfg)
	mux.HandleFunc("POST /api/v1/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/v1/auth/logout", authHandler.Logout)

	// Protected API endpoints
	analyticsHandler := handlers.NewAnalyticsHandler(cfg)
	proxyHandler := handlers.NewAdminProxyHandler(cfg)

	protected := middleware.RequireAuth(cfg, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/api/v1/auth/me":
			authHandler.Me(w, r)
		case len(r.URL.Path) >= 20 && r.URL.Path[:20] == "/api/v1/analytics/su":
			analyticsHandler.Summary(w, r)
		case len(r.URL.Path) >= 22 && r.URL.Path[:22] == "/api/v1/proxy/rental/":
			proxyHandler.ProxyRental(w, r)
		case len(r.URL.Path) >= 25 && r.URL.Path[:25] == "/api/v1/proxy/warehouse/":
			proxyHandler.ProxyWarehouse(w, r)
		default:
			http.NotFound(w, r)
		}
	}))
	mux.Handle("/api/v1/auth/me", protected)
	mux.Handle("/api/v1/analytics/", protected)
	mux.Handle("/api/v1/proxy/", protected)

	// Serve React SPA from embedded dist/
	distFS, err := fs.Sub(staticFiles, "dist")
	if err != nil {
		log.Fatal("failed to create sub FS:", err)
	}
	fileServer := http.FileServer(http.FS(distFS))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Try file, fall back to index.html for SPA routing
		if r.URL.Path != "/" {
			f, err := distFS.Open(r.URL.Path[1:])
			if err == nil {
				f.Close()
				fileServer.ServeHTTP(w, r)
				return
			}
		}
		// Serve index.html for all other paths (SPA)
		idx, _ := staticFiles.ReadFile("dist/index.html")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(idx)
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("cores-dashboard listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
```

Note: The `dist/` directory will be built by the Dockerfile. For local development, create an empty `cores-dashboard/cmd/server/dist/.gitkeep`.

- [ ] **Step 4: Create dist placeholder**

```bash
mkdir -p /opt/dev/cores/cores-dashboard/cmd/server/dist
touch /opt/dev/cores/cores-dashboard/cmd/server/dist/.gitkeep
```

- [ ] **Step 5: Verify build compiles (stubs needed first — skip to Task 2 then return)**

After Tasks 2-4 are done, run from `cores-dashboard/`:
```bash
go build ./cmd/server/
```
Expected: `server` binary created.

- [ ] **Step 6: Commit**

```bash
cd /opt/dev/cores
git add cores-dashboard/
git commit -m "feat: add cores-dashboard Go backend scaffold"
```

---

## Task 2: JWT Middleware + Auth Handler

**Files:**
- Create: `cores-dashboard/internal/middleware/jwt.go`
- Create: `cores-dashboard/internal/handlers/auth.go`
- Create: `cores-dashboard/internal/models/user.go`

- [ ] **Step 1: Create user model**

```go
// File: cores-dashboard/internal/models/user.go
package models

import "time"

// User mirrors the shared users table in PostgreSQL.
// Both RentalCore and WarehouseCore use the same table.
type User struct {
	UserID        uint      `gorm:"column:userID;primaryKey"`
	Username      string    `gorm:"column:username"`
	PasswordHash  string    `gorm:"column:password_hash"`
	Email         string    `gorm:"column:email"`
	IsActive      bool      `gorm:"column:is_active"`
	ForcePassword bool      `gorm:"column:force_password_change"`
	CreatedAt     time.Time `gorm:"column:created_at"`
}

func (User) TableName() string { return "users" }

type Role struct {
	RoleID uint   `gorm:"column:role_id;primaryKey"`
	Name   string `gorm:"column:name"`
}

func (Role) TableName() string { return "roles" }
```

- [ ] **Step 2: Create JWT middleware**

```go
// File: cores-dashboard/internal/middleware/jwt.go
package middleware

import (
	"context"
	"net/http"

	"coresdashboard/internal/config"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserClaimsKey = contextKey("claims")

type Claims struct {
	UserID   uint   `json:"uid"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
	jwt.RegisteredClaims
}

func RequireAuth(cfg *config.Config, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("cores_token")
		if err != nil || cookie.Value == "" {
			http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(cookie.Value, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWTSecret), nil
		})
		if err != nil || !token.Valid {
			http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), UserClaimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetClaims(r *http.Request) (*Claims, bool) {
	c, ok := r.Context().Value(UserClaimsKey).(*Claims)
	return c, ok
}
```

- [ ] **Step 3: Create database helper**

```go
// File: cores-dashboard/internal/database/db.go
package database

import (
	"fmt"

	"coresdashboard/internal/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Connect(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode,
	)
	return gorm.Open(postgres.Open(dsn), &gorm.Config{})
}
```

- [ ] **Step 4: Create auth handler**

```go
// File: cores-dashboard/internal/handlers/auth.go
package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"coresdashboard/internal/config"
	"coresdashboard/internal/database"
	"coresdashboard/internal/middleware"
	"coresdashboard/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	cfg *config.Config
}

func NewAuthHandler(cfg *config.Config) *AuthHandler {
	return &AuthHandler{cfg: cfg}
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request", http.StatusBadRequest)
		return
	}

	db, err := database.Connect(h.cfg)
	if err != nil {
		jsonError(w, "Database unavailable", http.StatusInternalServerError)
		return
	}

	var user models.User
	if err := db.Where("username = ? AND is_active = ?", req.Username, true).First(&user).Error; err != nil {
		jsonError(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		jsonError(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Determine if user has admin/manager role
	var roleCount int64
	db.Table("user_roles ur").
		Joins("JOIN roles r ON r.role_id = ur.role_id").
		Where("ur.user_id = ? AND r.name IN ?", user.UserID, []string{"admin", "manager"}).
		Count(&roleCount)

	claims := &middleware.Claims{
		UserID:   user.UserID,
		Username: user.Username,
		IsAdmin:  roleCount > 0,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(h.cfg.JWTSecret))
	if err != nil {
		jsonError(w, "Token error", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "cores_token",
		Value:    signed,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   86400,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"username": user.Username,
		"is_admin": roleCount > 0,
		"force_password_change": user.ForcePassword,
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "cores_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
	})
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims, _ := middleware.GetClaims(r)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user_id":  claims.UserID,
		"username": claims.Username,
		"is_admin": claims.IsAdmin,
	})
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
```

- [ ] **Step 5: Update main.go imports and add DB injection**

Update `cores-dashboard/cmd/server/main.go` — replace the `main()` body so the DB is connected once and passed to handlers:

```go
func main() {
	cfg := config.Load()

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal("DB connect failed:", err)
	}

	mux := http.NewServeMux()

	authHandler := handlers.NewAuthHandler(cfg, db)
	analyticsHandler := handlers.NewAnalyticsHandler(cfg)
	proxyHandler := handlers.NewAdminProxyHandler(cfg)

	mux.HandleFunc("POST /api/v1/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/v1/auth/logout", authHandler.Logout)

	protected := middleware.RequireAuth(cfg, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/api/v1/auth/me":
			authHandler.Me(w, r)
		case r.URL.Path == "/api/v1/analytics/summary":
			analyticsHandler.Summary(w, r)
		default:
			if len(r.URL.Path) > 21 && r.URL.Path[:21] == "/api/v1/proxy/rental" {
				proxyHandler.ProxyRental(w, r)
			} else if len(r.URL.Path) > 24 && r.URL.Path[:24] == "/api/v1/proxy/warehouse" {
				proxyHandler.ProxyWarehouse(w, r)
			} else {
				http.NotFound(w, r)
			}
		}
	}))
	mux.Handle("/api/v1/auth/me", protected)
	mux.Handle("/api/v1/analytics/", protected)
	mux.Handle("/api/v1/proxy/", protected)

	distFS, err := fs.Sub(staticFiles, "dist")
	if err != nil {
		log.Fatal(err)
	}
	fileServer := http.FileServer(http.FS(distFS))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			f, err := distFS.Open(r.URL.Path[1:])
			if err == nil {
				f.Close()
				fileServer.ServeHTTP(w, r)
				return
			}
		}
		idx, _ := staticFiles.ReadFile("dist/index.html")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(idx)
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("cores-dashboard listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
```

Also update `NewAuthHandler` signature to accept `db *gorm.DB` and store it:

```go
type AuthHandler struct {
	cfg *config.Config
	db  *gorm.DB
}

func NewAuthHandler(cfg *config.Config, db *gorm.DB) *AuthHandler {
	return &AuthHandler{cfg: cfg, db: db}
}
```

Replace all `database.Connect(h.cfg)` calls in `Login` with `h.db`.

- [ ] **Step 6: Commit**

```bash
cd /opt/dev/cores
git add cores-dashboard/
git commit -m "feat: add cores-dashboard JWT auth middleware and login handler"
```

---

## Task 3: Analytics Aggregation Handler

**Files:**
- Create: `cores-dashboard/internal/handlers/analytics.go`

The handler calls both cores' internal APIs using the `cores_token` cookie from the request, then merges the responses.

- [ ] **Step 1: Create analytics handler**

```go
// File: cores-dashboard/internal/handlers/analytics.go
package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"coresdashboard/internal/config"
)

type AnalyticsHandler struct {
	cfg    *config.Config
	client *http.Client
}

func NewAnalyticsHandler(cfg *config.Config) *AnalyticsHandler {
	return &AnalyticsHandler{
		cfg:    cfg,
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

// Summary aggregates data from both cores for the dashboard overview.
// GET /api/v1/analytics/summary
func (h *AnalyticsHandler) Summary(w http.ResponseWriter, r *http.Request) {
	token := ""
	if c, err := r.Cookie("cores_token"); err == nil {
		token = c.Value
	}

	rental := h.fetchRental(token)
	warehouse := h.fetchWarehouse(token)
	maintenance := h.fetchMaintenance(token)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"rental":      rental,
		"warehouse":   warehouse,
		"maintenance": maintenance,
	})
}

func (h *AnalyticsHandler) fetchRental(token string) map[string]interface{} {
	url := h.cfg.RentalCoreURL + "/api/v1/analytics/revenue?period=30days"
	data, err := h.fetchWithToken(url, token)
	if err != nil {
		log.Printf("analytics: rental fetch error: %v", err)
		return map[string]interface{}{"error": "unavailable"}
	}
	return data
}

func (h *AnalyticsHandler) fetchWarehouse(token string) map[string]interface{} {
	url := h.cfg.WarehouseCoreURL + "/api/v1/dashboard/stats"
	data, err := h.fetchWithToken(url, token)
	if err != nil {
		log.Printf("analytics: warehouse fetch error: %v", err)
		return map[string]interface{}{"error": "unavailable"}
	}
	return data
}

func (h *AnalyticsHandler) fetchMaintenance(token string) map[string]interface{} {
	url := h.cfg.WarehouseCoreURL + "/api/v1/maintenance/stats"
	data, err := h.fetchWithToken(url, token)
	if err != nil {
		log.Printf("analytics: maintenance fetch error: %v", err)
		return map[string]interface{}{"error": "unavailable"}
	}
	return data
}

func (h *AnalyticsHandler) fetchWithToken(url, token string) (map[string]interface{}, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	if token != "" {
		req.AddCookie(&http.Cookie{Name: "cores_token", Value: token})
	}
	resp, err := h.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)
	return result, nil
}
```

- [ ] **Step 2: Commit**

```bash
cd /opt/dev/cores
git add cores-dashboard/internal/handlers/analytics.go
git commit -m "feat: add cores-dashboard analytics aggregation handler"
```

---

## Task 4: Admin Proxy Handler

**Files:**
- Create: `cores-dashboard/internal/handlers/admin_proxy.go`

The proxy strips `/api/v1/proxy/rental` or `/api/v1/proxy/warehouse` prefix, forwards the request to the respective core, and pipes the response back.

- [ ] **Step 1: Create proxy handler**

```go
// File: cores-dashboard/internal/handlers/admin_proxy.go
package handlers

import (
	"io"
	"net/http"
	"strings"
	"time"

	"coresdashboard/internal/config"
)

type AdminProxyHandler struct {
	cfg    *config.Config
	client *http.Client
}

func NewAdminProxyHandler(cfg *config.Config) *AdminProxyHandler {
	return &AdminProxyHandler{
		cfg:    cfg,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

// ProxyRental forwards /api/v1/proxy/rental/api/v1/... → rentalcore:8081/api/v1/...
func (h *AdminProxyHandler) ProxyRental(w http.ResponseWriter, r *http.Request) {
	target := strings.TrimPrefix(r.URL.Path, "/api/v1/proxy/rental")
	h.proxy(w, r, h.cfg.RentalCoreURL+target)
}

// ProxyWarehouse forwards /api/v1/proxy/warehouse/api/v1/... → warehousecore:8082/api/v1/...
func (h *AdminProxyHandler) ProxyWarehouse(w http.ResponseWriter, r *http.Request) {
	target := strings.TrimPrefix(r.URL.Path, "/api/v1/proxy/warehouse")
	h.proxy(w, r, h.cfg.WarehouseCoreURL+target)
}

func (h *AdminProxyHandler) proxy(w http.ResponseWriter, r *http.Request, targetURL string) {
	if r.URL.RawQuery != "" {
		targetURL += "?" + r.URL.RawQuery
	}

	req, err := http.NewRequest(r.Method, targetURL, r.Body)
	if err != nil {
		http.Error(w, `{"error":"proxy error"}`, http.StatusBadGateway)
		return
	}

	// Forward content-type and authorization headers
	req.Header.Set("Content-Type", r.Header.Get("Content-Type"))

	// Forward cores_token cookie so cores accept the request
	if c, err := r.Cookie("cores_token"); err == nil {
		req.AddCookie(c)
	}

	resp, err := h.client.Do(req)
	if err != nil {
		http.Error(w, `{"error":"upstream unavailable"}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	for k, vs := range resp.Header {
		for _, v := range vs {
			w.Header().Add(k, v)
		}
	}
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
```

- [ ] **Step 2: Verify Go build**

```bash
cd /opt/dev/cores/cores-dashboard && go build ./cmd/server/
```
Expected: Compiles without errors.

- [ ] **Step 3: Commit**

```bash
cd /opt/dev/cores
git add cores-dashboard/internal/handlers/admin_proxy.go
git commit -m "feat: add cores-dashboard admin proxy handler"
```

---

## Task 5: React Frontend Scaffold

**Files:**
- Create: `cores-dashboard/web/package.json`
- Create: `cores-dashboard/web/vite.config.ts`
- Create: `cores-dashboard/web/tailwind.config.js`
- Create: `cores-dashboard/web/tsconfig.json`
- Create: `cores-dashboard/web/tsconfig.app.json`
- Create: `cores-dashboard/web/postcss.config.js`
- Create: `cores-dashboard/web/index.html`
- Create: `cores-dashboard/web/src/main.tsx`

- [ ] **Step 1: Create package.json**

```json
// File: cores-dashboard/web/package.json
{
  "name": "cores-dashboard-web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.12.2",
    "lucide-react": "^0.545.0",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "react-router-dom": "^7.9.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.14",
    "@types/react": "^19.1.16",
    "@types/react-dom": "^19.1.9",
    "@vitejs/plugin-react": "^5.0.4",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.1.14",
    "typescript": "~5.9.3",
    "vite": "^7.1.7"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

```ts
// File: cores-dashboard/web/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../cmd/server/dist',
    emptyOutDir: true,
  },
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 3: Copy config files from warehousecore**

```bash
cp /opt/dev/cores/warehousecore/web/tailwind.config.js /opt/dev/cores/cores-dashboard/web/tailwind.config.js
cp /opt/dev/cores/warehousecore/web/postcss.config.js /opt/dev/cores/cores-dashboard/web/postcss.config.js
cp /opt/dev/cores/warehousecore/web/tsconfig.json /opt/dev/cores/cores-dashboard/web/tsconfig.json
cp /opt/dev/cores/warehousecore/web/tsconfig.app.json /opt/dev/cores/cores-dashboard/web/tsconfig.app.json
cp /opt/dev/cores/warehousecore/web/tsconfig.node.json /opt/dev/cores/cores-dashboard/web/tsconfig.node.json
```

- [ ] **Step 4: Create index.html**

```html
<!-- File: cores-dashboard/web/index.html -->
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/icon-180.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cores</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Copy index.css from warehousecore**

```bash
mkdir -p /opt/dev/cores/cores-dashboard/web/src
cp /opt/dev/cores/warehousecore/web/src/index.css /opt/dev/cores/cores-dashboard/web/src/index.css
```

- [ ] **Step 6: Create main.tsx**

```tsx
// File: cores-dashboard/web/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 7: Install dependencies**

```bash
cd /opt/dev/cores/cores-dashboard/web && npm install
```
Expected: `node_modules/` created, no errors.

- [ ] **Step 8: Commit**

```bash
cd /opt/dev/cores
git add cores-dashboard/web/
git commit -m "feat: add cores-dashboard React frontend scaffold"
```

---

## Task 6: Auth Context + API Client + Routing

**Files:**
- Create: `cores-dashboard/web/src/lib/api.ts`
- Create: `cores-dashboard/web/src/contexts/AuthContext.tsx`
- Create: `cores-dashboard/web/src/components/ProtectedRoute.tsx`
- Create: `cores-dashboard/web/src/App.tsx`

- [ ] **Step 1: Create api.ts**

```ts
// File: cores-dashboard/web/src/lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});
```

- [ ] **Step 2: Create AuthContext.tsx**

```tsx
// File: cores-dashboard/web/src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';

interface AuthUser {
  user_id: number;
  username: string;
  is_admin: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then(r => setUser(r.data as AuthUser))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const r = await api.post('/auth/login', { username, password });
    const data = r.data as { username: string; is_admin: boolean; user_id?: number };
    setUser({ user_id: data.user_id ?? 0, username: data.username, is_admin: data.is_admin });
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
```

- [ ] **Step 3: Create ProtectedRoute.tsx**

```tsx
// File: cores-dashboard/web/src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-dark flex items-center justify-center"><div className="w-8 h-8 border-2 border-accent-red border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 4: Create App.tsx**

```tsx
// File: cores-dashboard/web/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AdminPage } from './pages/AdminPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Layout><AdminPage /></Layout></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 5: Commit**

```bash
cd /opt/dev/cores
git add cores-dashboard/web/src/
git commit -m "feat: add cores-dashboard auth context, API client and routing"
```

---

## Task 7: Login Page (Glassmorphism)

**Files:**
- Create: `cores-dashboard/web/src/pages/Login.tsx`

- [ ] **Step 1: Create Login.tsx**

```tsx
// File: cores-dashboard/web/src/pages/Login.tsx
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('Ungültige Anmeldedaten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center relative overflow-hidden">
      {/* Red glow behind card */}
      <div className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'rgba(208,2,27,0.12)', filter: 'blur(80px)', top: '50%', left: '50%', transform: 'translate(-50%, -60%)' }} />

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="rounded-2xl p-8 flex flex-col items-center gap-6"
          style={{ background: 'rgba(17,17,17,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>

          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-accent-red rounded-xl flex items-center justify-center"
              style={{ boxShadow: '0 0 28px rgba(208,2,27,0.35)' }}>
              <span className="text-white font-black text-2xl">C</span>
            </div>
            <div className="text-center">
              <p className="text-white font-black text-2xl tracking-[0.25em]">CORES</p>
              <p className="text-gray-500 text-xs mt-0.5">Management System</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
            <input
              type="text"
              placeholder="Benutzername"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg"
              required
              autoFocus
            />
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg"
              required
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: '#D0021B', boxShadow: '0 0 16px rgba(208,2,27,0.25)' }}
            >
              {loading ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /opt/dev/cores
git add cores-dashboard/web/src/pages/Login.tsx
git commit -m "feat: add cores-dashboard login page with glassmorphism design"
```

---

## Task 8: Layout + Dashboard Page

**Files:**
- Create: `cores-dashboard/web/src/components/Layout.tsx`
- Create: `cores-dashboard/web/src/pages/Dashboard.tsx`

- [ ] **Step 1: Create Layout.tsx**

```tsx
// File: cores-dashboard/web/src/components/Layout.tsx
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Settings, LogOut, User, ExternalLink, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const close = () => { if (isMobile) setSidebarOpen(false); };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const getRentalURL = () => {
    const { hostname, port, protocol } = window.location;
    if (port === '8080') return `${protocol}//${hostname}:8081`;
    return `${protocol}//${hostname.replace(/^cores\./, 'rent.')}`;
  };
  const getWarehouseURL = () => {
    const { hostname, port, protocol } = window.location;
    if (port === '8080') return `${protocol}//${hostname}:8082`;
    return `${protocol}//${hostname.replace(/^cores\./, 'warehouse.')}`;
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard', exact: true },
    { path: '/admin', icon: Settings, label: 'Administration' },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-dark flex">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-30 flex flex-col transition-all duration-200
        ${sidebarOpen ? 'w-56' : 'w-14'}
        ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}
        style={{ background: '#111111', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-white/5">
          <div className="w-8 h-8 bg-accent-red rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ boxShadow: '0 0 14px rgba(208,2,27,0.3)' }}>
            <span className="text-white font-black text-sm">C</span>
          </div>
          {sidebarOpen && <span className="text-white font-black tracking-widest text-sm">CORES</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-1">
          {navItems.map(({ path, icon: Icon, label, exact }) => (
            <Link key={path} to={path} onClick={close}
              className={`flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive(path, exact) ? 'bg-accent-red text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </Link>
          ))}

          {/* Cross-navigation */}
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-1">
            <a href={getRentalURL()} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span>RentalCore</span>}
            </a>
            <a href={getWarehouseURL()} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span>WarehouseCore</span>}
            </a>
          </div>
        </nav>

        {/* User + Logout */}
        <div className="p-2 border-t border-white/5">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-400" />
            </div>
            {sidebarOpen && <span className="text-gray-300 text-sm truncate flex-1">{user?.username}</span>}
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Abmelden</span>}
          </button>
        </div>
      </aside>

      {/* Toggle button (mobile) */}
      {isMobile && (
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-3 left-3 z-40 w-9 h-9 bg-dark-200 rounded-lg flex items-center justify-center text-gray-300">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      {/* Main content */}
      <main className={`flex-1 transition-all duration-200 ${sidebarOpen && !isMobile ? 'ml-56' : 'ml-14'} ${isMobile ? 'ml-0' : ''}`}>
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create Dashboard.tsx**

```tsx
// File: cores-dashboard/web/src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { ExternalLink, Briefcase, Package, TrendingUp, Wrench, AlertTriangle, BarChart2 } from 'lucide-react';
import { api } from '../lib/api';

interface AnalyticsSummary {
  rental: { totalRevenue?: number; totalJobs?: number; error?: string };
  warehouse: { in_storage?: number; on_job?: number; total?: number; error?: string };
  maintenance: { open_defects?: number; overdue_inspections?: number; error?: string };
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-dark-100 rounded-xl p-4 flex items-center gap-4" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-gray-500 text-xs mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    api.get('/analytics/summary')
      .then(r => setStats(r.data as AnalyticsSummary))
      .catch(console.error);
  }, []);

  const getRentalURL = () => {
    const { hostname, port, protocol } = window.location;
    if (port === '8080') return `${protocol}//${hostname}:8081`;
    return `${protocol}//${hostname.replace(/^cores\./, 'rent.')}`;
  };
  const getWarehouseURL = () => {
    const { hostname, port, protocol } = window.location;
    if (port === '8080') return `${protocol}//${hostname}:8082`;
    return `${protocol}//${hostname.replace(/^cores\./, 'warehouse.')}`;
  };

  const fmt = (n?: number) => n !== undefined ? n.toLocaleString('de-DE') : '—';
  const fmtEur = (n?: number) => n !== undefined ? `€${n.toLocaleString('de-DE', { maximumFractionDigits: 0 })}` : '—';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Cores</h1>
        <p className="text-gray-500 text-sm mt-1">Management Hub</p>
      </div>

      {/* Hub Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a href={getRentalURL()} target="_blank" rel="noreferrer"
          className="group relative overflow-hidden rounded-2xl p-6 flex flex-col justify-between min-h-40 transition-transform hover:scale-[1.01]"
          style={{ background: 'linear-gradient(135deg, #D0021B 0%, #6b0010 100%)' }}>
          <div>
            <p className="text-white/70 text-xs font-semibold tracking-wider uppercase">Auftragsmanagement</p>
            <h2 className="text-white text-2xl font-black mt-1">RentalCore</h2>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-sm font-medium mt-4">
            <span>Öffnen</span>
            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="absolute right-4 bottom-4 opacity-10">
            <Briefcase className="w-20 h-20 text-white" />
          </div>
        </a>

        <a href={getWarehouseURL()} target="_blank" rel="noreferrer"
          className="group relative overflow-hidden rounded-2xl p-6 flex flex-col justify-between min-h-40 transition-transform hover:scale-[1.01]"
          style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f1f33 100%)', border: '1px solid #2a4a6b' }}>
          <div>
            <p className="text-white/70 text-xs font-semibold tracking-wider uppercase">Lagermanagement</p>
            <h2 className="text-white text-2xl font-black mt-1">WarehouseCore</h2>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-sm font-medium mt-4">
            <span>Öffnen</span>
            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="absolute right-4 bottom-4 opacity-10">
            <Package className="w-20 h-20 text-white" />
          </div>
        </a>
      </div>

      {/* Analytics Grid */}
      <div>
        <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-accent-red" />
          Übersicht (letzte 30 Tage)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Umsatz" value={fmtEur(stats?.rental?.totalRevenue)} icon={TrendingUp} color="#22c55e" />
          <StatCard label="Abgeschl. Jobs" value={fmt(stats?.rental?.totalJobs)} icon={Briefcase} color="#D0021B" />
          <StatCard label="Geräte im Lager" value={fmt(stats?.warehouse?.in_storage)} icon={Package} color="#60a5fa" />
          <StatCard label="Geräte auf Job" value={fmt(stats?.warehouse?.on_job)} icon={Package} color="#eab308" />
          <StatCard label="Offene Defekte" value={fmt(stats?.maintenance?.open_defects)} icon={AlertTriangle} color="#f87171" />
          <StatCard label="Überfäll. Wartungen" value={fmt(stats?.maintenance?.overdue_inspections)} icon={Wrench} color="#fb923c" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /opt/dev/cores
git add cores-dashboard/web/src/components/Layout.tsx cores-dashboard/web/src/pages/Dashboard.tsx
git commit -m "feat: add cores-dashboard layout sidebar and dashboard hub page"
```

---

## Task 9: Admin Page (Combined Tabs via Proxy)

**Files:**
- Create: `cores-dashboard/web/src/pages/AdminPage.tsx`
- Create: `cores-dashboard/web/src/components/admin/UsersTab.tsx`

All WarehouseCore admin tab components (`ZoneTypesTab`, `LEDSettingsTab`, etc.) are copied from `warehousecore/web/src/components/admin/` and their API base paths updated from `/api/v1/` to `/api/v1/proxy/warehouse/api/v1/`. RentalCore-specific tabs (Users, Roles) use `/api/v1/proxy/rental/api/v1/`.

- [ ] **Step 1: Copy WarehouseCore admin tabs**

```bash
mkdir -p /opt/dev/cores/cores-dashboard/web/src/components/admin
for f in ZoneTypesTab LEDSettingsTab LEDControllersTab CategoriesTab BrandsManufacturersTab CountTypesTab RolesTab APISettingsTab APIKeysTab ExportTab; do
  cp /opt/dev/cores/warehousecore/web/src/components/admin/${f}.tsx \
     /opt/dev/cores/cores-dashboard/web/src/components/admin/${f}.tsx
done
```

- [ ] **Step 2: Update API paths in copied components**

In every copied file, replace `/api/v1/` with `/api/v1/proxy/warehouse/api/v1/`:

```bash
cd /opt/dev/cores/cores-dashboard/web/src/components/admin
sed -i 's|/api/v1/|/api/v1/proxy/warehouse/api/v1/|g' ZoneTypesTab.tsx LEDSettingsTab.tsx LEDControllersTab.tsx CategoriesTab.tsx BrandsManufacturersTab.tsx CountTypesTab.tsx RolesTab.tsx APISettingsTab.tsx APIKeysTab.tsx ExportTab.tsx
```

Verify one file looks correct:
```bash
grep "proxy" /opt/dev/cores/cores-dashboard/web/src/components/admin/ZoneTypesTab.tsx | head -3
```
Expected: lines containing `/api/v1/proxy/warehouse/api/v1/zonetypes` etc.

- [ ] **Step 3: Create UsersTab.tsx (RentalCore users)**

```tsx
// File: cores-dashboard/web/src/components/admin/UsersTab.tsx
import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { api } from '../../lib/api';

interface AppUser {
  userid?: number;
  UserID?: number;
  username?: string;
  Username?: string;
  email?: string;
  Email?: string;
  is_active?: boolean;
  IsActive?: boolean;
}

export function UsersTab() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/proxy/rental/api/v1/security/auth/users')
      .then(r => {
        const data = r.data as { users?: AppUser[] } | AppUser[];
        setUsers(Array.isArray(data) ? data : (data as { users?: AppUser[] }).users || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Lade Benutzer...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-accent-red" />
        <h2 className="text-white font-semibold">Benutzerverwaltung</h2>
      </div>
      <div className="space-y-2">
        {users.map(u => {
          const id = u.userid ?? u.UserID;
          const name = u.username ?? u.Username ?? '—';
          const email = u.email ?? u.Email ?? '';
          const active = u.is_active ?? u.IsActive;
          return (
            <div key={id} className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-white text-sm font-medium">{name}</p>
                <p className="text-gray-500 text-xs">{email}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                {active ? 'Aktiv' : 'Inaktiv'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create AdminPage.tsx**

```tsx
// File: cores-dashboard/web/src/pages/AdminPage.tsx
import { useState } from 'react';
import { Settings, Users, Layers, Lightbulb, Cpu, FolderTree, Database, Ruler, KeyRound, Tag, Download, Shield } from 'lucide-react';
import { UsersTab } from '../components/admin/UsersTab';
import { ZoneTypesTab } from '../components/admin/ZoneTypesTab';
import { LEDSettingsTab } from '../components/admin/LEDSettingsTab';
import { LEDControllersTab } from '../components/admin/LEDControllersTab';
import { CategoriesTab } from '../components/admin/CategoriesTab';
import { BrandsManufacturersTab } from '../components/admin/BrandsManufacturersTab';
import { CountTypesTab } from '../components/admin/CountTypesTab';
import { RolesTab } from '../components/admin/RolesTab';
import { APISettingsTab } from '../components/admin/APISettingsTab';
import { APIKeysTab } from '../components/admin/APIKeysTab';
import { ExportTab } from '../components/admin/ExportTab';

type TabId = 'users' | 'roles' | 'zonetypes' | 'led' | 'controllers' | 'categories' | 'brands' | 'counttypes' | 'apisettings' | 'apikeys' | 'export';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'users', label: 'Benutzer', icon: Users },
  { id: 'roles', label: 'Rollen', icon: Shield },
  { id: 'zonetypes', label: 'Lagertypen', icon: Layers },
  { id: 'led', label: 'LED-Verhalten', icon: Lightbulb },
  { id: 'controllers', label: 'ESP-Controller', icon: Cpu },
  { id: 'categories', label: 'Kategorien', icon: FolderTree },
  { id: 'brands', label: 'Marken', icon: Tag },
  { id: 'counttypes', label: 'Maßeinheiten', icon: Ruler },
  { id: 'apisettings', label: 'API-Einstellungen', icon: Database },
  { id: 'apikeys', label: 'API-Keys', icon: KeyRound },
  { id: 'export', label: 'CSV-Export', icon: Download },
];

export function AdminPage() {
  const [active, setActive] = useState<TabId>('users');

  const renderTab = () => {
    switch (active) {
      case 'users': return <UsersTab />;
      case 'roles': return <RolesTab />;
      case 'zonetypes': return <ZoneTypesTab />;
      case 'led': return <LEDSettingsTab />;
      case 'controllers': return <LEDControllersTab />;
      case 'categories': return <CategoriesTab />;
      case 'brands': return <BrandsManufacturersTab />;
      case 'counttypes': return <CountTypesTab />;
      case 'apisettings': return <APISettingsTab />;
      case 'apikeys': return <APIKeysTab />;
      case 'export': return <ExportTab />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-7 h-7 text-accent-red" />
        <div>
          <h1 className="text-2xl font-black text-white">Administration</h1>
          <p className="text-gray-500 text-sm">Systemeinstellungen aller Cores</p>
        </div>
      </div>

      <div className="rounded-xl p-2 flex gap-1 overflow-x-auto" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActive(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0
              ${active === id ? 'bg-accent-red text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl p-5" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
        {renderTab()}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify frontend builds**

```bash
cd /opt/dev/cores/cores-dashboard/web && npm run build
```
Expected: `cores-dashboard/cmd/server/dist/` populated with `index.html` + assets. Fix any TypeScript errors from copied components (e.g. missing imports — check warehousecore for what they import from `../../lib/api` and update paths).

- [ ] **Step 6: Commit**

```bash
cd /opt/dev/cores
git add cores-dashboard/web/src/
git commit -m "feat: add cores-dashboard admin page with combined tabs via proxy"
```

---

## Task 10: Dockerfile for cores-dashboard

**Files:**
- Create: `cores-dashboard/Dockerfile`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
# File: cores-dashboard/Dockerfile

# Stage 1: Build frontend
FROM node:22-alpine AS frontend
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build
# Output goes to ../cmd/server/dist (configured in vite.config.ts)

# Stage 2: Build Go binary
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Copy built frontend into the embed path
COPY --from=frontend /app/cmd/server/dist ./cmd/server/dist
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server/

# Stage 3: Runtime
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]
```

- [ ] **Step 2: Build Docker image locally to verify**

```bash
cd /opt/dev/cores/cores-dashboard && docker build -t nobentie/cores-dashboard:1.0.0 .
```
Expected: Image built successfully. Fix any build errors (missing imports, wrong paths).

- [ ] **Step 3: Commit**

```bash
cd /opt/dev/cores
git add cores-dashboard/Dockerfile
git commit -m "feat: add cores-dashboard Dockerfile with two-stage build"
```

---

## Task 11: RentalCore — SSO JWT Middleware Extension

**Files:**
- Modify: `rentalcore/internal/handlers/auth_handler.go`

Both the session_id and the cores_token are tried. If either is valid, the user is set in the Gin context.

- [ ] **Step 1: Add JWT dependency to RentalCore**

```bash
cd /opt/dev/cores/rentalcore && go get github.com/golang-jwt/jwt/v5 && go mod tidy
```

- [ ] **Step 2: Extend AuthMiddleware in auth_handler.go**

Find `func (h *AuthHandler) AuthMiddleware() gin.HandlerFunc` in `rentalcore/internal/handlers/auth_handler.go` (around line 405).

Add a new helper function after `validateSession`:

```go
// validateCoresToken checks a cores_token JWT cookie issued by cores-dashboard.
func (h *AuthHandler) validateCoresToken(tokenStr string) (*models.User, bool) {
	coresSecret := os.Getenv("CORES_JWT_SECRET")
	if coresSecret == "" {
		return nil, false
	}

	type coresClaims struct {
		UserID   uint   `json:"uid"`
		Username string `json:"username"`
		IsAdmin  bool   `json:"is_admin"`
		jwt.RegisteredClaims
	}

	token, err := jwt.ParseWithClaims(tokenStr, &coresClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(coresSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, false
	}

	claims := token.Claims.(*coresClaims)
	var user models.User
	if err := h.db.Where("userID = ? AND is_active = ?", claims.UserID, true).First(&user).Error; err != nil {
		return nil, false
	}
	return &user, true
}
```

Also add the import for `github.com/golang-jwt/jwt/v5` to the import block.

Then in `AuthMiddleware()`, after the session_id check fails (the `return` on invalid session), add a fallback before the final return:

Replace the section starting with `sessionID, err := c.Cookie("session_id")` in `AuthMiddleware` — add cores_token fallback after the session_id block fails. The full updated middleware structure:

```go
func (h *AuthHandler) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		isAPI := strings.HasPrefix(c.Request.URL.Path, "/api") ||
			c.GetHeader("Accept") == "application/json" ||
			c.ContentType() == "application/json"

		// 1. Try existing session_id cookie
		sessionID, err := c.Cookie("session_id")
		if err == nil && sessionID != "" {
			var session models.Session
			if err := h.db.Where("session_id = ? AND expires_at > ?", sessionID, time.Now()).First(&session).Error; err == nil {
				var user models.User
				if err := h.db.Where("userID = ? AND is_active = ?", session.UserID, true).First(&user).Error; err == nil {
					c.Set("user", &user)
					c.Set("userid", session.UserID)
					c.Next()
					return
				}
			}
		}

		// 2. Try cores_token JWT cookie (SSO from cores-dashboard)
		if coresToken, err := c.Cookie("cores_token"); err == nil && coresToken != "" {
			if user, ok := h.validateCoresToken(coresToken); ok {
				c.Set("user", user)
				c.Set("userid", user.UserID)
				c.Next()
				return
			}
		}

		// 3. Unauthorized
		cookieDomain := getCookieDomain(c)
		c.SetCookie("session_id", "", -1, "/", cookieDomain, false, true)
		if isAPI {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized", "code": "NO_SESSION"})
		} else {
			c.Redirect(http.StatusSeeOther, "/login")
			c.Abort()
		}
	}
}
```

- [ ] **Step 3: Verify RentalCore builds**

```bash
cd /opt/dev/cores/rentalcore && go build ./cmd/server/
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /opt/dev/cores/rentalcore
git add internal/handlers/auth_handler.go go.mod go.sum
git commit -m "feat: accept cores_token JWT cookie for SSO from cores-dashboard"
```

---

## Task 12: RentalCore — Remove AdminPage + Add Navigation

**Files:**
- Delete: `rentalcore/web/src/pages/AdminPage.tsx`
- Modify: `rentalcore/web/src/App.tsx`
- Modify: `rentalcore/web/src/components/Layout.tsx`

- [ ] **Step 1: Delete AdminPage.tsx**

```bash
rm /opt/dev/cores/rentalcore/web/src/pages/AdminPage.tsx
```

- [ ] **Step 2: Remove /admin route from App.tsx**

In `rentalcore/web/src/App.tsx`, remove:
```tsx
import { AdminPage } from './pages/AdminPage';
```
And remove the entire `/admin` Route block:
```tsx
<Route
  path="/admin"
  element={
    <ProtectedRoute>
      <Layout>
        <RoleGuard requiredRoles={['admin', 'manager']}>
          <AdminPage />
        </RoleGuard>
      </Layout>
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 3: Add ← Cores to Layout.tsx sidebar**

In `rentalcore/web/src/components/Layout.tsx`, locate the sidebar nav section (around line 80-150). Add a "← Cores" link at the very top of the nav section, before the navItems loop.

First add the helper function to get the dashboard URL (place after `getWarehouseCoreURL`):
```tsx
const getCoresDashboardURL = () => {
  const { hostname, port, protocol } = window.location;
  if (port === '8081') return `${protocol}//${hostname}:8080`;
  if (hostname.startsWith('rent.')) return `${protocol}//${hostname.replace(/^rent\./, 'cores.')}`;
  return `${protocol}//${hostname}:8080`;
};
const dashboardURL = getCoresDashboardURL();
```

Then in the JSX, add before the navItems.map loop (inside the `<nav>` element):
```tsx
{/* Cores Dashboard link */}
<a
  href={dashboardURL}
  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-accent-red hover:bg-accent-red/10 transition-colors mb-2"
>
  <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
  {(sidebarOpen || isMobile) && <span>← Cores</span>}
</a>
```

Add `LayoutDashboard` to the lucide-react import.

Also remove the Admin nav item from `navItems` array (since AdminPage is gone):
```tsx
// Remove this entry:
{ path: '/admin', icon: Settings, label: 'Admin' },
```

- [ ] **Step 4: Verify RentalCore frontend builds**

```bash
cd /opt/dev/cores/rentalcore/web && npm run build
```
Expected: No TypeScript errors, `dist/` updated.

- [ ] **Step 5: Commit**

```bash
cd /opt/dev/cores/rentalcore
git add web/src/
git commit -m "feat: remove AdminPage, add Cores Dashboard navigation link"
```

---

## Task 13: WarehouseCore — SSO JWT Middleware Extension

**Files:**
- Modify: `warehousecore/internal/middleware/auth.go`

- [ ] **Step 1: Add JWT dependency**

```bash
cd /opt/dev/cores/warehousecore && go get github.com/golang-jwt/jwt/v5 && go mod tidy
```

- [ ] **Step 2: Add validateCoresToken helper to auth.go**

Add imports `os`, `fmt`, `github.com/golang-jwt/jwt/v5` to the existing import block in `warehousecore/internal/middleware/auth.go`.

Add this function before `AuthMiddleware`:

```go
type coresClaims struct {
	UserID   uint   `json:"uid"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
	jwt.RegisteredClaims
}

func validateCoresToken(tokenStr string) (uint, bool) {
	secret := os.Getenv("CORES_JWT_SECRET")
	if secret == "" {
		return 0, false
	}
	token, err := jwt.ParseWithClaims(tokenStr, &coresClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return 0, false
	}
	claims := token.Claims.(*coresClaims)
	return claims.UserID, true
}
```

- [ ] **Step 3: Extend AuthMiddleware to try cores_token**

In `AuthMiddleware`, after the `session_id` check fails with `http.Error(w, "Unauthorized - No session", ...)`, add a cores_token fallback before the `return`:

Replace the full `AuthMiddleware` function body with:

```go
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		db := repository.GetDB()
		if db == nil {
			http.Error(w, `{"error":"Database unavailable"}`, http.StatusInternalServerError)
			return
		}

		// 1. Try session_id cookie (existing auth)
		if cookie, err := r.Cookie("session_id"); err == nil && cookie.Value != "" {
			sessionID, err := url.QueryUnescape(cookie.Value)
			if err == nil {
				var session models.Session
				err = db.Preload("User").
					Where("session_id = ? AND expires_at > ?", sessionID, time.Now()).
					First(&session).Error
				if err == nil && session.User.IsActive {
					rbacService := services.NewRBACService()
					if roles, err := rbacService.GetUserRoles(session.User.UserID); err == nil {
						session.User.Roles = roles
					}
					ctx := context.WithValue(r.Context(), UserContextKey, &session.User)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
			}
		}

		// 2. Try cores_token JWT cookie (SSO from cores-dashboard)
		if coresCookie, err := r.Cookie("cores_token"); err == nil && coresCookie.Value != "" {
			if userID, ok := validateCoresToken(coresCookie.Value); ok {
				var user models.User
				err := db.Where("userID = ? AND is_active = ?", userID, true).First(&user).Error
				if err == nil {
					rbacService := services.NewRBACService()
					if roles, roleErr := rbacService.GetUserRoles(user.UserID); roleErr == nil {
						user.Roles = roles
					}
					ctx := context.WithValue(r.Context(), UserContextKey, &user)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
			}
		}

		// 3. Unauthorized
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
	})
}
```

- [ ] **Step 4: Verify WarehouseCore builds**

```bash
cd /opt/dev/cores/warehousecore && go build ./cmd/server/
```
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd /opt/dev/cores/warehousecore
git add internal/middleware/auth.go go.mod go.sum
git commit -m "feat: accept cores_token JWT cookie for SSO from cores-dashboard"
```

---

## Task 14: WarehouseCore — Remove AdminPage + Add Navigation

**Files:**
- Delete: `warehousecore/web/src/pages/AdminPage.tsx`
- Modify: `warehousecore/web/src/App.tsx`
- Modify: `warehousecore/web/src/components/Layout.tsx`

- [ ] **Step 1: Delete AdminPage.tsx**

```bash
rm /opt/dev/cores/warehousecore/web/src/pages/AdminPage.tsx
```

- [ ] **Step 2: Remove /admin route from App.tsx**

In `warehousecore/web/src/App.tsx`, remove:
```tsx
import { AdminPage } from './pages/AdminPage';
```
And remove the entire `/admin` Route block (the one with `RoleGuard`).

- [ ] **Step 3: Add ← Cores to Layout.tsx**

In `warehousecore/web/src/components/Layout.tsx`, add after `getRentalCoreURL()` helper:

```tsx
const getCoresDashboardURL = () => {
  const { hostname, port, protocol } = window.location;
  if (port === '8082') return `${protocol}//${hostname}:8080`;
  if (hostname.startsWith('warehouse.')) return `${protocol}//${hostname.replace(/^warehouse\./, 'cores.')}`;
  return `${protocol}//${hostname}:8080`;
};
const dashboardURL = getCoresDashboardURL();
```

In the nav JSX, add before the navItems map loop:
```tsx
<a
  href={dashboardURL}
  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-accent-red hover:bg-accent-red/10 transition-colors mb-2"
>
  <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
  {(sidebarOpen || !isMobile) && <span>← Cores</span>}
</a>
```

Add `LayoutDashboard` to the lucide-react import. Remove the Admin item from `navItems`.

- [ ] **Step 4: Verify WarehouseCore frontend builds**

```bash
cd /opt/dev/cores/warehousecore/web && npm run build
```
Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
cd /opt/dev/cores/warehousecore
git add web/src/
git commit -m "feat: remove AdminPage, add Cores Dashboard navigation link"
```

---

## Task 15: docker-compose.yml + CORES_JWT_SECRET

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add cores-dashboard service**

In `/opt/dev/cores/docker-compose.yml`, add after the `rentalcore:` block:

```yaml
  cores-dashboard:
    image: nobentie/cores-dashboard:latest
    container_name: cores-dashboard
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      PORT: "8080"
      CORES_JWT_SECRET: "${CORES_JWT_SECRET:-dev-secret-please-change}"
      RENTALCORE_URL: "http://rentalcore:8081"
      WAREHOUSECORE_URL: "http://warehousecore:8082"
      DB_HOST: "postgres"
      DB_PORT: "5432"
      DB_NAME: "${POSTGRES_DB:-rentalcore}"
      DB_USER: "${POSTGRES_USER:-rentalcore}"
      DB_PASSWORD: "${POSTGRES_PASSWORD:-rentalcore123}"
      DB_SSLMODE: "disable"
    ports:
      - "8080:8080"
    networks:
      - weidelbach
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8080/api/v1/auth/me || true"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

- [ ] **Step 2: Add CORES_JWT_SECRET to rentalcore and warehousecore environment blocks**

In the `rentalcore:` environment block, add:
```yaml
      CORES_JWT_SECRET: "${CORES_JWT_SECRET:-dev-secret-please-change}"
```

In the `warehousecore:` environment block, add:
```yaml
      CORES_JWT_SECRET: "${CORES_JWT_SECRET:-dev-secret-please-change}"
```

- [ ] **Step 3: Commit docker-compose changes**

```bash
cd /opt/dev/cores
git add docker-compose.yml
git commit -m "feat: add cores-dashboard service to docker-compose with shared JWT secret"
```

---

## Task 16: Build and Push All Images

- [ ] **Step 1: Push all git changes to GitLab**

```bash
cd /opt/dev/cores/rentalcore && git push
cd /opt/dev/cores/warehousecore && git push
cd /opt/dev/cores && git push
```

- [ ] **Step 2: Check current versions**

```bash
# Check latest RentalCore version tag
cd /opt/dev/cores/rentalcore && git tag --sort=-version:refname | head -3
# Check latest WarehouseCore version tag
cd /opt/dev/cores/warehousecore && git tag --sort=-version:refname | head -3
```

- [ ] **Step 3: Build and push cores-dashboard**

```bash
cd /opt/dev/cores/cores-dashboard
docker build -t nobentie/cores-dashboard:1.0.0 .
docker push nobentie/cores-dashboard:1.0.0
docker tag nobentie/cores-dashboard:1.0.0 nobentie/cores-dashboard:latest
docker push nobentie/cores-dashboard:latest
```

- [ ] **Step 4: Build and push RentalCore (increment patch version)**

Check the last version from step 2. Increment patch (e.g. 5.3.30 → 5.3.31):

```bash
cd /opt/dev/cores/rentalcore
docker build -t nobentie/rentalcore:<NEXT_VERSION> .
docker push nobentie/rentalcore:<NEXT_VERSION>
docker tag nobentie/rentalcore:<NEXT_VERSION> nobentie/rentalcore:latest
docker push nobentie/rentalcore:latest
```

- [ ] **Step 5: Build and push WarehouseCore (increment patch version)**

```bash
cd /opt/dev/cores/warehousecore
docker build -t nobentie/warehousecore:<NEXT_VERSION> .
docker push nobentie/warehousecore:<NEXT_VERSION>
docker tag nobentie/warehousecore:<NEXT_VERSION> nobentie/warehousecore:latest
docker push nobentie/warehousecore:latest
```

- [ ] **Step 6: Pull and restart on docker03**

```bash
ssh noah@docker03 "docker pull nobentie/cores-dashboard:latest && docker pull nobentie/rentalcore:latest && docker pull nobentie/warehousecore:latest"
```

Then ask the user to restart the stack via Komodo.

---

## Self-Review Checklist

- [x] **Spec coverage**: New service ✓, SSO JWT ✓, Analytics aggregation ✓, Admin proxy ✓, RentalCore nav + admin removal ✓, WarehouseCore nav + admin removal ✓, docker-compose ✓
- [x] **Placeholders**: No TBDs — all code shown in full
- [x] **Type consistency**: `cores_token` cookie name consistent across all tasks; `CORES_JWT_SECRET` env var consistent; API proxy paths `/api/v1/proxy/rental` and `/api/v1/proxy/warehouse` consistent in Task 4, 9, and admin components
- [x] **Dependency check**: `github.com/golang-jwt/jwt/v5` added to cores-dashboard go.mod (Task 1) and to rentalcore/warehousecore in Tasks 11 and 13
