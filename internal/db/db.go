package db

import (
	"database/sql"
	"fmt"

	_ "github.com/go-sql-driver/mysql"

	"github.com/evoplanner/backend/internal/config"
)

func Open(cfg config.Config) (*sql.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&multiStatements=true&charset=utf8mb4,utf8",
		cfg.DBUser, cfg.DBPass, cfg.DBHost, cfg.DBPort, cfg.DBName,
	)
	database, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}
	if err := database.Ping(); err != nil {
		return nil, err
	}
	return database, nil
}

func RunMigrations(db *sql.DB) error {
	_, err := db.Exec(`
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  INDEX idx_users_first_name (first_name),
  INDEX idx_users_last_name (last_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS countries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  iso3 CHAR(3) NOT NULL,
  iso2 CHAR(2) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_countries_name (name),
  UNIQUE KEY uk_countries_iso3 (iso3),
  UNIQUE KEY uk_countries_iso2 (iso2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  country_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cities_country_name (country_id, name),
  INDEX idx_cities_name (name),
  FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_locations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  city_id BIGINT UNSIGNED NOT NULL,
  region VARCHAR(100),
  street VARCHAR(255) NOT NULL,
  building_number VARCHAR(50) NOT NULL,
  apartment_number VARCHAR(50),
  postal_code VARCHAR(20),
  latitude DOUBLE NOT NULL,
  longitude DOUBLE NOT NULL,
  notes TEXT,
  PRIMARY KEY(id),
  UNIQUE KEY uk_event_locations_coords(latitude,longitude),
  INDEX idx_event_locations_city(city_id),
  INDEX idx_event_locations_street(street),
  FOREIGN KEY(city_id) REFERENCES cities(id) ON DELETE RESTRICT,
  CHECK(latitude BETWEEN -90 AND 90),
  CHECK(longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME,
  location_id BIGINT UNSIGNED NOT NULL,
  organizer_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_events_title (title),
  INDEX idx_events_starts_at (starts_at),
  INDEX idx_events_organizer (organizer_id),
  INDEX idx_events_location (location_id),
  INDEX idx_events_dates (starts_at, ends_at),
  FOREIGN KEY (location_id) REFERENCES event_locations(id) ON DELETE RESTRICT,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE RESTRICT,
  CHECK (ends_at IS NULL OR ends_at > starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('organizer', 'collaborator', 'attendee') NOT NULL,  
  PRIMARY KEY (id),
  UNIQUE KEY uk_event_members_event_user (event_id, user_id),
  INDEX idx_event_members_user (user_id),
  INDEX idx_event_members_role (role),
  INDEX idx_event_members_event_role (event_id, role),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invitations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  inviter_id BIGINT UNSIGNED NOT NULL,
  invitee_id BIGINT UNSIGNED NOT NULL,
  invited_as ENUM('collaborator','attendee') NOT NULL DEFAULT 'attendee',
  message TEXT,
  response ENUM('pending','going','maybe','not_going') NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMP,
  PRIMARY KEY(id),
  UNIQUE KEY uk_invitations_event_invitee(event_id,invitee_id),
  INDEX idx_invitations_inviter(inviter_id),
  INDEX idx_invitations_invitee(invitee_id),
  INDEX idx_invitations_event(event_id),
  INDEX idx_invitations_response(response),
  INDEX idx_invitations_event_response(event_id,response),
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY(inviter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(invitee_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK(inviter_id!=invitee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`)
	return err
}
