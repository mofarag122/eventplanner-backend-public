package http

import (
	"database/sql"

	"github.com/gin-gonic/gin"

	"github.com/evoplanner/backend/internal/config"
	"github.com/evoplanner/backend/internal/http/handlers"
)

func mountAuthRoutes(r *gin.RouterGroup, cfg config.Config, db *sql.DB) {
	h := handlers.NewAuthHandler(cfg, db)
	// Adapt standard library handlers by passing Gin's writer and request
	auth := r.Group("/auth")
	auth.POST("/signup", func(c *gin.Context) { h.Signup(c.Writer, c.Request) })
	auth.POST("/login", func(c *gin.Context) { h.Login(c.Writer, c.Request) })
}
