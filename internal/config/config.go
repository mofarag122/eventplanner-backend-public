package config

import (
	"os"
)

type Config struct {
	HTTPPort    string
	DBHost      string
	DBPort      string
	DBUser      string
	DBPass      string
	DBName      string
	JWTSecret   string
	JWTIssuer   string
	JWTTTLHours int
}

func getEnv(key, def string) string {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	return v
}

func Load() Config {
	return Config{
		HTTPPort:    getEnv("HTTP_PORT", "8080"),
		DBHost:      getEnv("DB_HOST", "127.0.0.1"),
		DBPort:      getEnv("DB_PORT", "3306"),
		DBUser:      getEnv("DB_USER", "evoplan"),
		DBPass:      getEnv("DB_PASS", "evoplan"),
		DBName:      getEnv("DB_NAME", "evoplan"),
		JWTSecret:   getEnv("JWT_SECRET", "evoplan"),
		JWTIssuer:   getEnv("JWT_ISSUER", "evoplan"),
		JWTTTLHours: 24,
	}
}
