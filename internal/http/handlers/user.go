package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/evoplanner/backend/internal/config"
)

type UserHandler struct {
	cfg config.Config
	db  *sql.DB
}

func NewUserHandler(cfg config.Config, db *sql.DB) *UserHandler {
	return &UserHandler{cfg: cfg, db: db}
}

// SearchUsers
// @Summary Search users by email or name
// @Description Returns a limited list of users matching the given query. Useful before inviting people to events.
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param q query string true "Search query applied to email, first name, or last name"
// @Param limit query int false "Maximum number of results to return (default 20, max 50)"
// @Param offset query int false "Number of results to skip (for pagination)"
// @Success 200 {array} object "List of matching users"
// @Failure 400 {object} map[string]string "Missing or invalid query"
// @Failure 500 {object} map[string]string "Database error"
// @Router /users [get]
func (h *UserHandler) SearchUsers(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	if len(q) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query 'q' is required and must be at least 2 characters"})
		return
	}

	// Pagination
	limit := 20
	offset := 0
	if v := strings.TrimSpace(c.Query("limit")); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			if parsed > 50 {
				parsed = 50
			}
			limit = parsed
		}
	}
	if v := strings.TrimSpace(c.Query("offset")); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	like := "%" + q + "%"

	rows, err := h.db.Query(`
		SELECT id, email, first_name, last_name
		FROM users
		WHERE email LIKE ? OR first_name LIKE ? OR last_name LIKE ?
		ORDER BY first_name, last_name
		LIMIT ? OFFSET ?
	`, like, like, like, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	defer rows.Close()

	type userResult struct {
		ID        uint64 `json:"id"`
		Email     string `json:"email"`
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
	}

	var out []userResult
	for rows.Next() {
		var u userResult
		if err := rows.Scan(&u.ID, &u.Email, &u.FirstName, &u.LastName); err != nil {
			continue
		}
		out = append(out, u)
	}

	c.JSON(http.StatusOK, out)
}
