FROM rust:1.78-slim AS build
WORKDIR /app
COPY Cargo.toml ./
COPY src ./src
COPY tests ./tests
RUN cargo test && cargo build --release

FROM debian:bookworm-slim
COPY --from=build /app/target/release/load-balancer /usr/local/bin/load-balancer
EXPOSE 8080
CMD ["load-balancer"]
