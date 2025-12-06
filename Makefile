SHELL := /usr/bin/bash

# Install swag CLI locally
.PHONY: swag-install
swag-install:
	go install github.com/swaggo/swag/cmd/swag@latest

# Generate Swagger docs from annotations
.PHONY: swagger
swagger:
	swag init -g ./cmd/server/main.go -o ./docs

.PHONY: tidy
tidy:
	go mod tidy

.PHONY: build
build:
	go build ./...

.PHONY: run
run:
	go run ./cmd/server

.PHONY: clean-docs
clean-docs:
	rm -rf ./docs/*.go ./docs/swagger.json ./docs/swagger.yaml
