import type { FunctionDef } from '../functions/types'
import type { CandidateProfile } from './types'

export type EligibilityConditionResult = {
  ok: true
  value: boolean
  message: string
} | {
  ok: false
  value: boolean
  message: string
}

function toNumber(v: unknown, fallback: number) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function toString(v: unknown, fallback: string) {
  return typeof v === 'string' && v.trim().length ? v : fallback
}

export function evaluateEligibilityCondition(
  candidate: CandidateProfile,
  fn: FunctionDef,
  params: Record<string, unknown> | undefined,
): EligibilityConditionResult {
  if (fn.operation === 'candidate_is_experienced') {
    const value = !!candidate.isExperienced
    return { ok: true, value, message: `Experienced -> ${value}` }
  }

  if (fn.operation === 'candidate_stream_is') {
    const stream = toString(params?.stream, 'frontend_react').toLowerCase()
    const value = candidate.stream.toLowerCase() === stream
    return {
      ok: true,
      value,
      message: `Stream ${candidate.stream} is ${stream} -> ${value}`,
    }
  }

  if (fn.operation === 'candidate_exp_at_least') {
    const years = Math.max(0, Math.floor(toNumber(params?.years, 0)))
    const value = candidate.yearsExperience >= years
    return { ok: true, value, message: `Experience ${candidate.yearsExperience} >= ${years} -> ${value}` }
  }

  if (fn.operation === 'candidate_react_projects_at_least') {
    const count = Math.max(0, Math.floor(toNumber(params?.count, 0)))
    const value = candidate.reactProjects >= count
    return { ok: true, value, message: `React projects ${candidate.reactProjects} >= ${count} -> ${value}` }
  }

  if (fn.operation === 'candidate_degree_is') {
    const degree = toString(params?.degree, 'btech').toLowerCase()
    const value = degree === 'btech' ? candidate.degree === 'btech' : candidate.degree !== 'btech'
    return { ok: true, value, message: `Degree is ${candidate.degree} matches ${degree} -> ${value}` }
  }

  if (fn.operation === 'candidate_cgpa_at_least') {
    const min = toNumber(params?.min, 0)
    const value = candidate.cgpa >= min
    return { ok: true, value, message: `CGPA ${candidate.cgpa} >= ${min} -> ${value}` }
  }

  if (fn.operation === 'candidate_has_skill') {
    const skill = toString(params?.skill, '').toLowerCase()
    const has =
      skill === 'development'
        ? candidate.skills.development
        : skill === 'fullstack'
          ? candidate.skills.fullstack
          : skill === 'ai'
            ? candidate.skills.ai
            : skill === 'backend'
              ? candidate.skills.backend
              : skill === 'data_science'
                ? candidate.skills.data_science
            : false
    return { ok: true, value: has, message: `Skill ${skill || '(missing)'} -> ${has}` }
  }

  return { ok: false, value: false, message: `Unsupported condition: ${fn.operation}` }
}
