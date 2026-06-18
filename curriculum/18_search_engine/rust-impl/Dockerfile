FROM rust:1.81-alpine AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src/ src/
RUN cargo build --release

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/target/release/search-engine .
EXPOSE 8080
CMD ["./search-engine"]
