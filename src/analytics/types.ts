export type RuleRunEvent = {
  ts: string
  ok: boolean
}

export type RuleMetrics = {
  totalRuns: number
  successRuns: number
  failedRuns: number
  history: RuleRunEvent[]
  screenedPass?: number
  screenedFail?: number
  screenedHistory?: { ts: string; pass: boolean }[]
  screenedByStream?: Record<string, { pass: number; fail: number }>
  screenedHistoryByStream?: Record<string, { ts: string; pass: boolean }[]>
}

export type MetricsByRuleId = Record<string, RuleMetrics>
