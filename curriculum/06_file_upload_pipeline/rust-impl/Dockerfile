FROM rust:1.81-alpine AS build
RUN apk add --no-cache musl-dev
WORKDIR /src
COPY Cargo.toml .
COPY src ./src
COPY tests ./tests
RUN cargo test && cargo build --release

FROM alpine:3.19
RUN adduser -D app
USER app
WORKDIR /app
COPY --from=build /src/target/release/file-upload-pipeline-rust /app/file-upload-pipeline-rust
EXPOSE 8087
ENTRYPOINT ["/app/file-upload-pipeline-rust"]
