FROM golang:1.24-alpine AS builder
RUN apk update \
    && apk upgrade \
    && apk add --no-cache git
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download \
    && go install github.com/swaggo/swag/cmd/swag@v1.16.6

COPY . .
RUN swag init -g ./cmd/server/main.go -o ./docs \
    && CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/server/main.go

FROM alpine/curl:8.14.1
RUN adduser -D evoplan
USER evoplan

WORKDIR /app
COPY --from=builder /app/main .
COPY --from=builder /app/docs ./docs

LABEL name="evoplan-api" \
    description="plan and manage events and invitations" \
    version="dev"

EXPOSE 8080

ENV HTTP_PORT=8080 \
    DB_HOST=evoplan-db \
    DB_PORT=3306 \
    DB_USER=evoplan \
    DB_PASS=evoplan \
    DB_NAME=evoplan \
    JWT_SECRET=evoplan \
    JWT_ISSUER=evoplan

ENTRYPOINT ["./main"]

