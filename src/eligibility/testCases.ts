import type { CandidateProfile } from './types'
import type { EligibilityTestCase } from '../rules/types'

function experiencedBase(overrides?: Partial<CandidateProfile>): CandidateProfile {
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
    resume: { summary: 'Experienced candidate.', highlights: ['BTech', 'Projects'] },
    ...(overrides ?? {}),
  }
}

function fresherBase(overrides?: Partial<CandidateProfile>): CandidateProfile {
  return {
    stream: 'frontend_react',
    isExperienced: false,
    reactProjects: 1,
    degree: 'btech',
    cgpa: 7,
    yearsExperience: 0,
    skills: {
      development: true,
      fullstack: true,
      ai: false,
      backend: false,
      data_science: false,
    },
    resume: { summary: 'Fresher candidate.', highlights: ['BTech'] },
    ...(overrides ?? {}),
  }
}

export function createDefaultEligibilityTestCases(): EligibilityTestCase[] {
  return [
    {
      id: crypto.randomUUID(),
      name: 'React stream - experienced (Pass)',
      expected: 'pass',
      candidate: experiencedBase(),
    },
    {
      id: crypto.randomUUID(),
      name: 'React stream - experienced low CGPA (Fail)',
      expected: 'fail',
      candidate: experiencedBase({ cgpa: 6.5 }),
    },
    {
      id: crypto.randomUUID(),
      name: 'React stream - fresher (Pass)',
      expected: 'pass',
      candidate: fresherBase(),
    },
    {
      id: crypto.randomUUID(),
      name: 'React stream - fresher missing dev skill (Fail)',
      expected: 'fail',
      candidate: fresherBase({
        skills: { development: false, fullstack: true, ai: false, backend: false, data_science: false },
      }),
    },
    {
      id: crypto.randomUUID(),
      name: 'Full stack stream - fresher (Pass)',
      expected: 'pass',
      candidate: fresherBase({
        stream: 'fullstack',
        skills: { development: true, fullstack: true, ai: false, backend: false, data_science: false },
      }),
    },
    {
      id: crypto.randomUUID(),
      name: 'AI stream - experienced (Pass)',
      expected: 'pass',
      candidate: experiencedBase({
        stream: 'ai',
        skills: { development: true, fullstack: false, ai: true, backend: false, data_science: false },
      }),
    },
    {
      id: crypto.randomUUID(),
      name: 'Backend stream - experienced (Pass)',
      expected: 'pass',
      candidate: experiencedBase({
        stream: 'backend',
        skills: { development: true, fullstack: false, ai: false, backend: true, data_science: false },
      }),
    },
    {
      id: crypto.randomUUID(),
      name: 'Data Science stream - fresher (Pass)',
      expected: 'pass',
      candidate: fresherBase({
        stream: 'data_science',
        skills: { development: true, fullstack: false, ai: true, backend: false, data_science: true },
      }),
    },
  ]
}
