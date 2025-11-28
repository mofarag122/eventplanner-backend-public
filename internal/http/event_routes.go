package http

import (
	"database/sql"

	"github.com/gin-gonic/gin"

	"github.com/evoplanner/backend/internal/config"
	"github.com/evoplanner/backend/internal/http/handlers"
	"github.com/evoplanner/backend/internal/http/middleware"
)

func mountEventRoutes(r *gin.RouterGroup, cfg config.Config, db *sql.DB) {
	h := handlers.NewEventHandler(cfg, db)

	locHandler := handlers.NewLocationHandler(cfg, db)
	r.GET("/cities", func(c *gin.Context) { locHandler.SearchCities(c) })
	r.GET("/cities/reverse", func(c *gin.Context) { locHandler.ReverseGeocode(c) })

	authMW := middleware.AuthMiddleware(cfg)

	// Protected Routes
	events := r.Group("/events")
	events.Use(authMW)
	{
		events.POST("", func(c *gin.Context) { h.Create(c) })
		events.GET("", func(c *gin.Context) { h.ListMyEvents(c) })
		events.GET("/:id", func(c *gin.Context) { h.GetEventDetails(c) })
		events.DELETE("/:id", func(c *gin.Context) { h.Delete(c) })
		events.GET("/:id/guests", func(c *gin.Context) { h.ListEventGuests(c) })
		events.POST("/:id/invite", func(c *gin.Context) { h.InviteUser(c) })
	}

	invitations := r.Group("/invitations")
	invitations.Use(authMW)
	{
		invitations.GET("", func(c *gin.Context) { h.ListInvitations(c) })
		invitations.POST("/:id/respond", func(c *gin.Context) { h.RespondToInvitation(c) })
	}
}
