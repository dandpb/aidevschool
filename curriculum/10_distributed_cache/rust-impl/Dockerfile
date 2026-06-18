FROM rust:1.78 AS build
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY tests ./tests
RUN cargo test --locked
RUN cargo build --release --locked

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=build /app/target/release/distributed_cache /usr/local/bin/distributed_cache
EXPOSE 8080
CMD ["distributed_cache"]
