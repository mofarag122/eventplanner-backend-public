package security

import (
	"github.com/golang-jwt/jwt/v5"
)

func GenerateJWT(secret string, claims jwt.MapClaims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
