import net from "node:net";

// AID-867 (higiene de porta do harness E2E): em host compartilhado, um servidor
// vivo de OUTRO app na porta do harness satisfaz o health-check `url` do
// Playwright e a suíte roda contra o app errado sem aviso (8 falsas falhas na
// baseline l08–l13). Rodado como primeiro passo do webServer.command, com
// `reuseExistingServer: false` + `--strictPort`: porta ocupada → falha rápida
// com erro explícito; servidor existente nunca é reusado silenciosamente.
function parseArgs(argv) {
  const args = { port: "", role: "" };
  for (let i = 2; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1] ?? "";
    if (flag === "--port") args.port = value;
    if (flag === "--role") args.role = value;
  }
  return args;
}

function probeHost(host, port) {
  return new Promise((resolve) => {
    const probe = net.connect({ host, port });
    probe.on("connect", () => {
      probe.destroy();
      resolve(true);
    });
    probe.on("error", () => resolve(false));
    probe.setTimeout(2000, () => {
      probe.destroy();
      resolve(false);
    });
  });
}

const { port, role } = parseArgs(process.argv);
if (!port || !role) {
  console.error("uso: node scripts/e2e-port-guard.mjs --port <porta> --role <app|pwa>");
  process.exit(2);
}

const occupied = (await Promise.all([probeHost("127.0.0.1", port), probeHost("::1", port)])).some(
  Boolean,
);
if (occupied) {
  console.error(
    `AID-867 port hygiene: a porta ${port} (${role}) já está ocupada por um servidor vivo — o harness E2E do literacyDojo nunca reusa servidor existente (risco de veredito contra o app errado). Libere a porta ou aponte LITERACY_E2E_APP_PORT/LITERACY_E2E_PWA_PORT para portas livres.`,
  );
  process.exit(1);
}
