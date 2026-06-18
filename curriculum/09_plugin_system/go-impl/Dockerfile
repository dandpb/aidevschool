FROM golang:1.21-alpine AS build
WORKDIR /app
COPY go.mod ./
COPY *.go ./
RUN go test ./... && go build -trimpath -ldflags="-s -w" -o plugin-system .

FROM alpine:3.19
WORKDIR /app
COPY --from=build /app/plugin-system /app/plugin-system
EXPOSE 8080
CMD ["/app/plugin-system"]
