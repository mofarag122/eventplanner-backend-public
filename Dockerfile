FROM golang:1.24-alpine AS builder

RUN apk update \
    && apk upgrade \
    && apk add --no-cache git

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

# Install swag with specific version to avoid memory issues
RUN go install github.com/swaggo/swag/cmd/swag@v1.16.6

COPY . .

# Generate swagger docs first
RUN swag init -g ./cmd/server/main.go -o ./docs

# Build with reduced memory usage
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o main ./cmd/server/main.go

FROM alpine:3.20

WORKDIR /app

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

# Copy artifacts
COPY --from=builder /app/main .
COPY --from=builder /app/docs ./docs

# OpenShift permission fix: allow any UID in group 0
RUN chown -R 1001:0 /app \
    && chmod -R g=u /app

# No USER directive → OpenShift injects random UID
EXPOSE 8080

LABEL name="evoplan-api" \
    description="plan and manage events and invitations" \
    version="dev"

ENTRYPOINT ["./main"]
