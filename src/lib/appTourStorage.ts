/** Client-only keys for first-time tours and welcome UI. */

export const DASHBOARD_WELCOME_DISMISSED_KEY = "ta_dashboard_welcome_dismissed_v1";

export function isDashboardWelcomeDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(DASHBOARD_WELCOME_DISMISSED_KEY) === "1";
  } catch {
    return true;
  }
}

export function dismissDashboardWelcome() {
  try {
    localStorage.setItem(DASHBOARD_WELCOME_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}
