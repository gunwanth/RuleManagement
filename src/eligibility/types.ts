export type CandidateProfile = {
  stream: 'frontend_react' | 'fullstack' | 'backend' | 'data_science' | 'ai'
  isExperienced: boolean
  reactProjects: number
  degree: 'btech' | 'other'
  cgpa: number
  yearsExperience: number
  skills: {
    development: boolean
    fullstack: boolean
    ai: boolean
    backend: boolean
    data_science: boolean
  }
  resume: {
    summary: string
    highlights: string[]
  }
}

export function createDefaultCandidate(): CandidateProfile {
  return {
    stream: 'frontend_react',
    isExperienced: true,
    reactProjects: 2,
    degree: 'btech',
    cgpa: 7,
    yearsExperience: 2,
    skills: {
      development: true,
      fullstack: false,
      ai: true,
      backend: false,
      data_science: false,
    },
    resume: {
      summary: 'Candidate profile for screening.',
      highlights: ['BTech', 'React', 'Projects'],
    },
  }
}

export function normalizeCandidateProfile(
  input: Partial<CandidateProfile> | CandidateProfile,
): CandidateProfile {
  const base = createDefaultCandidate()
  const next = (input ?? {}) as Partial<CandidateProfile>
  const stream = (next.stream ?? base.stream) as CandidateProfile['stream']

  return {
    ...base,
    ...next,
    stream,
    skills: { ...base.skills, ...(next.skills ?? {}) },
    resume: {
      ...base.resume,
      ...(next.resume ?? {}),
      highlights: Array.isArray(next.resume?.highlights)
        ? next.resume?.highlights
        : base.resume.highlights,
    },
  }
}
