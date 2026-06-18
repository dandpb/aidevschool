FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod ./
COPY *.go ./
RUN CGO_ENABLED=0 go build -o search-engine .

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/search-engine .
EXPOSE 8080
CMD ["./search-engine"]
