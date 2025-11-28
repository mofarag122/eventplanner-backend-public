package domains

import "time"

type EventRole string

const (
	RoleOrganizer    EventRole = "organizer"
	RoleCollaborator EventRole = "collaborator"
	RoleAttendee     EventRole = "attendee"
)

type InvitationRole string

const (
	InvitedAsCollaborator InvitationRole = "collaborator"
	InvitedAsAttendee     InvitationRole = "attendee"
)

type InvitationResponse string

const (
	ResponsePending  InvitationResponse = "pending"
	ResponseGoing    InvitationResponse = "going"
	ResponseMaybe    InvitationResponse = "maybe"
	ResponseNotGoing InvitationResponse = "not_going"
)

type Event struct {
	ID          uint64     `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	StartsAt    time.Time  `json:"startsAt"`
	EndsAt      *time.Time `json:"endsAt"`
	LocationID  uint64     `json:"locationId"`
	OrganizerID uint64     `json:"organizerId"`
}

type EventMember struct {
	ID      uint64    `json:"id"`
	EventID uint64    `json:"eventId"`
	UserID  uint64    `json:"userId"`
	Role    EventRole `json:"role"`
}

type Invitation struct {
	ID          uint64             `json:"id"`
	EventID     uint64             `json:"eventId"`
	InviterID   uint64             `json:"inviterId"`
	InviteeID   uint64             `json:"inviteeId"`
	InvitedAs   InvitationRole     `json:"invitedAs"`
	Message     *string            `json:"message"`
	Response    InvitationResponse `json:"response"`
	RespondedAt *time.Time         `json:"respondedAt"`
}
