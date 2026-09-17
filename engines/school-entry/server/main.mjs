import { createRuntime } from "./runtime.mjs";
const server = createRuntime();
server.listen(server.runtime.port, server.runtime.host, () =>
  console.info("School entry listening."),
);
async function stop() {
  await new Promise((resolve) => server.close(resolve));
  await server.closeResources();
}
process.once("SIGINT", () => stop().then(() => process.exit(0)));
process.once("SIGTERM", () => stop().then(() => process.exit(0)));
