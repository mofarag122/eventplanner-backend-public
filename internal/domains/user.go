package domains

type User struct {
	ID           uint64  `json:"id"`
	FirstName    *string `json:"firstName,omitempty"`
	LastName     *string `json:"lastName,omitempty"`
	Email        string  `json:"email"`
	PasswordHash string  `json:"-"`
}
