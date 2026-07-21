export const JOB_REGISTRY = {
  "cleanup-expired-sessions": "cleanup-expired-sessions:v1",
} as const;

export type JobName = keyof typeof JOB_REGISTRY;

export function implementationForJob(name: JobName): string {
  return JOB_REGISTRY[name];
}
