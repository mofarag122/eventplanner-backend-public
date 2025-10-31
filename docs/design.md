# Design

## Data

### User

```json
user {
  email: string
  password: string
}
```

### Event

```json
event {
  title: string
  description: string
  date: date
  time: time
  location: location
  organized_by: user
}

location {
  latitude: float
  longitude: float
  country: country
  city: city
  street: string
  notes: string
}
```

### Invitation

```json
invitation {
  issuer: user
  invitee: user
  status: status
  type: type
}

status {
  pending,
  going,
  maybe,
  not_going
}

type {
  attend,
  collaborate
}
```

### Attendees (on status: `going` | on create event)

```json
attendees {
  user_id: user
  event_id: event
  type: type
}

type {
  attendee,
  collaborator,
  organizer
}
```

---

## API

api/v1

### Auth

| Method | Endpoint      | Description |
| :----- | :------------ | :---------- |
| POST   | `auth/signup` | Signup      |
| POST   | `auth/login`  | Login       |

### Events

| Method    | Endpoint                | Description                                    |
| :-------- | :---------------------- | :--------------------------------------------- |
| GET       | `events/`               | View user's organized events (search & filter) |
| POST      | `events/`               | Create a new event                             |
| GET       | `events/{id}/attendees` | Get attendees by event ID                      |
| PUT/PATCH | `events/{id}`           | Update event by ID                             |
| DELETE    | `events/{id}`           | Delete event by ID                             |

### Invitations

| Method | Endpoint           | Description                                                           |
| :----- | :----------------- | :-------------------------------------------------------------------- |
| GET    | `invitations/`     | View user's invitations (search & filter)                             |
| POST   | `invitations/`     | Create an invitation                                                  |
| PATCH  | `invitations/{id}` | Update invitation status (by invitee only: going / not going / maybe) |
| DELETE | `invitations/{id}` | Cancel invitation (by issuer only)                                    |

---

## Tech

- Go
- Angular
- MySQL
- Podman
- Swagger

