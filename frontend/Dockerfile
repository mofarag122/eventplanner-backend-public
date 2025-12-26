FROM node:lts-alpine3.23 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf

LABEL name="evoplan-app" \
    description="plan and manage events and invitations" \
    version="dev"

EXPOSE 80

ENTRYPOINT ["nginx", "-g", "daemon off;"]

