FROM rust:1.75-alpine AS builder

WORKDIR /app

RUN apk add --no-cache musl-dev

COPY Cargo.toml Cargo.lock ./
COPY src/ ./src/

RUN cargo build --release

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/target/release/mini-message-queue-rust .

EXPOSE 8080
CMD ["./mini-message-queue-rust"]
