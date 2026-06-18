FROM golang:1.21-alpine AS build
WORKDIR /app
COPY go.mod ./
COPY *.go ./
RUN go test ./... && go build -trimpath -ldflags="-s -w" -o order-system .

FROM alpine:3.19
WORKDIR /app
COPY --from=build /app/order-system /app/order-system
EXPOSE 8080
CMD ["/app/order-system"]
