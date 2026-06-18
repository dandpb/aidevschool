FROM golang:1.22-alpine AS test
WORKDIR /app
COPY go.mod ./
COPY . .
RUN go test ./...

FROM golang:1.22-alpine
WORKDIR /app
COPY . .
EXPOSE 8080
CMD ["go", "run", "./cmd/server"]
