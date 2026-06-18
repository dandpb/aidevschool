FROM golang:1.21-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -trimpath -ldflags="-s -w" -o /out/concurrent-task-queue-go .

FROM alpine:3.20
WORKDIR /app
COPY --from=build /out/concurrent-task-queue-go /app/concurrent-task-queue-go
EXPOSE 8083
ENTRYPOINT ["/app/concurrent-task-queue-go"]
