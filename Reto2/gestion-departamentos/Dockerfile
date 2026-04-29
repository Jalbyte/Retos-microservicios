# ---------- BUILD STAGE ----------
FROM golang:1.25-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go install github.com/swaggo/swag/cmd/swag@latest && swag init && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o main .

# ---------- RUNTIME STAGE ----------
FROM alpine:latest

WORKDIR /app

RUN apk add --no-cache wget ca-certificates

# Crear usuario no root
RUN addgroup -S appgroup && adduser -S miguel -G appgroup

COPY --from=builder /app/main .

RUN chown -R miguel:appgroup /app

USER miguel

EXPOSE 8081

CMD ["./main"]