FROM rust:1.82 AS build

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo test && cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=build /app/target/release/distributed-job-scheduler /usr/local/bin/distributed-job-scheduler
EXPOSE 8080
ENTRYPOINT ["distributed-job-scheduler"]
