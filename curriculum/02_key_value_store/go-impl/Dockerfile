FROM golang:1.21-alpine AS builder
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
RUN go test ./... && go build -trimpath -ldflags="-s -w" -o /out/kvstore ./cmd/kvstore

FROM alpine:3.19
RUN adduser -D -H appuser
USER appuser
COPY --from=builder /out/kvstore /usr/local/bin/kvstore
EXPOSE 8080
ENTRYPOINT ["kvstore"]
