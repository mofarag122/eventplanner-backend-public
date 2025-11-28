package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/evoplanner/backend/internal/config"
	"github.com/evoplanner/backend/internal/domains"
	"github.com/evoplanner/backend/internal/security"
)

const (
	invalidCredMsg = "invalid credentials"
)

type AuthHandler struct {
	cfg config.Config
	db  *sql.DB
}

func NewAuthHandler(cfg config.Config, db *sql.DB) *AuthHandler {
	return &AuthHandler{cfg: cfg, db: db}
}

// SignupRequest represents the payload to register a new user.
type SignupRequest struct {
	FirstName *string `json:"firstName,omitempty"`
	LastName  *string `json:"lastName,omitempty"`
	Email     string  `json:"email"`
	Password  string  `json:"password"`
}

// SignupResponse is returned after creating a user.
type SignupResponse struct {
	ID    uint64 `json:"id"`
	Email string `json:"email"`
}

// Signup
// @Summary Register a new user
// @Tags auth
// @Accept json
// @Produce json
// @Param request body handlers.SignupRequest true "Signup request"
// @Success 201 {object} handlers.SignupResponse
// @Failure 400 {string} string "invalid JSON body / invalid email or password too short (min 8)"
// @Failure 409 {string} string "email already registered"
// @Failure 500 {string} string "failed to process password / failed to create user"
// @Router /auth/signup [post]
func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var req SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	if !security.IsValidEmail(req.Email) || len(req.Password) < 8 {
		http.Error(w, "invalid email or password too short (min 8)", http.StatusBadRequest)
		return
	}

	hash, err := security.HashPassword(req.Password)
	if err != nil {
		http.Error(w, "failed to process password", http.StatusInternalServerError)
		return
	}

	// Prepare first_name and last_name for insertion:
	var firstName interface{}
	var lastName interface{}

	if req.FirstName != nil {
		fn := strings.TrimSpace(*req.FirstName)
		firstName = fn // non-nil -> insert value (possibly empty string)
	} else {
		firstName = nil // nil -> INSERT NULL
	}

	if req.LastName != nil {
		ln := strings.TrimSpace(*req.LastName)
		lastName = ln
	} else {
		lastName = nil
	}

	res, err := h.db.Exec(
		`INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)`,
		firstName, lastName, req.Email, hash,
	)
	if err != nil {
		lerr := strings.ToLower(err.Error())
		if strings.Contains(lerr, "duplicate") || strings.Contains(lerr, "uk_users_email") {
			http.Error(w, "email already registered", http.StatusConflict)
			return
		}
		http.Error(w, "failed to create user", http.StatusInternalServerError)
		return
	}

	id64, _ := res.LastInsertId()

	resp := SignupResponse{ID: uint64(id64), Email: req.Email}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(resp)
}

// LoginRequest represents the payload to authenticate a user.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse is returned with the access token after successful authentication.
type LoginResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int64  `json:"expires_in"`
}

// Login
// @Summary Authenticate and obtain an access token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body handlers.LoginRequest true "Login request"
// @Success 200 {object} handlers.LoginResponse
// @Failure 400 {string} string "invalid JSON body"
// @Failure 401 {string} string "invalid credentials"
// @Failure 500 {string} string "failed to authenticate / failed to issue token"
// @Router /auth/login [post]
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}
	email := strings.TrimSpace(strings.ToLower(req.Email))
	if !security.IsValidEmail(email) || req.Password == "" {
		http.Error(w, invalidCredMsg, http.StatusUnauthorized)
		return
	}

	var u domains.User
	var firstName sql.NullString
	var lastName sql.NullString

	// select explicit columns (avoid relying on SELECT * column order)
	row := h.db.QueryRow(
		`SELECT id, first_name, last_name, email, password_hash FROM users WHERE email = ?`,
		email,
	)
	if err := row.Scan(&u.ID, &firstName, &lastName, &u.Email, &u.PasswordHash); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, invalidCredMsg, http.StatusUnauthorized)
			return
		}
		http.Error(w, "failed to authenticate", http.StatusInternalServerError)
		return
	}

	// Convert sql.NullString -> *string for domains.User fields
	if firstName.Valid {
		s := firstName.String
		u.FirstName = &s
	} else {
		u.FirstName = nil
	}
	if lastName.Valid {
		s := lastName.String
		u.LastName = &s
	} else {
		u.LastName = nil
	}

	if err := security.CheckPassword(req.Password, u.PasswordHash); err != nil {
		http.Error(w, invalidCredMsg, http.StatusUnauthorized)
		return
	}

	ttl := time.Duration(h.cfg.JWTTTLHours) * time.Hour
	claims := jwt.MapClaims{
		"sub":   u.ID,
		"email": u.Email,
		"iss":   h.cfg.JWTIssuer,
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(ttl).Unix(),
	}
	token, err := security.GenerateJWT(h.cfg.JWTSecret, claims)
	if err != nil {
		http.Error(w, "failed to issue token", http.StatusInternalServerError)
		return
	}

	resp := LoginResponse{
		AccessToken: token,
		TokenType:   "Bearer",
		ExpiresIn:   int64(ttl.Seconds()),
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}
