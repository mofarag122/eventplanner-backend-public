package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/evoplanner/backend/internal/config"
)

type LocationHandler struct {
	cfg config.Config
	db  *sql.DB
}

func NewLocationHandler(cfg config.Config, db *sql.DB) *LocationHandler {
	return &LocationHandler{cfg: cfg, db: db}
}

// GET /cities?query=...
func (h *LocationHandler) SearchCities(c *gin.Context) {
	q := c.Query("query")
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query param required"})
		return
	}

	// Use a parameterized query and prefix/suffix wildcards for LIKE search.
	rows, err := h.db.Query(`
		SELECT c.id, c.name, co.name
		FROM cities c
		JOIN countries co ON co.id = c.country_id
		WHERE c.name LIKE ?
		ORDER BY c.name
		LIMIT 50
	`, "%"+q+"%")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	defer rows.Close()

	type CityResp struct {
		ID      uint64 `json:"id"`
		Name    string `json:"name"`
		Country string `json:"country"`
	}

	var out []CityResp
	for rows.Next() {
		var r CityResp
		if err := rows.Scan(&r.ID, &r.Name, &r.Country); err != nil {
			continue
		}
		out = append(out, r)
	}

	c.JSON(http.StatusOK, out)
}

// GET /cities/reverse?lat=...&lng=...
// Tries to find the nearest city using event_locations as a proxy (best-effort).
func (h *LocationHandler) ReverseGeocode(c *gin.Context) {
	lat := c.Query("lat")
	lng := c.Query("lng")
	if lat == "" || lng == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "lat and lng required"})
		return
	}

	// Select the city whose associated event_location coords are the closest to the provided coords.
	// This is a pragmatic fallback when you don't have a dedicated city coordinates table.
	row := h.db.QueryRow(`
		SELECT c.id, c.name, co.name
		FROM cities c
		JOIN countries co ON co.id = c.country_id
		JOIN event_locations el ON el.city_id = c.id
		ORDER BY POW(el.latitude - ?, 2) + POW(el.longitude - ?, 2) ASC
		LIMIT 1
	`, lat, lng)

	var id uint64
	var name, country string
	if err := row.Scan(&id, &name, &country); err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "no nearby city found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": id, "name": name, "country": country})
}
