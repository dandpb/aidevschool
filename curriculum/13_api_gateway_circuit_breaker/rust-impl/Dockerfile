FROM rust:1.81-alpine AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
COPY tests ./tests
RUN cargo build --release

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/target/release/api-gateway-rust .
EXPOSE 8080
CMD ["./api-gateway-rust"]
