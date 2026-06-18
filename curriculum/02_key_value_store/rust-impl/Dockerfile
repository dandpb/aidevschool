FROM rust:1.81-alpine AS builder
RUN apk add --no-cache musl-dev
WORKDIR /src
COPY Cargo.toml ./
COPY src ./src
RUN cargo test && cargo build --release

FROM alpine:3.19
RUN adduser -D -H appuser
USER appuser
COPY --from=builder /src/target/release/key-value-store-rust /usr/local/bin/key-value-store-rust
EXPOSE 8082
ENTRYPOINT ["key-value-store-rust"]
