FROM rust:1.82-slim AS build
WORKDIR /app
COPY Cargo.toml ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=build /app/target/release/websocket-chat-rust ./websocket-chat-rust
EXPOSE 8085
CMD ["./websocket-chat-rust"]
