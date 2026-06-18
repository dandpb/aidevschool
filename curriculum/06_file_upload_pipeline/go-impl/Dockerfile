FROM golang:1.21-alpine AS build
WORKDIR /src
COPY go.mod .
COPY . .
RUN go test ./... && go build -trimpath -ldflags="-s -w" -o /out/file-upload-go .

FROM alpine:3.19
RUN adduser -D app
USER app
WORKDIR /app
COPY --from=build /out/file-upload-go /app/file-upload-go
EXPOSE 8086
ENTRYPOINT ["/app/file-upload-go"]
