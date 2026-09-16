import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { fetchCodexExplorer, fetchCodexExplorerDetail, type CodexExplorerSession, type Period } from '@/lib/api'
import { buildCodexExplorerView, explorerSessionCost, explorerSessionTokens, reconcileEffortModels, type ExplorerSort } from '@/lib/codex-explorer-view'
import { cn, fmtTokens, usd } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const PAGE_SIZE = 25

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="min-w-0">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-heading">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-10 w-full rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground outline-none focus:border-primary/50">
        {children}
      </select>
    </label>
  )
}

function FolderIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h5l3 3h6a2 2 0 0 1 2 2v2M3 7h16a2 2 0 0 1 2 2l-2 10H3L1 9a2 2 0 0 1 2-2Z" /></svg>
}

function ThreadDetail({ session, period, periodLabel }: { session: CodexExplorerSession; period: Period; periodLabel: string }) {
  const { data: effortModels } = useQuery({
    queryKey: ['codex-explorer-detail', session.id, period],
    queryFn: () => fetchCodexExplorerDetail(session.id, period),
    staleTime: 60_000,
  })
  const models = effortModels?.length ? reconcileEffortModels(session.models, effortModels) : session.models
  return (
    <div className="min-w-0 p-5 sm:p-7">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-heading">{session.project || 'No project'} / chat</div>
      <h4 className="mt-2 font-display text-3xl leading-tight tracking-tight text-foreground">{session.title}</h4>
      <p className="mt-2 text-xs text-tertiary-foreground">{session.machine} · Last recorded {session.updated.slice(0, 10)}</p>

      <div className="mt-8 grid gap-4 border-b border-border pb-6 sm:grid-cols-2">
        <div><div className="text-xs text-tertiary-foreground">Total tokens</div><div className="mt-1 font-display text-4xl tabular-nums text-foreground">{fmtTokens(session.totalTokens)}</div></div>
        <div><div className="text-xs text-tertiary-foreground">API-equivalent estimate</div><div className="mt-1 font-display text-4xl tabular-nums text-foreground">{usd(session.cost)}</div></div>
        <p className="text-xs leading-relaxed text-tertiary-foreground sm:col-span-2">{periodLabel} · All models and efforts in this chat, including those outside the filters. Left-side totals follow the filters.</p>
      </div>

      <dl className="grid grid-cols-2 gap-4 border-b border-border py-6 sm:grid-cols-4">
        {[
          ['Input', session.inputTokens], ['Cached input', session.cachedInputTokens],
          ['Output', session.outputTokens], ['Reasoning', session.reasoningTokens],
        ].map(([metricLabel, value]) => <div key={metricLabel as string}><dt className="text-xs text-tertiary-foreground">{metricLabel}</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{fmtTokens(value as number)}</dd></div>)}
      </dl>

      <div className="mt-6 flex items-center justify-between"><h5 className="text-sm font-semibold text-foreground">Models & effort</h5><span className="text-xs text-tertiary-foreground">{models.length} combinations</span></div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-interactive-secondary text-tertiary-foreground"><tr>{['Model / effort', 'Tokens', 'Input', 'Cached', 'Output', 'Reasoning', 'API estimate'].map((heading) => <th key={heading} className="px-3 py-3 font-medium">{heading}</th>)}</tr></thead>
          <tbody>{models.map((entry) => <tr key={`${entry.name}:${entry.effort}`} className="border-b border-border last:border-b-0"><td className="px-3 py-3"><strong className="block text-foreground">{entry.name}</strong><span className="text-tertiary-foreground">{entry.effort} · {session.totalTokens ? Math.round(entry.totalTokens / session.totalTokens * 100) : 0}%</span></td><td className="px-3 py-3 tabular-nums">{fmtTokens(entry.totalTokens)}</td><td className="px-3 py-3 tabular-nums">{fmtTokens(entry.inputTokens)}</td><td className="px-3 py-3 tabular-nums">{fmtTokens(entry.cachedInputTokens)}</td><td className="px-3 py-3 tabular-nums">{fmtTokens(entry.outputTokens)}</td><td className="px-3 py-3 tabular-nums">{fmtTokens(entry.reasoningTokens)}</td><td className="px-3 py-3 text-right tabular-nums">{usd(entry.cost)}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-tertiary-foreground">Cached input is included in input; reasoning is included in output. API estimates are not subscription charges. Missing effort labels remain unknown.</p>
    </div>
  )
}

export function CodexProjectExplorer({ period, periodLabel }: { period: Period; periodLabel: string }) {
  const [project, setProject] = useState('')
  const [chat, setChat] = useState('')
  const [model, setModel] = useState('')
  const [sort, setSort] = useState<ExplorerSort>('tokens')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [limits, setLimits] = useState<Record<string, number>>({})
  const detailRef = useRef<HTMLDivElement>(null)
  const { data = [], isLoading, isError, error } = useQuery({ queryKey: ['codex-explorer', period], queryFn: () => fetchCodexExplorer(period), staleTime: 30_000 })

  const projectOptions = useMemo(() => [...new Set(data.map((row) => row.project || 'No project'))].sort(), [data])
  const projectScoped = data.filter((row) => !project || (row.project || 'No project') === project)
  const chatOptions = [...projectScoped].sort((a, b) => a.title.localeCompare(b.title))
  const chatScoped = projectScoped.filter((row) => !chat || row.id === chat)
  const modelOptions = [...new Set(chatScoped.flatMap((row) => row.models.map((entry) => entry.name)))].sort()
  const view = useMemo(() => buildCodexExplorerView(data, { project, chat, model, sort }), [data, project, chat, model, sort])
  const selected = data.find((row) => row.id === selectedId) ?? view.sessions[0] ?? null

  useEffect(() => { if (selected?.id !== selectedId) setSelectedId(selected?.id ?? null) }, [selected?.id, selectedId])
  useEffect(() => {
    if (!selected) return
    const key = selected.project || 'No project'
    setExpanded((current) => current.has(key) ? current : new Set([...current, key]))
  }, [selected])

  return (
    <section className="mt-3" aria-labelledby="codex-projects-heading">
      <Card className="overflow-hidden">
        <div className="border-b border-border p-5">
          <div className="flex items-center gap-2"><h3 id="codex-projects-heading" className="font-display text-xl tracking-tight text-foreground">Chat explorer</h3><span className="rounded-md border border-border bg-interactive-secondary px-2 py-0.5 text-xs tabular-nums text-tertiary-foreground">{data.length}</span></div>
          <p className="mt-1 text-sm text-tertiary-foreground">Browse projects on the left. Select a chat to inspect its usage on the right.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <SelectField label="Project" value={project} onChange={(value) => { setProject(value); setChat(''); setModel('') }}><option value="">All projects</option>{projectOptions.map((value) => <option key={value} value={value}>{value}</option>)}</SelectField>
            <SelectField label="Chat" value={chat} onChange={(value) => { setChat(value); setModel('') }}><option value="">All chats</option>{chatOptions.map((row) => <option key={row.id} value={row.id}>{row.title} · {row.id.slice(0, 8)}</option>)}</SelectField>
            <SelectField label="Model" value={model} onChange={setModel}><option value="">All models</option>{modelOptions.map((value) => <option key={value} value={value}>{value}</option>)}</SelectField>
            <SelectField label="Sort by" value={sort} onChange={(value) => setSort(value as ExplorerSort)}><option value="tokens">Most tokens</option><option value="cost">Highest cost</option><option value="recent">Most recent</option><option value="title">Chat name</option></SelectField>
          </div>
        </div>

        {isLoading ? <div className="grid gap-3 p-5 md:grid-cols-2">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-16" />)}</div> : isError ? <p className="p-6 text-sm text-tertiary-foreground">Failed to load chats: {String((error as Error)?.message)}</p> : (
          <div className="grid min-h-[42rem] xl:grid-cols-[minmax(22rem,0.85fr)_minmax(0,1.55fr)]">
            <aside className="border-b border-border bg-interactive-secondary/30 xl:border-b-0 xl:border-r">
              <div className="flex items-center justify-between px-5 pt-5"><h4 className="text-sm font-semibold text-heading">Projects</h4><span className="text-xs tabular-nums text-tertiary-foreground">{view.projects.length}</span></div>
              <button type="button" onClick={() => detailRef.current?.focus()} className="mx-5 mt-3 text-xs font-medium text-primary hover:underline">Go to selected chat details →</button>
              <div className="max-h-[54rem] overflow-y-auto p-3">
                {view.projects.length === 0 && <p className="p-4 text-sm text-tertiary-foreground">No matching chats.</p>}
                {view.projects.map((group) => {
                  const open = expanded.has(group.name)
                  const limit = limits[group.name] ?? PAGE_SIZE
                  return <div key={group.name} className="mb-2"><button type="button" onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(group.name)) next.delete(group.name); else next.add(group.name); return next })} className="grid w-full grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-card"><span className={cn('text-tertiary-foreground transition-transform', open && 'rotate-90')}>›</span><FolderIcon /><span className="min-w-0"><strong className="block truncate text-sm text-foreground">{group.name}</strong><span className="text-[11px] text-tertiary-foreground">{fmtTokens(group.tokens)} tokens · {usd(group.cost)}</span></span><span className="text-xs tabular-nums text-tertiary-foreground">{group.count}</span></button>{open && <div className="ml-7 border-l border-border pl-2">{group.sessions.slice(0, limit).map((session) => <button key={session.id} type="button" onClick={() => setSelectedId(session.id)} className={cn('mb-1 block w-full rounded-md px-3 py-2.5 text-left transition-colors', selected?.id === session.id ? 'border border-primary/40 bg-primary/10' : 'hover:bg-card')}><strong className={cn('block truncate text-[13px]', selected?.id === session.id ? 'text-primary' : 'text-foreground')}>{session.title}</strong><span className="mt-0.5 block text-[11px] tabular-nums text-tertiary-foreground">{fmtTokens(explorerSessionTokens(session, model))} tokens · {usd(explorerSessionCost(session, model))}</span></button>)}{group.sessions.length > limit && <button type="button" onClick={() => setLimits((current) => ({ ...current, [group.name]: limit + PAGE_SIZE }))} className="px-3 py-2 text-xs font-medium text-primary">Show {Math.min(PAGE_SIZE, group.sessions.length - limit)} more chats</button>}</div>}</div>
                })}
              </div>
            </aside>
            <div ref={detailRef} tabIndex={-1} className="min-w-0 outline-none">{selected ? <ThreadDetail session={selected} period={period} periodLabel={periodLabel} /> : <div className="flex min-h-[30rem] items-center justify-center p-8 text-sm text-tertiary-foreground">Choose a project and chat.</div>}</div>
          </div>
        )}
      </Card>
    </section>
  )
}
