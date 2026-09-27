import type { User } from "@/lib/auth";

export type Plan = "free" | "pro" | "ultimate" | "admin";

export function effectivePlan(user: User | null | undefined): Plan {
  if (!user) return "free";
  if (user.is_admin) return "admin";
  return ((user.plan as Plan) || "free");
}

export function isAdmin(user: User | null | undefined): boolean {
  return !!user?.is_admin;
}

export function hasPlan(user: User | null | undefined, min: "pro" | "ultimate"): boolean {
  const order: Plan[] = ["free", "pro", "ultimate", "admin"];
  return order.indexOf(effectivePlan(user)) >= order.indexOf(min);
}

export function isUnlimited(user: User | null | undefined): boolean {
  return isAdmin(user);
}