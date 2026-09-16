import type { ContextSessionInfo, Period } from '@/lib/api'

export type CodexThread = Pick<ContextSessionInfo, 'sessionId' | 'project' | 'title' | 'mtimeMs'> & Partial<ContextSessionInfo>

export type CodexProjectGroup<T extends CodexThread = CodexThread> = {
  key: string
  name: string
  latestMs: number
  threads: T[]
}

export function groupCodexThreads<T extends CodexThread>(threads: T[], query = ''): CodexProjectGroup<T>[] {
  const needle = query.trim().toLocaleLowerCase()
  const matches = needle
    ? threads.filter((thread) => `${thread.project} ${thread.title} ${thread.sessionId}`.toLocaleLowerCase().includes(needle))
    : threads
  const groups = new Map<string, T[]>()

  for (const thread of matches) {
    const key = thread.project.trim()
    const group = groups.get(key) ?? []
    group.push(thread)
    groups.set(key, group)
  }

  return [...groups.entries()]
    .map(([key, rows]) => {
      const sorted = [...rows].sort((a, b) => b.mtimeMs - a.mtimeMs)
      return { key, name: key || 'No project', latestMs: sorted[0]?.mtimeMs ?? 0, threads: sorted }
    })
    .sort((a, b) => b.latestMs - a.latestMs || a.name.localeCompare(b.name))
}

export function threadIsInPeriod(mtimeMs: number, period: Period, now = new Date()): boolean {
  if (period === 'lifetime') return true
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  if (period === 'week') start.setDate(start.getDate() - 6)
  else if (period === '30days') start.setDate(start.getDate() - 29)
  else if (period === 'month') start.setDate(1)
  else if (period === 'all') start.setMonth(start.getMonth() - 6)
  return mtimeMs >= start.getTime()
}
