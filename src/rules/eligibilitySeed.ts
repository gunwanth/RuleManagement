import type { FunctionDef } from '../functions/types'
import type { WorkflowState } from '../workflow/types'
import { NODE_TEMPLATES, createWorkflowNode } from '../workflow/nodeFactory'

export function createEligibilitySeedFunctions(): FunctionDef[] {
  return [
    {
      id: 'elig:is_experienced',
      kind: 'condition',
      name: 'Is experienced',
      description: 'Checks whether the candidate is experienced.',
      operationName: 'is_experienced',
      operation: 'candidate_is_experienced',
      params: [],
    },
    {
      id: 'elig:stream_is',
      kind: 'condition',
      name: 'Stream is',
      description: 'Checks the candidate stream (frontend_react/fullstack/ai).',
      operationName: 'stream_is',
      operation: 'candidate_stream_is',
      params: [{ key: 'stream', label: 'Stream', type: 'string', required: true, placeholder: 'frontend_react' }],
    },
    {
      id: 'elig:exp_at_least',
      kind: 'condition',
      name: 'Experience at least',
      description: 'Years of professional experience meets minimum.',
      operationName: 'exp_at_least',
      operation: 'candidate_exp_at_least',
      params: [{ key: 'years', label: 'Years', type: 'number', required: true, placeholder: '2' }],
    },
    {
      id: 'elig:react_projects_at_least',
      kind: 'condition',
      name: 'React projects at least',
      description: 'Number of React projects meets minimum.',
      operationName: 'react_projects_at_least',
      operation: 'candidate_react_projects_at_least',
      params: [{ key: 'count', label: 'Count', type: 'number', required: true, placeholder: '2' }],
    },
    {
      id: 'elig:degree_is_btech',
      kind: 'condition',
      name: 'Degree is',
      description: 'Checks the candidate degree.',
      operationName: 'degree_is',
      operation: 'candidate_degree_is',
      params: [{ key: 'degree', label: 'Degree', type: 'string', required: true, placeholder: 'btech' }],
    },
    {
      id: 'elig:cgpa_at_least',
      kind: 'condition',
      name: 'CGPA at least',
      description: 'Minimum CGPA cutoff.',
      operationName: 'cgpa_at_least',
      operation: 'candidate_cgpa_at_least',
      params: [{ key: 'min', label: 'Min CGPA', type: 'number', required: true, placeholder: '7' }],
    },
    {
      id: 'elig:has_skill',
      kind: 'condition',
      name: 'Has skill',
      description: 'Checks a skill flag (development/fullstack/backend/data_science/ai).',
      operationName: 'has_skill',
      operation: 'candidate_has_skill',
      params: [{ key: 'skill', label: 'Skill', type: 'string', required: true, placeholder: 'development' }],
    },
  ]
}

export function createEligibilitySeedWorkflow(): WorkflowState {
  const start = createWorkflowNode({ template: NODE_TEMPLATES.start, position: { x: 80, y: 220 } })

  const streamReact = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 330, y: 140 } })
  streamReact.data.title = 'Stream: Frontend (React)?'
  streamReact.data.config = { functionId: 'elig:stream_is', params: { stream: 'frontend_react' } }

  const streamFullstack = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 330, y: 260 } })
  streamFullstack.data.title = 'Stream: Full stack?'
  streamFullstack.data.config = { functionId: 'elig:stream_is', params: { stream: 'fullstack' } }

  const streamBackend = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 330, y: 380 } })
  streamBackend.data.title = 'Stream: Backend?'
  streamBackend.data.config = { functionId: 'elig:stream_is', params: { stream: 'backend' } }

  const streamDataScience = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 330, y: 500 } })
  streamDataScience.data.title = 'Stream: Data science?'
  streamDataScience.data.config = { functionId: 'elig:stream_is', params: { stream: 'data_science' } }

  const isExperiencedReact = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 610, y: 80 } })
  isExperiencedReact.data.title = 'Experienced?'
  isExperiencedReact.data.config = { functionId: 'elig:is_experienced', params: {} }

  const isExperiencedFullstack = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 610, y: 220 } })
  isExperiencedFullstack.data.title = 'Experienced?'
  isExperiencedFullstack.data.config = { functionId: 'elig:is_experienced', params: {} }

  const isExperiencedBackend = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 610, y: 360 } })
  isExperiencedBackend.data.title = 'Experienced?'
  isExperiencedBackend.data.config = { functionId: 'elig:is_experienced', params: {} }

  const isExperiencedDataScience = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 610, y: 500 } })
  isExperiencedDataScience.data.title = 'Experienced?'
  isExperiencedDataScience.data.config = { functionId: 'elig:is_experienced', params: {} }

  const isExperiencedAi = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 610, y: 640 } })
  isExperiencedAi.data.title = 'Experienced?'
  isExperiencedAi.data.config = { functionId: 'elig:is_experienced', params: {} }

  const pass = createWorkflowNode({ template: NODE_TEMPLATES.end, position: { x: 2050, y: 200 } })
  pass.data.title = 'Screened: Pass'

  const fail = createWorkflowNode({ template: NODE_TEMPLATES.end, position: { x: 2050, y: 360 } })
  fail.data.title = 'Screened: Fail'

  // React stream - experienced path
  const reactYears = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 880, y: 40 } })
  reactYears.data.title = 'Experience >= 2'
  reactYears.data.config = { functionId: 'elig:exp_at_least', params: { years: 2 } }

  const reactProjects = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1120, y: 40 } })
  reactProjects.data.title = 'React projects >= 2'
  reactProjects.data.config = { functionId: 'elig:react_projects_at_least', params: { count: 2 } }

  const reactCgpa = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1360, y: 40 } })
  reactCgpa.data.title = 'CGPA >= 7'
  reactCgpa.data.config = { functionId: 'elig:cgpa_at_least', params: { min: 7 } }

  const reactSkillDev = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 880, y: 140 } })
  reactSkillDev.data.title = 'Skill: development'
  reactSkillDev.data.config = { functionId: 'elig:has_skill', params: { skill: 'development' } }

  const reactSkillAi = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1120, y: 140 } })
  reactSkillAi.data.title = 'Skill: ai'
  reactSkillAi.data.config = { functionId: 'elig:has_skill', params: { skill: 'ai' } }

  const reactDegree = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1360, y: 140 } })
  reactDegree.data.title = 'Degree: btech'
  reactDegree.data.config = { functionId: 'elig:degree_is_btech', params: { degree: 'btech' } }

  // React stream - fresher path
  const reactFresherCgpa = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 880, y: 240 } })
  reactFresherCgpa.data.title = 'CGPA >= 7'
  reactFresherCgpa.data.config = { functionId: 'elig:cgpa_at_least', params: { min: 7 } }

  const reactFresherDev = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1120, y: 240 } })
  reactFresherDev.data.title = 'Skill: development'
  reactFresherDev.data.config = { functionId: 'elig:has_skill', params: { skill: 'development' } }

  const reactFresherFullstack = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1360, y: 240 } })
  reactFresherFullstack.data.title = 'Skill: fullstack'
  reactFresherFullstack.data.config = { functionId: 'elig:has_skill', params: { skill: 'fullstack' } }

  // Fullstack stream - experienced path
  const fsYears = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 880, y: 300 } })
  fsYears.data.title = 'Experience >= 2'
  fsYears.data.config = { functionId: 'elig:exp_at_least', params: { years: 2 } }

  const fsCgpa = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1120, y: 300 } })
  fsCgpa.data.title = 'CGPA >= 7'
  fsCgpa.data.config = { functionId: 'elig:cgpa_at_least', params: { min: 7 } }

  const fsDegree = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1360, y: 300 } })
  fsDegree.data.title = 'Degree: btech'
  fsDegree.data.config = { functionId: 'elig:degree_is_btech', params: { degree: 'btech' } }

  const fsDev = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1600, y: 300 } })
  fsDev.data.title = 'Skill: development'
  fsDev.data.config = { functionId: 'elig:has_skill', params: { skill: 'development' } }

  const fsFullstack = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1840, y: 300 } })
  fsFullstack.data.title = 'Skill: fullstack'
  fsFullstack.data.config = { functionId: 'elig:has_skill', params: { skill: 'fullstack' } }

  // Fullstack stream - fresher path
  const fsFresherCgpa = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 880, y: 420 } })
  fsFresherCgpa.data.title = 'CGPA >= 7'
  fsFresherCgpa.data.config = { functionId: 'elig:cgpa_at_least', params: { min: 7 } }

  const fsFresherDegree = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1120, y: 420 } })
  fsFresherDegree.data.title = 'Degree: btech'
  fsFresherDegree.data.config = { functionId: 'elig:degree_is_btech', params: { degree: 'btech' } }

  const fsFresherDev = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1360, y: 420 } })
  fsFresherDev.data.title = 'Skill: development'
  fsFresherDev.data.config = { functionId: 'elig:has_skill', params: { skill: 'development' } }

  const fsFresherFullstack = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1600, y: 420 } })
  fsFresherFullstack.data.title = 'Skill: fullstack'
  fsFresherFullstack.data.config = { functionId: 'elig:has_skill', params: { skill: 'fullstack' } }

  // Backend stream - experienced path
  const beYears = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 880, y: 560 } })
  beYears.data.title = 'Experience >= 2'
  beYears.data.config = { functionId: 'elig:exp_at_least', params: { years: 2 } }

  const beCgpa = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1120, y: 560 } })
  beCgpa.data.title = 'CGPA >= 7'
  beCgpa.data.config = { functionId: 'elig:cgpa_at_least', params: { min: 7 } }

  const beDegree = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1360, y: 560 } })
  beDegree.data.title = 'Degree: btech'
  beDegree.data.config = { functionId: 'elig:degree_is_btech', params: { degree: 'btech' } }

  const beDev = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1600, y: 560 } })
  beDev.data.title = 'Skill: development'
  beDev.data.config = { functionId: 'elig:has_skill', params: { skill: 'development' } }

  const beBackend = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1840, y: 560 } })
  beBackend.data.title = 'Skill: backend'
  beBackend.data.config = { functionId: 'elig:has_skill', params: { skill: 'backend' } }

  // Backend stream - fresher path
  const beFresherCgpa = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 880, y: 680 } })
  beFresherCgpa.data.title = 'CGPA >= 7'
  beFresherCgpa.data.config = { functionId: 'elig:cgpa_at_least', params: { min: 7 } }

  const beFresherDegree = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1120, y: 680 } })
  beFresherDegree.data.title = 'Degree: btech'
  beFresherDegree.data.config = { functionId: 'elig:degree_is_btech', params: { degree: 'btech' } }

  const beFresherDev = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1360, y: 680 } })
  beFresherDev.data.title = 'Skill: development'
  beFresherDev.data.config = { functionId: 'elig:has_skill', params: { skill: 'development' } }

  const beFresherBackend = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1600, y: 680 } })
  beFresherBackend.data.title = 'Skill: backend'
  beFresherBackend.data.config = { functionId: 'elig:has_skill', params: { skill: 'backend' } }

  // Data Science stream - experienced path
  const dsYears = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 880, y: 800 } })
  dsYears.data.title = 'Experience >= 2'
  dsYears.data.config = { functionId: 'elig:exp_at_least', params: { years: 2 } }

  const dsCgpa = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1120, y: 800 } })
  dsCgpa.data.title = 'CGPA >= 7'
  dsCgpa.data.config = { functionId: 'elig:cgpa_at_least', params: { min: 7 } }

  const dsDegree = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1360, y: 800 } })
  dsDegree.data.title = 'Degree: btech'
  dsDegree.data.config = { functionId: 'elig:degree_is_btech', params: { degree: 'btech' } }

  const dsAi = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1600, y: 800 } })
  dsAi.data.title = 'Skill: ai'
  dsAi.data.config = { functionId: 'elig:has_skill', params: { skill: 'ai' } }

  const dsData = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1840, y: 800 } })
  dsData.data.title = 'Skill: data science'
  dsData.data.config = { functionId: 'elig:has_skill', params: { skill: 'data_science' } }

  // Data Science stream - fresher path
  const dsFresherCgpa = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 880, y: 920 } })
  dsFresherCgpa.data.title = 'CGPA >= 7'
  dsFresherCgpa.data.config = { functionId: 'elig:cgpa_at_least', params: { min: 7 } }

  const dsFresherDegree = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1120, y: 920 } })
  dsFresherDegree.data.title = 'Degree: btech'
  dsFresherDegree.data.config = { functionId: 'elig:degree_is_btech', params: { degree: 'btech' } }

  const dsFresherAi = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1360, y: 920 } })
  dsFresherAi.data.title = 'Skill: ai'
  dsFresherAi.data.config = { functionId: 'elig:has_skill', params: { skill: 'ai' } }

  const dsFresherData = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1600, y: 920 } })
  dsFresherData.data.title = 'Skill: data science'
  dsFresherData.data.config = { functionId: 'elig:has_skill', params: { skill: 'data_science' } }

  // AI stream - experienced path
  const aiYears = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 880, y: 1040 } })
  aiYears.data.title = 'Experience >= 2'
  aiYears.data.config = { functionId: 'elig:exp_at_least', params: { years: 2 } }

  const aiCgpa = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1120, y: 1040 } })
  aiCgpa.data.title = 'CGPA >= 7'
  aiCgpa.data.config = { functionId: 'elig:cgpa_at_least', params: { min: 7 } }

  const aiDegree = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1360, y: 1040 } })
  aiDegree.data.title = 'Degree: btech'
  aiDegree.data.config = { functionId: 'elig:degree_is_btech', params: { degree: 'btech' } }

  const aiSkill = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1600, y: 1040 } })
  aiSkill.data.title = 'Skill: ai'
  aiSkill.data.config = { functionId: 'elig:has_skill', params: { skill: 'ai' } }

  // AI stream - fresher path
  const aiFresherCgpa = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 880, y: 1160 } })
  aiFresherCgpa.data.title = 'CGPA >= 7'
  aiFresherCgpa.data.config = { functionId: 'elig:cgpa_at_least', params: { min: 7 } }

  const aiFresherDegree = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1120, y: 1160 } })
  aiFresherDegree.data.title = 'Degree: btech'
  aiFresherDegree.data.config = { functionId: 'elig:degree_is_btech', params: { degree: 'btech' } }

  const aiFresherDev = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1360, y: 1160 } })
  aiFresherDev.data.title = 'Skill: development'
  aiFresherDev.data.config = { functionId: 'elig:has_skill', params: { skill: 'development' } }

  const aiFresherAi = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1600, y: 1160 } })
  aiFresherAi.data.title = 'Skill: ai'
  aiFresherAi.data.config = { functionId: 'elig:has_skill', params: { skill: 'ai' } }

  const edges = [
    { id: 'e1', source: start.id, target: streamReact.id, type: 'smoothstep' },
    { id: 'e2', source: streamReact.id, target: isExperiencedReact.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'e3', source: streamReact.id, target: streamFullstack.id, sourceHandle: 'false', type: 'smoothstep' },

    { id: 'e4', source: streamFullstack.id, target: isExperiencedFullstack.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'e5', source: streamFullstack.id, target: streamBackend.id, sourceHandle: 'false', type: 'smoothstep' },

    { id: 'e6', source: streamBackend.id, target: isExperiencedBackend.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'e7', source: streamBackend.id, target: streamDataScience.id, sourceHandle: 'false', type: 'smoothstep' },

    { id: 'e8', source: streamDataScience.id, target: isExperiencedDataScience.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'e9', source: streamDataScience.id, target: isExperiencedAi.id, sourceHandle: 'false', type: 'smoothstep' },

    // React stream
    { id: 'r1', source: isExperiencedReact.id, target: reactYears.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'r2', source: reactYears.id, target: reactProjects.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'r2b', source: reactYears.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'r3', source: reactProjects.id, target: reactCgpa.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'r3b', source: reactProjects.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'r4', source: reactCgpa.id, target: reactSkillDev.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'r4b', source: reactCgpa.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'r5', source: reactSkillDev.id, target: reactSkillAi.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'r5b', source: reactSkillDev.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'r6', source: reactSkillAi.id, target: reactDegree.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'r6b', source: reactSkillAi.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'r7', source: reactDegree.id, target: pass.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'r7b', source: reactDegree.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },

    { id: 'rf1', source: isExperiencedReact.id, target: reactFresherCgpa.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'rf2', source: reactFresherCgpa.id, target: reactFresherDev.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'rf2b', source: reactFresherCgpa.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'rf3', source: reactFresherDev.id, target: reactFresherFullstack.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'rf3b', source: reactFresherDev.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'rf4', source: reactFresherFullstack.id, target: pass.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'rf4b', source: reactFresherFullstack.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },

    // Full stack stream
    { id: 'fs1', source: isExperiencedFullstack.id, target: fsYears.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'fs2', source: fsYears.id, target: fsCgpa.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'fs2b', source: fsYears.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'fs3', source: fsCgpa.id, target: fsDegree.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'fs3b', source: fsCgpa.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'fs4', source: fsDegree.id, target: fsDev.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'fs4b', source: fsDegree.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'fs5', source: fsDev.id, target: fsFullstack.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'fs5b', source: fsDev.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'fs6', source: fsFullstack.id, target: pass.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'fs6b', source: fsFullstack.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },

    { id: 'fsf1', source: isExperiencedFullstack.id, target: fsFresherCgpa.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'fsf2', source: fsFresherCgpa.id, target: fsFresherDegree.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'fsf2b', source: fsFresherCgpa.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'fsf3', source: fsFresherDegree.id, target: fsFresherDev.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'fsf3b', source: fsFresherDegree.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'fsf4', source: fsFresherDev.id, target: fsFresherFullstack.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'fsf4b', source: fsFresherDev.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'fsf5', source: fsFresherFullstack.id, target: pass.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'fsf5b', source: fsFresherFullstack.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },

    // Backend stream
    { id: 'be1', source: isExperiencedBackend.id, target: beYears.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'be2', source: beYears.id, target: beCgpa.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'be2b', source: beYears.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'be3', source: beCgpa.id, target: beDegree.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'be3b', source: beCgpa.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'be4', source: beDegree.id, target: beDev.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'be4b', source: beDegree.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'be5', source: beDev.id, target: beBackend.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'be5b', source: beDev.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'be6', source: beBackend.id, target: pass.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'be6b', source: beBackend.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },

    { id: 'bef1', source: isExperiencedBackend.id, target: beFresherCgpa.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'bef2', source: beFresherCgpa.id, target: beFresherDegree.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'bef2b', source: beFresherCgpa.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'bef3', source: beFresherDegree.id, target: beFresherDev.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'bef3b', source: beFresherDegree.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'bef4', source: beFresherDev.id, target: beFresherBackend.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'bef4b', source: beFresherDev.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'bef5', source: beFresherBackend.id, target: pass.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'bef5b', source: beFresherBackend.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },

    // Data Science stream
    { id: 'ds1', source: isExperiencedDataScience.id, target: dsYears.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'ds2', source: dsYears.id, target: dsCgpa.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'ds2b', source: dsYears.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'ds3', source: dsCgpa.id, target: dsDegree.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'ds3b', source: dsCgpa.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'ds4', source: dsDegree.id, target: dsAi.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'ds4b', source: dsDegree.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'ds5', source: dsAi.id, target: dsData.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'ds5b', source: dsAi.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'ds6', source: dsData.id, target: pass.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'ds6b', source: dsData.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },

    { id: 'dsf1', source: isExperiencedDataScience.id, target: dsFresherCgpa.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'dsf2', source: dsFresherCgpa.id, target: dsFresherDegree.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'dsf2b', source: dsFresherCgpa.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'dsf3', source: dsFresherDegree.id, target: dsFresherAi.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'dsf3b', source: dsFresherDegree.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'dsf4', source: dsFresherAi.id, target: dsFresherData.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'dsf4b', source: dsFresherAi.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'dsf5', source: dsFresherData.id, target: pass.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'dsf5b', source: dsFresherData.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },

    // AI stream (default if not react/fullstack)
    { id: 'ai1', source: isExperiencedAi.id, target: aiYears.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'ai2', source: aiYears.id, target: aiCgpa.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'ai2b', source: aiYears.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'ai3', source: aiCgpa.id, target: aiDegree.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'ai3b', source: aiCgpa.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'ai4', source: aiDegree.id, target: aiSkill.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'ai4b', source: aiDegree.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'ai5', source: aiSkill.id, target: pass.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'ai5b', source: aiSkill.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },

    { id: 'aif1', source: isExperiencedAi.id, target: aiFresherCgpa.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'aif2', source: aiFresherCgpa.id, target: aiFresherDegree.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'aif2b', source: aiFresherCgpa.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'aif3', source: aiFresherDegree.id, target: aiFresherDev.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'aif3b', source: aiFresherDegree.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'aif4', source: aiFresherDev.id, target: aiFresherAi.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'aif4b', source: aiFresherDev.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'aif5', source: aiFresherAi.id, target: pass.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'aif5b', source: aiFresherAi.id, target: fail.id, sourceHandle: 'false', type: 'smoothstep' },
  ]

  return {
    nodes: [
      start,
      streamReact,
      streamFullstack,
      streamBackend,
      streamDataScience,
      isExperiencedReact,
      isExperiencedFullstack,
      isExperiencedBackend,
      isExperiencedDataScience,
      isExperiencedAi,
      reactYears,
      reactProjects,
      reactCgpa,
      reactSkillDev,
      reactSkillAi,
      reactDegree,
      reactFresherCgpa,
      reactFresherDev,
      reactFresherFullstack,
      fsYears,
      fsCgpa,
      fsDegree,
      fsDev,
      fsFullstack,
      fsFresherCgpa,
      fsFresherDegree,
      fsFresherDev,
      fsFresherFullstack,
      beYears,
      beCgpa,
      beDegree,
      beDev,
      beBackend,
      beFresherCgpa,
      beFresherDegree,
      beFresherDev,
      beFresherBackend,
      dsYears,
      dsCgpa,
      dsDegree,
      dsAi,
      dsData,
      dsFresherCgpa,
      dsFresherDegree,
      dsFresherAi,
      dsFresherData,
      aiYears,
      aiCgpa,
      aiDegree,
      aiSkill,
      aiFresherCgpa,
      aiFresherDegree,
      aiFresherDev,
      aiFresherAi,
      pass,
      fail,
    ],
    edges,
  }
}
