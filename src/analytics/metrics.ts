import type { MetricsByRuleId, RuleMetrics, RuleRunEvent } from './types'

export function emptyMetrics(): RuleMetrics {
  return {
    totalRuns: 0,
    successRuns: 0,
    failedRuns: 0,
    history: [],
    screenedPass: 0,
    screenedFail: 0,
    screenedHistory: [],
    screenedByStream: {},
    screenedHistoryByStream: {},
  }
}

export function getRuleMetrics(metrics: MetricsByRuleId, ruleId: string): RuleMetrics {
  return metrics[ruleId] ?? emptyMetrics()
}

export function recordRuleRun(
  metrics: MetricsByRuleId,
  args: {
    ruleId: string
    ok: boolean
    outcome?: 'pass' | 'fail'
    stream?: string
    maxHistory?: number
  },
): MetricsByRuleId {
  const prev = getRuleMetrics(metrics, args.ruleId)
  const maxHistory = args.maxHistory ?? 24

  const streamKey = (args.stream ?? '').trim()
  const prevByStream = prev.screenedByStream ?? {}
  const prevHistoryByStream = prev.screenedHistoryByStream ?? {}
  const nextByStream =
    args.outcome && streamKey.length
      ? {
          ...prevByStream,
          [streamKey]: {
            pass:
              (prevByStream[streamKey]?.pass ?? 0) +
              (args.outcome === 'pass' ? 1 : 0),
            fail:
              (prevByStream[streamKey]?.fail ?? 0) +
              (args.outcome === 'fail' ? 1 : 0),
          },
        }
      : prevByStream

  const nextHistoryByStream =
    args.outcome && streamKey.length
      ? {
          ...prevHistoryByStream,
          [streamKey]: [
            { ts: new Date().toISOString(), pass: args.outcome === 'pass' },
            ...(prevHistoryByStream[streamKey] ?? []),
          ].slice(0, maxHistory),
        }
      : prevHistoryByStream

  const next: RuleMetrics = {
    totalRuns: prev.totalRuns + 1,
    successRuns: prev.successRuns + (args.ok ? 1 : 0),
    failedRuns: prev.failedRuns + (args.ok ? 0 : 1),
    history: [{ ts: new Date().toISOString(), ok: args.ok }, ...prev.history].slice(
      0,
      maxHistory,
    ),
    screenedPass:
      (prev.screenedPass ?? 0) + (args.outcome === 'pass' ? 1 : 0),
    screenedFail:
      (prev.screenedFail ?? 0) + (args.outcome === 'fail' ? 1 : 0),
    screenedHistory: args.outcome
      ? [
          { ts: new Date().toISOString(), pass: args.outcome === 'pass' },
          ...(prev.screenedHistory ?? []),
        ].slice(0, maxHistory)
      : prev.screenedHistory ?? [],
    screenedByStream: nextByStream,
    screenedHistoryByStream: nextHistoryByStream,
  }

  return { ...metrics, [args.ruleId]: next }
}

export function aggregateMetrics(metrics: MetricsByRuleId, ruleIds: string[]) {
  let totalRuns = 0
  let successRuns = 0
  let failedRuns = 0

  ruleIds.forEach((id) => {
    const m = metrics[id]
    if (!m) return
    totalRuns += m.totalRuns
    successRuns += m.successRuns
    failedRuns += m.failedRuns
  })

  return { totalRuns, successRuns, failedRuns }
}

export function normalizeMetricsCollection(metrics: MetricsByRuleId): MetricsByRuleId {
  return Object.fromEntries(
    Object.entries(metrics).map(([ruleId, value]) => [ruleId, normalizeRuleMetrics(value)]),
  )
}

function normalizeRuleMetrics(input: RuleMetrics): RuleMetrics {
  const totalRuns = toSafeNumber(input.totalRuns)
  const successRuns = toSafeNumber(input.successRuns)
  const failedRuns = toSafeNumber(input.failedRuns)
  const screenedPass = toSafeNumber(input.screenedPass)
  const screenedFail = toSafeNumber(input.screenedFail)

  const history =
    normalizeRunHistory(input.history) ||
    synthesizeRunHistory(successRuns, failedRuns)

  const screenedHistory =
    normalizeScreenedHistory(input.screenedHistory) ||
    synthesizeScreenedHistory(screenedPass, screenedFail)

  const screenedByStream = Object.fromEntries(
    Object.entries(input.screenedByStream ?? {}).map(([stream, counts]) => [
      stream,
      {
        pass: toSafeNumber(counts?.pass),
        fail: toSafeNumber(counts?.fail),
      },
    ]),
  )

  const screenedHistoryByStream = Object.fromEntries(
    Object.entries(screenedByStream).map(([stream, counts]) => [
      stream,
      normalizeScreenedHistory(input.screenedHistoryByStream?.[stream]) ||
        synthesizeScreenedHistory(counts.pass, counts.fail),
    ]),
  )

  return {
    totalRuns,
    successRuns,
    failedRuns,
    history,
    screenedPass,
    screenedFail,
    screenedHistory,
    screenedByStream,
    screenedHistoryByStream,
  }
}

function normalizeRunHistory(history: RuleRunEvent[] | undefined) {
  if (!Array.isArray(history)) return null
  return history
    .filter((entry) => typeof entry?.ts === 'string' && typeof entry?.ok === 'boolean')
    .slice(0, 24)
}

function normalizeScreenedHistory(
  history: { ts: string; pass: boolean }[] | undefined,
) {
  if (!Array.isArray(history)) return null
  return history
    .filter((entry) => typeof entry?.ts === 'string' && typeof entry?.pass === 'boolean')
    .slice(0, 24)
}

function synthesizeRunHistory(successRuns: number, failedRuns: number) {
  const entries = [
    ...buildEvents(successRuns, true),
    ...buildEvents(failedRuns, false),
  ]
  return entries
    .sort((left, right) => (left.ts < right.ts ? 1 : -1))
    .slice(0, 24)
}

function synthesizeScreenedHistory(screenedPass: number, screenedFail: number) {
  const entries = [
    ...buildPassEvents(screenedPass, true),
    ...buildPassEvents(screenedFail, false),
  ]
  return entries
    .sort((left, right) => (left.ts < right.ts ? 1 : -1))
    .slice(0, 24)
}

function buildEvents(count: number, ok: boolean) {
  return Array.from({ length: Math.min(24, count) }, (_, index) => ({
    ts: tsFromIndex(index),
    ok,
  }))
}

function buildPassEvents(count: number, pass: boolean) {
  return Array.from({ length: Math.min(24, count) }, (_, index) => ({
    ts: tsFromIndex(index),
    pass,
  }))
}

function tsFromIndex(index: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - (index % 6))
  date.setHours(date.getHours() - index)
  return date.toISOString()
}

function toSafeNumber(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0
}
