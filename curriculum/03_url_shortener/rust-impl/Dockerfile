FROM rust:1.81-alpine AS builder
WORKDIR /app
RUN apk add --no-cache musl-dev
COPY Cargo.toml ./
COPY src ./src
RUN cargo build --release

FROM alpine:3.19
RUN adduser -D -H appuser
USER appuser
COPY --from=builder /app/target/release/url-shortener-rust /url-shortener-rust
EXPOSE 8082
ENTRYPOINT ["/url-shortener-rust"]
