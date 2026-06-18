FROM rust:1.81-alpine AS build
WORKDIR /app
RUN apk add --no-cache musl-dev
COPY Cargo.toml ./
COPY src ./src
COPY tests ./tests
RUN cargo test && cargo build --release

FROM alpine:3.19
WORKDIR /app
COPY --from=build /app/target/release/plugin-system-rust /app/plugin-system-rust
CMD ["/app/plugin-system-rust"]
