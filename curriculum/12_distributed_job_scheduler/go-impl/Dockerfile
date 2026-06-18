FROM golang:1.22-alpine AS build

WORKDIR /app
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
RUN go test ./... && go build -o /scheduler ./cmd/scheduler

FROM alpine:3.20
WORKDIR /app
COPY --from=build /scheduler /usr/local/bin/scheduler
EXPOSE 8080
ENTRYPOINT ["scheduler"]
