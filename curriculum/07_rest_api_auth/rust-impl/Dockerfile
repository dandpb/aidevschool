FROM rust:1.78-slim AS build
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN cargo test && cargo clippy --all-targets -- -D warnings && cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=build /app/target/release/rest-api-auth-rust /usr/local/bin/rest-api-auth-rust
EXPOSE 8080
CMD ["rest-api-auth-rust"]
