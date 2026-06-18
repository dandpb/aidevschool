FROM golang:1.21-alpine AS build
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN go build -trimpath -ldflags="-s -w" -o websocket-chat-go .

FROM alpine:3.20
WORKDIR /app
COPY --from=build /app/websocket-chat-go ./websocket-chat-go
EXPOSE 8085
CMD ["./websocket-chat-go"]
