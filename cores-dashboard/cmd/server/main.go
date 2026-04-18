package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"

	"coresdashboard/internal/config"
	"coresdashboard/internal/database"
	"coresdashboard/internal/handlers"
	"coresdashboard/internal/middleware"
)

//go:embed all:dist
var staticFiles embed.FS

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
