export type HealthStatus = {
  status: string;
  service: string;
  timestamp: string;
};

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    service: "booClubs-api",
    timestamp: new Date().toISOString(),
  };
}