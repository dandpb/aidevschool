FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy everything: go.mod, main.go, and the ratelimit/ package.
COPY go.mod ./
COPY main.go ./
COPY ratelimit/ ./ratelimit/

# Build a fully static binary so the runtime image can be a minimal alpine.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/rate-limiter-go .

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /out/rate-limiter-go .

EXPOSE 8080
CMD ["./rate-limiter-go"]
