package http

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	docs "github.com/evoplanner/backend/docs"
	"github.com/evoplanner/backend/internal/config"
)

// @title Backend API
// @version 1.0
// @description HTTP API for authentication and utilities
// @BasePath /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func NewRouter(cfg config.Config, db *sql.DB) http.Handler {
	// Ensure docs package is referenced so generated Swagger is registered
	docs.SwaggerInfo.BasePath = "/api/v1"

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:4200", "http://127.0.0.1:4200"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Healthz
	// @Summary Health check
	// @Tags health
	// @Success 200 {string} string "ok"
	// @Router /healthz [get]
	r.GET("/healthz", func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	api := r.Group("/api/v1")
	mountAuthRoutes(api, cfg, db)
	mountEventRoutes(api, cfg, db)

	// Swagger UI
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	return r
}
