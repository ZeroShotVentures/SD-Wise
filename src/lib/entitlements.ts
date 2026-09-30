import { cache } from "react";

export type PlanLimits = {
  projects: number;
  storage: number;
};

export type Entitlements = {
  plan: "unlimited";
  limits: PlanLimits;
};

export const unlimited: Entitlements = {
  plan: "unlimited",
  limits: { projects: Infinity, storage: Infinity },
};

export const getEntitlements = cache(
  async (_userId: string): Promise<Entitlements> => unlimited,
);
