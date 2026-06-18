FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod ./
COPY . ./
RUN go test ./... && go build -o /load-balancer ./cmd/server

FROM alpine:3.20
COPY --from=build /load-balancer /usr/local/bin/load-balancer
EXPOSE 8080
CMD ["load-balancer"]
