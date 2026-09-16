import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { fetchContextSessions, type Period } from '@/lib/api'
import { groupCodexThreads, threadIsInPeriod } from '@/lib/codex-threads'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SessionDetails } from '@/components/ContextExplorer'

function relativeAge(mtimeMs: number): string {
  const mins = Math.max(0, Math.round((Date.now() - mtimeMs) / 60_000))
  if (mins < 60) return `${mins}m`
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h`
  if (mins < 60 * 24 * 30) return `${Math.round(mins / (60 * 24))}d`
  return `${Math.round(mins / (60 * 24 * 30))}mo`
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 7V5a2 2 0 0 1 2-2h5l3 3h6a2 2 0 0 1 2 2v2M3 7h16a2 2 0 0 1 2 2l-2 10H3L1 9a2 2 0 0 1 2-2Z" />
    </svg>
  )
}

export function CodexProjectExplorer({ period }: { period: Period }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['context-sessions', 'codex', 300],
    queryFn: () => fetchContextSessions('codex', 300),
    staleTime: 30_000,
  })

  const groups = useMemo(
    () => groupCodexThreads((data ?? []).filter((thread) => threadIsInPeriod(thread.mtimeMs, period)), query),
    [data, period, query],
  )
  const visibleThreads = useMemo(() => groups.flatMap((group) => group.threads), [groups])
  const selected = visibleThreads.find((thread) => thread.sessionId === selectedId) ?? visibleThreads[0] ?? null

  useEffect(() => {
    if (selected?.sessionId !== selectedId) setSelectedId(selected?.sessionId ?? null)
  }, [selected?.sessionId, selectedId])

  return (
    <section className="mt-3" aria-labelledby="codex-projects-heading">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h3 id="codex-projects-heading" className="font-display text-xl tracking-tight text-foreground">Projects & threads</h3>
          <p className="mt-1 text-xs text-tertiary-foreground">Your local Codex work, grouped by workspace and kept on this machine.</p>
        </div>
        <div className="hidden text-right text-xs text-tertiary-foreground sm:block">
          {groups.length} {groups.length === 1 ? 'project' : 'projects'} · {visibleThreads.length} {visibleThreads.length === 1 ? 'thread' : 'threads'}
        </div>
      </div>

      <div className="grid min-h-[34rem] gap-3 xl:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.45fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="border-b border-border p-3">
            <label className="relative block">
              <span className="sr-only">Search projects and threads</span>
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary-foreground" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search projects or threads"
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-tertiary-foreground focus:border-primary/50"
              />
            </label>
          </div>

          <div className="max-h-[42rem] flex-1 overflow-y-auto p-2">
            {isLoading && <div className="space-y-2 p-1">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-11" />)}</div>}
            {isError && <p className="p-3 text-sm text-tertiary-foreground">Failed to load threads: {String((error as Error)?.message)}</p>}
            {!isLoading && !isError && groups.length === 0 && <p className="p-4 text-sm text-tertiary-foreground">No Codex threads match this period or search.</p>}
            {groups.map((group) => (
              <div key={group.key} className="mb-2 last:mb-0">
                <div className="flex items-center gap-2 px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-heading">
                  <FolderIcon />
                  <span className="min-w-0 flex-1 truncate normal-case tracking-normal">{group.name}</span>
                  <span className="font-normal tabular-nums text-tertiary-foreground">{group.threads.length}</span>
                </div>
                <div className="ml-3 border-l border-border pl-2">
                  {group.threads.map((thread) => (
                    <button
                      key={thread.sessionId}
                      type="button"
                      onClick={() => setSelectedId(thread.sessionId)}
                      className={cn(
                        'mb-0.5 grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-md px-2.5 py-2 text-left transition-colors last:mb-0',
                        selected?.sessionId === thread.sessionId
                          ? 'bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:bg-interactive-secondary hover:text-foreground',
                      )}
                    >
                      <span className="truncate text-[13px] font-medium">{thread.title || 'Untitled thread'}</span>
                      <span className="text-[10px] tabular-nums text-tertiary-foreground">{relativeAge(thread.mtimeMs)}</span>
                      <span className="truncate font-mono text-[10px] text-tertiary-foreground">{thread.sessionId.slice(0, 8)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          {selected ? (
            <>
              <div className="border-b border-border px-4 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-heading">{selected.project || 'No project'} / thread</div>
                <h4 className="mt-1 font-display text-2xl leading-tight text-foreground">{selected.title || 'Untitled thread'}</h4>
                <p className="mt-1 font-mono text-[10px] text-tertiary-foreground">{selected.sessionId}</p>
              </div>
              <SessionDetails provider="codex" id={selected.sessionId} />
            </>
          ) : (
            <div className="flex min-h-[24rem] items-center justify-center p-8 text-center">
              <div><div className="font-display text-xl text-foreground">No thread selected</div><p className="mt-2 text-sm text-tertiary-foreground">Choose another period or clear the search.</p></div>
            </div>
          )}
        </Card>
      </div>
    </section>
  )
}
