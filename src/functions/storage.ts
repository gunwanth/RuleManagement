import type { FunctionDef } from './types'

const KEY = 'sweetshop.userFunctions.v1'

export function loadUserFunctions(): FunctionDef[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as FunctionDef[]
  } catch {
    return []
  }
}

export function saveUserFunctions(funcs: FunctionDef[]) {
  localStorage.setItem(KEY, JSON.stringify(funcs))
}

