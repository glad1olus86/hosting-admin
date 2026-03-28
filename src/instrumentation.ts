export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCollector } = await import("./lib/metrics-collector");
    startCollector();
  }
}
