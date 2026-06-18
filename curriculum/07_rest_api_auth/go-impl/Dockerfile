FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN go test -race -cover ./... && go build -o /server ./cmd/server

FROM alpine:3.20
WORKDIR /app
ENV PORT=8080
COPY --from=build /server /server
EXPOSE 8080
CMD ["/server"]
