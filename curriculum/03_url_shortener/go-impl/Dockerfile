FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
RUN go build -trimpath -ldflags="-s -w" -o /url-shortener ./cmd/server

FROM alpine:3.19
RUN adduser -D -H appuser
USER appuser
COPY --from=builder /url-shortener /url-shortener
EXPOSE 8080
ENTRYPOINT ["/url-shortener"]
