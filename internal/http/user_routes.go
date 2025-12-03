package http

import (
	"database/sql"

	"github.com/gin-gonic/gin"

	"github.com/evoplanner/backend/internal/config"
	"github.com/evoplanner/backend/internal/http/handlers"
	"github.com/evoplanner/backend/internal/http/middleware"
)

func mountUserRoutes(r *gin.RouterGroup, cfg config.Config, db *sql.DB) {
	h := handlers.NewUserHandler(cfg, db)

	authMW := middleware.AuthMiddleware(cfg)

	users := r.Group("/users")
	users.Use(authMW)
	{
		users.GET("", func(c *gin.Context) { h.SearchUsers(c) })
	}
}
