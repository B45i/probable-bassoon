const RECENT_GOALS_STORAGE_KEY = "ab-tester.recent-goals"
const MAX_RECENT_GOALS = 8

/** Goals are a site-wide vocabulary (author names them once, reuses them across
 * experiments — "signup", "purchase"), not per-experiment, so one shared recent list
 * is more useful here than resetting it on every experiment. */
export function getRecentGoals(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_GOALS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function rememberGoal(goal: string): void {
  if (!goal) return
  const deduped = [goal, ...getRecentGoals().filter((existing) => existing !== goal)].slice(0, MAX_RECENT_GOALS)
  localStorage.setItem(RECENT_GOALS_STORAGE_KEY, JSON.stringify(deduped))
}
