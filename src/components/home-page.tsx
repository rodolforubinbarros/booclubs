import { getHealthStatus } from "@/server/health";

export async function HomePage() {
  const health = getHealthStatus();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight">booclubs</h1>
      <p className="text-sm text-black/50 dark:text-white/50">
        frontend connected · backend: {health.status}
      </p>
    </main>
  );
}