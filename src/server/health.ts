export type HealthStatus = {
  status: string;
  service: string;
  timestamp: string;
};

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    service: "booclubs-api",
    timestamp: new Date().toISOString(),
  };
}