FROM rust:1.81-alpine AS builder

# Install build dependencies for musl-linked release binary
RUN apk add --no-cache musl-dev

WORKDIR /app

# Copy the full crate (no dep-cache trick — Dockerfile kept simple and
# correct; the build is slower but never breaks on Rust version skew)
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
COPY tests ./tests

# Build the release binary. `--locked` is not used because we ship a fresh
# Cargo.lock that may need a tiny refresh on version skew.
RUN cargo build --release

# ---- Runtime stage ----
FROM alpine:latest

# curl is handy for smoke-testing inside the image
RUN apk add --no-cache ca-certificates

WORKDIR /
COPY --from=builder /app/target/release/rate-limiter-rust /rate-limiter-rust

EXPOSE 8082
CMD ["/rate-limiter-rust"]
