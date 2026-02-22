FROM golang:1.25-alpine


WORKDIR /app

# Instalar swag para generar la doc
RUN go install github.com/swaggo/swag/cmd/swag@latest

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

# GENERAR LOS ARCHIVOS DOCS ANTES DE COMPILAR
RUN swag init

RUN go build -o main .

EXPOSE 8081

CMD ["./main"]