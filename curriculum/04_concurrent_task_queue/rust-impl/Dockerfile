FROM rust:1.82-slim AS build
WORKDIR /src
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=build /src/target/release/concurrent-task-queue-rust /app/concurrent-task-queue-rust
EXPOSE 8084
ENTRYPOINT ["/app/concurrent-task-queue-rust"]
