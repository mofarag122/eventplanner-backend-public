package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/evoplanner/backend/internal/config"
	"github.com/evoplanner/backend/internal/domains"
)

type EventHandler struct {
	cfg config.Config
	db  *sql.DB
}

func NewEventHandler(cfg config.Config, db *sql.DB) *EventHandler {
	return &EventHandler{cfg: cfg, db: db}
}

// CreateEventRequest payload
type CreateEventRequest struct {
	Title       string                `json:"title" binding:"required"`
	Description string                `json:"description" binding:"required"`
	StartsAt    time.Time             `json:"startsAt" binding:"required"`
	EndsAt      *time.Time            `json:"endsAt"`
	Location    domains.EventLocation `json:"location" binding:"required"`
}

// InviteRequest payload
type InviteRequest struct {
	Email string                 `json:"email" binding:"required,email"`
	Role  domains.InvitationRole `json:"role" binding:"required"` // collaborator or attendee
}

// RespondInvitationRequest payload
type RespondInvitationRequest struct {
	Response domains.InvitationResponse `json:"response" binding:"required,oneof=going maybe not_going"`
}

// CreateEvent
// @Summary Create a new event
// @Description Creates a location, the event itself, and assigns the creator as the organizer.
// @Tags events
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body handlers.CreateEventRequest true "Event creation details"
// @Success 201 {object} map[string]interface{} "Returns event ID"
// @Failure 400 {object} map[string]string "Invalid input"
// @Failure 500 {object} map[string]string "Database error"
// @Router /events [post]
func (h *EventHandler) Create(c *gin.Context) {
	userID := c.MustGet("userID").(uint64)
	var req CreateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	defer tx.Rollback()

	// Insert Location
	resLoc, err := tx.Exec(`
		INSERT INTO event_locations (city_id, region, street, building_number, apartment_number, postal_code, latitude, longitude, notes)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		req.Location.CityID, req.Location.Region, req.Location.Street, req.Location.BuildingNumber,
		req.Location.ApartmentNumber, req.Location.PostalCode, req.Location.Latitude, req.Location.Longitude, req.Location.Notes,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save location"})
		return
	}
	locID, _ := resLoc.LastInsertId()

	// Insert Event
	resEvt, err := tx.Exec(`
		INSERT INTO events (title, description, starts_at, ends_at, location_id, organizer_id)
		VALUES (?, ?, ?, ?, ?, ?)`,
		req.Title, req.Description, req.StartsAt, req.EndsAt, locID, userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save event"})
		return
	}
	evtID, _ := resEvt.LastInsertId()

	// Add Creator as Member (Role: Organizer)
	_, err = tx.Exec(`INSERT INTO event_members (event_id, user_id, role) VALUES (?, ?, ?)`,
		evtID, userID, domains.RoleOrganizer)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to set organizer"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "transaction failed"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": evtID, "message": "event created"})
}

// ListMyEvents
// @Summary List events for the current user
// @Description Returns events where the user is either the organizer or a confirmed attendee. Supports optional filtering.
// @Tags events
// @Produce json
// @Security BearerAuth
// @Param q query string false "Keyword search over event title and description"
// @Param role query string false "Filter by the user's role in the event (organizer, collaborator, attendee)"
// @Param from query string false "Filter events starting on or after this date (YYYY-MM-DD)"
// @Param to query string false "Filter events starting on or before this date (YYYY-MM-DD)"
// @Param limit query int false "Maximum number of results to return (default 50, max 100)"
// @Param offset query int false "Number of results to skip (for pagination)"
// @Success 200 {array} object "List of event summaries"
// @Failure 500 {object} map[string]string "Database error"
// @Failure 400 {object} map[string]string "Invalid filters"
// @Router /events [get]
func (h *EventHandler) ListMyEvents(c *gin.Context) {
	userID := c.MustGet("userID").(uint64)

	// --- Parse filters from query params ---
	q := strings.TrimSpace(c.Query("q"))
	roleParam := strings.TrimSpace(c.Query("role"))
	fromStr := strings.TrimSpace(c.Query("from"))
	toStr := strings.TrimSpace(c.Query("to"))

	// Pagination params
	limit := 50
	offset := 0
	if v := strings.TrimSpace(c.Query("limit")); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			if parsed > 100 {
				parsed = 100
			}
			limit = parsed
		}
	}
	if v := strings.TrimSpace(c.Query("offset")); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	var filters []string
	var args []interface{}

	// Base filter: events where the current user is a member
	filters = append(filters, "em.user_id = ?")
	args = append(args, userID)

	// Optional role filter
	if roleParam != "" {
		switch domains.EventRole(roleParam) {
		case domains.RoleOrganizer, domains.RoleCollaborator, domains.RoleAttendee:
			filters = append(filters, "em.role = ?")
			args = append(args, roleParam)
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role filter"})
			return
		}
	}

	// Optional keyword search over title + description
	if q != "" {
		like := "%" + q + "%"
		filters = append(filters, "(e.title LIKE ? OR e.description LIKE ?)")
		args = append(args, like, like)
	}

	const dateLayout = "2006-01-02"

	// Optional date-from filter (inclusive)
	if fromStr != "" {
		fromTime, err := time.Parse(dateLayout, fromStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid 'from' date format, expected YYYY-MM-DD"})
			return
		}
		filters = append(filters, "e.starts_at >= ?")
		args = append(args, fromTime)
	}

	// Optional date-to filter (inclusive, end-of-day)
	if toStr != "" {
		toDate, err := time.Parse(dateLayout, toStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid 'to' date format, expected YYYY-MM-DD"})
			return
		}
		// Add one day and use "< next day" to include the entire 'to' day.
		toEnd := toDate.Add(24 * time.Hour)
		filters = append(filters, "e.starts_at < ?")
		args = append(args, toEnd)
	}

	// Build WHERE clause
	where := ""
	if len(filters) > 0 {
		where = "WHERE " + strings.Join(filters, " AND ")
	}

	query := `
		SELECT e.id, e.title, e.starts_at, e.organizer_id, em.role
		FROM events e
		JOIN event_members em ON e.id = em.event_id
		` + where + `
		ORDER BY e.starts_at DESC
		LIMIT ? OFFSET ?`

	args = append(args, limit, offset)

	rows, err := h.db.Query(query, args...)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch events"})
		return
	}
	defer rows.Close()

	type EventSummary struct {
		ID          uint64            `json:"id"`
		Title       string            `json:"title"`
		StartsAt    time.Time         `json:"startsAt"`
		MyRole      domains.EventRole `json:"myRole"`
		IsOrganizer bool              `json:"isOrganizer"`
	}

	var events []EventSummary
	for rows.Next() {
		var e EventSummary
		var orgID uint64
		if err := rows.Scan(&e.ID, &e.Title, &e.StartsAt, &orgID, &e.MyRole); err != nil {
			continue
		}
		e.IsOrganizer = (orgID == userID)
		events = append(events, e)
	}

	c.JSON(http.StatusOK, events)
}

// InviteUser
// @Summary Invite a user to an event
// @Description Sends an invitation to a user by email. Only the organizer can do this.
// @Tags events
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Event ID"
// @Param request body handlers.InviteRequest true "Invitee email and role"
// @Success 200 {object} map[string]string "Invitation sent"
// @Failure 403 {object} map[string]string "Forbidden (not the organizer)"
// @Failure 404 {object} map[string]string "User or Event not found"
// @Failure 409 {object} map[string]string "User already invited"
// @Router /events/{id}/invite [post]
func (h *EventHandler) InviteUser(c *gin.Context) {
	userID := c.MustGet("userID").(uint64)
	eventID := c.Param("id")

	var req InviteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if requester is the organizer
	var organizerID uint64
	err := h.db.QueryRow("SELECT organizer_id FROM events WHERE id = ?", eventID).Scan(&organizerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}
	if organizerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only organizer can invite"})
		return
	}

	// Find Invitee ID
	var inviteeID uint64
	err = h.db.QueryRow("SELECT id FROM users WHERE email = ?", req.Email).Scan(&inviteeID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "user with this email does not exist"})
		return
	}

	// Create Invitation
	_, err = h.db.Exec(`
		INSERT INTO invitations (event_id, inviter_id, invitee_id, invited_as, response)
		VALUES (?, ?, ?, ?, 'pending')`,
		eventID, userID, inviteeID, req.Role,
	)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "user likely already invited or is organizer"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "invitation sent"})
}

// ListInvitations
// @Summary Get invitations for the current user
// @Description Returns a list of invitations for the logged-in user. Supports search and status filters.
// @Tags invitations
// @Produce json
// @Security BearerAuth
// @Param q query string false "Keyword search over event title or inviter name"
// @Param status query string false "Filter by invitation status (pending, going, maybe, not_going)"
// @Param limit query int false "Maximum number of results to return (default 50, max 100)"
// @Param offset query int false "Number of results to skip (for pagination)"
// @Success 200 {array} object "List of invitations"
// @Failure 500 {object} map[string]string "Database error"
// @Router /invitations [get]
func (h *EventHandler) ListInvitations(c *gin.Context) {
	userID := c.MustGet("userID").(uint64)

	q := strings.TrimSpace(c.Query("q"))
	status := strings.TrimSpace(c.Query("status"))

	limit := 50
	offset := 0
	if v := strings.TrimSpace(c.Query("limit")); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			if parsed > 100 {
				parsed = 100
			}
			limit = parsed
		}
	}
	if v := strings.TrimSpace(c.Query("offset")); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	var filters []string
	var args []interface{}

	filters = append(filters, "i.invitee_id = ?")
	args = append(args, userID)

	// Optional status filter
	if status != "" {
		switch domains.InvitationResponse(status) {
		case domains.ResponsePending, domains.ResponseGoing, domains.ResponseMaybe, domains.ResponseNotGoing:
			filters = append(filters, "i.response = ?")
			args = append(args, status)
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status filter"})
			return
		}
	} else {
		// Default to pending only (previous behavior)
		filters = append(filters, "i.response = 'pending'")
	}

	// Optional keyword search over event title or inviter name
	if q != "" {
		like := "%" + q + "%"
		filters = append(filters, "(e.title LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)")
		args = append(args, like, like, like)
	}

	where := ""
	if len(filters) > 0 {
		where = "WHERE " + strings.Join(filters, " AND ")
	}

	query := `
		SELECT i.id, i.event_id, e.title, u.first_name, u.last_name, i.invited_as
		FROM invitations i
		JOIN events e ON i.event_id = e.id
		JOIN users u ON i.inviter_id = u.id
		` + where + `
		ORDER BY i.id DESC
		LIMIT ? OFFSET ?`

	args = append(args, limit, offset)

	rows, err := h.db.Query(query, args...)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	defer rows.Close()

	type InviteSummary struct {
		ID        uint64 `json:"invitationId"`
		EventID   uint64 `json:"eventId"`
		EventName string `json:"eventName"`
		Inviter   string `json:"inviterName"`
		Role      string `json:"role"`
	}

	var invites []InviteSummary
	for rows.Next() {
		var i InviteSummary
		var fName, lName string
		rows.Scan(&i.ID, &i.EventID, &i.EventName, &fName, &lName, &i.Role)
		i.Inviter = fName + " " + lName
		invites = append(invites, i)
	}

	c.JSON(http.StatusOK, invites)
}

// RespondToInvitation
// @Summary Accept or decline an invitation
// @Description Updates invitation status. If 'going', adds user to event members.
// @Tags invitations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Invitation ID"
// @Param request body handlers.RespondInvitationRequest true "Response (going, maybe, not_going)"
// @Success 200 {object} map[string]string "Response recorded"
// @Failure 400 {object} map[string]string "Invalid input"
// @Failure 404 {object} map[string]string "Invitation not found or not yours"
// @Router /invitations/{id}/respond [post]
func (h *EventHandler) RespondToInvitation(c *gin.Context) {
	userID := c.MustGet("userID").(uint64)
	invitationID := c.Param("id")

	var req RespondInvitationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	defer tx.Rollback()

	// Verify invitation belongs to user
	var eventID uint64
	var role domains.EventRole
	err = tx.QueryRow(`SELECT event_id, invited_as FROM invitations WHERE id = ? AND invitee_id = ?`,
		invitationID, userID).Scan(&eventID, &role)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "invitation not found"})
		return
	}

	// Update Invitation Status
	_, err = tx.Exec(`UPDATE invitations SET response = ?, responded_at = NOW() WHERE id = ?`,
		req.Response, invitationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update invitation"})
		return
	}

	// If Going, Add to Event Members
	switch req.Response {
	case domains.ResponseGoing:
		_, err = tx.Exec(`INSERT INTO event_members (event_id, user_id, role) VALUES (?, ?, ?) 
			ON DUPLICATE KEY UPDATE role = VALUES(role)`, // Handle re-joins
			eventID, userID, role)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add to event"})
			return
		}
	case domains.ResponseNotGoing:
		// Ensure they are removed if they were previously a member
		tx.Exec(`DELETE FROM event_members WHERE event_id = ? AND user_id = ?`, eventID, userID)
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "response recorded"})
}

// GetEventDetails
// @Summary Get full event details
// @Description Returns event info, location data, and a list of attendees.
// @Tags events
// @Produce json
// @Security BearerAuth
// @Param id path int true "Event ID"
// @Success 200 {object} map[string]interface{} "Event, Location, and Attendees"
// @Failure 404 {object} map[string]string "Event not found"
// @Router /events/{id} [get]
func (h *EventHandler) GetEventDetails(c *gin.Context) {
	eventID := c.Param("id")

	// Fetch Event Basic Info
	var e domains.Event
	var l domains.EventLocation
	// Note: Shortened query for brevity, in production query all fields
	err := h.db.QueryRow(`
		SELECT e.id, e.title, e.description, e.starts_at, e.ends_at, e.organizer_id,
		       el.id, el.city_id, el.street, el.building_number
		FROM events e
		JOIN event_locations el ON e.location_id = el.id
		WHERE e.id = ?`, eventID).Scan(
		&e.ID, &e.Title, &e.Description, &e.StartsAt, &e.EndsAt, &e.OrganizerID,
		&l.ID, &l.CityID, &l.Street, &l.BuildingNumber,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}

	// Fetch Attendees
	rows, _ := h.db.Query(`
		SELECT u.id, u.email, u.first_name, u.last_name, em.role 
		FROM event_members em
		JOIN users u ON em.user_id = u.id
		WHERE em.event_id = ?`, eventID)

	type Attendee struct {
		ID    uint64 `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
		Role  string `json:"role"`
	}
	var attendees []Attendee
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var (
				a     Attendee
				id64  sql.NullInt64
				email sql.NullString
				fn    sql.NullString
				ln    sql.NullString
				r     sql.NullString
			)

			rows.Scan(&id64, &email, &fn, &ln, &r)
			a.Email = email.String
			a.Name = strings.Join([]string{fn.String, ln.String}, " ")
			a.Role = r.String
			attendees = append(attendees, a)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"event":     e,
		"location":  l,
		"attendees": attendees,
	})
}

// Delete handles event deletion
// @Summary Delete an event
// @Description Permanently removes an event. Only the organizer can do this.
// @Tags events
// @Produce json
// @Security BearerAuth
// @Param id path int true "Event ID"
// @Success 200 {object} map[string]string "Event deleted"
// @Failure 403 {object} map[string]string "Forbidden (not the organizer)"
// @Failure 404 {object} map[string]string "Event not found"
// @Failure 500 {object} map[string]string "Database error"
// @Router /events/{id} [delete]
func (h *EventHandler) Delete(c *gin.Context) {
	userID := c.MustGet("userID").(uint64)
	eventID := c.Param("id")

	// Check ownership
	var organizerID uint64
	err := h.db.QueryRow("SELECT organizer_id FROM events WHERE id = ?", eventID).Scan(&organizerID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}
	if organizerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only organizer can delete this event"})
		return
	}

	// Delete
	// Because we defined ON DELETE CASCADE in SQL for invitations and members,
	// deleting the event automatically cleans up those tables!
	_, err = h.db.Exec("DELETE FROM events WHERE id = ?", eventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "event deleted successfully"})
}

// ListEventGuests
// @Summary Get full guest list with statuses
// @Description Returns the status of all invited users (Pending, Going, Maybe, Not Going). Restricted to the Organizer. Supports optional filtering.
// @Tags events
// @Produce json
// @Security BearerAuth
// @Param id path int true "Event ID"
// @Param q query string false "Keyword search over guest name or email"
// @Param role query string false "Filter by invited role (collaborator, attendee)"
// @Param limit query int false "Maximum number of results to return (default 50, max 100)"
// @Param offset query int false "Number of results to skip (for pagination)"
// @Success 200 {array} object "List of guests with status"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 500 {object} map[string]string "Database error"
// @Router /events/{id}/guests [get]
func (h *EventHandler) ListEventGuests(c *gin.Context) {
	userID := c.MustGet("userID").(uint64)
	eventID := c.Param("id")

	// Verify Requestor is Organizer
	var organizerID uint64
	err := h.db.QueryRow("SELECT organizer_id FROM events WHERE id = ?", eventID).Scan(&organizerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}
	if organizerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only organizer can view detailed guest list"})
		return
	}

	// Optional filters
	q := strings.TrimSpace(c.Query("q"))
	roleParam := strings.TrimSpace(c.Query("role"))

	// Pagination
	limit := 50
	offset := 0
	if v := strings.TrimSpace(c.Query("limit")); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			if parsed > 100 {
				parsed = 100
			}
			limit = parsed
		}
	}
	if v := strings.TrimSpace(c.Query("offset")); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	var filters []string
	var args []interface{}

	filters = append(filters, "i.event_id = ?")
	args = append(args, eventID)

	if roleParam != "" {
		switch domains.InvitationRole(roleParam) {
		case domains.InvitedAsCollaborator, domains.InvitedAsAttendee:
			filters = append(filters, "i.invited_as = ?")
			args = append(args, roleParam)
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role filter"})
			return
		}
	}

	if q != "" {
		like := "%" + q + "%"
		filters = append(filters, `(u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)`)
		args = append(args, like, like, like)
	}

	where := ""
	if len(filters) > 0 {
		where = "WHERE " + strings.Join(filters, " AND ")
	}

	query := `
		SELECT u.id, u.first_name, u.last_name, u.email, i.response, i.invited_as
		FROM invitations i
		JOIN users u ON i.invitee_id = u.id
		` + where + `
		ORDER BY u.first_name, u.last_name
		LIMIT ? OFFSET ?`

	args = append(args, limit, offset)

	// Query Invitations
	rows, err := h.db.Query(query, args...)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	defer rows.Close()

	type Guest struct {
		ID     uint64 `json:"id"`
		Name   string `json:"name"`
		Email  string `json:"email"`
		Status string `json:"status"`
		Role   string `json:"role"`
	}

	var guests []Guest
	for rows.Next() {
		var g Guest
		var fName, lName string
		if err := rows.Scan(&g.ID, &fName, &lName, &g.Email, &g.Status, &g.Role); err != nil {
			continue
		}
		g.Name = fName + " " + lName
		guests = append(guests, g)
	}

	c.JSON(http.StatusOK, guests)
}
