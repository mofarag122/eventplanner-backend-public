# Evoplan

Go + MySQL service exposing signup and login APIs.

## Requirements

- Go 1.22+
- MySQL 8+

## Configuration (env)

- `HTTP_PORT` (default: `8080`)
- `DB_HOST` (default: `127.0.0.1`)
- `DB_PORT` (default: `3306`)
- `DB_USER` (default: `root`)
- `DB_PASS` (default: empty)
- `DB_NAME` (default: `eventplanner`)
- `JWT_SECRET` (default: dev value; change in production)
- `JWT_ISSUER` (default: `eventplanner`)

## Database

On startup, the service creates the `users` table if it does not exist.

```sql
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email)
);
```

## Run

```bash
go mod tidy
go run ./cmd/server
```

## API

Base path: `/api/v1`

- POST `/auth/signup`

  - Body: `{ "email": string, "password": string }`
  - 201: `{ "id": number, "email": string }`

- POST `/auth/login`
  - Body: `{ "email": string, "password": string }`
  - 200: `{ "access_token": string, "token_type": "Bearer", "expires_in": number }`

OpenAPI: see `openapi.yaml`.
