import { chromium } from '../../node_modules/playwright/index.mjs'
import { mkdir } from 'node:fs/promises'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
const periods = []
let empty = false
page.on('pageerror', error => errors.push(error.message))
const thread = (sessionId, title, cost) => ({ sessionId, title, provider: 'codex', cost, inputTokens: 12000, cacheReadTokens: 4000, outputTokens: 1000, models: [{ name: 'GPT-5', cost }] })
const payload = { generated: new Date().toISOString(), current: { label: 'Today', cost: 20, calls: 20, sessions: 3, inputTokens: 36000, cacheReadTokens: 12000, cacheWriteTokens: 0, outputTokens: 3000, providers: { codex: 20 }, topProjects: [{ id: 'smaller', name: 'Smaller project', cost: 2, sessions: 1, sessionDetails: [thread('small', 'Small task', 2)] }, { id: 'largest', name: 'Codex Usage', cost: 18, sessions: 2, sessionDetails: [thread('cheap', 'Fix labels', 3), thread('large', 'Build Today project view', 15)] }] }, history: { daily: [] } }
await page.route('**/api/**', route => {
  const url = new URL(route.request().url())
  const path = url.pathname
  if (path === '/api/devices') periods.push(url.searchParams.get('period'))
  const scopedPayload = empty ? { ...payload, current: { ...payload.current, cost: 0, sessions: 0, inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, topProjects: [] } } : payload
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify(path === '/api/devices' ? { devices: [{ id: 'local', name: 'This Mac', local: true, payload: scopedPayload }] } : path.includes('explorer') ? { sessions: [] } : {}) })
})
await page.goto(process.env.CODEBURN_PREVIEW_URL || 'http://127.0.0.1:5187')
await page.getByRole('button', { name: /Build Today project view/ }).waitFor()
if (await page.getByRole('button', { name: /Codex Usage.*90%/ }).getAttribute('aria-expanded') !== 'true') throw Error('Largest project not expanded')
await mkdir('artifacts/today', { recursive: true })
await page.screenshot({ path: 'artifacts/today/today-desktop.png', fullPage: true })
await page.getByRole('button', { name: /Build Today project view/ }).click()
await page.getByRole('heading', { name: 'Build Today project view' }).waitFor()
if (!(await page.getByLabel('Period totals').innerText()).includes('$20.00')) throw Error('Headline changed during drilldown')
await page.screenshot({ path: 'artifacts/today/today-thread.png', fullPage: true })
await page.getByRole('button', { name: /Back to projects/ }).click()
await page.setViewportSize({ width: 390, height: 844 })
await page.screenshot({ path: 'artifacts/today/today-mobile.png', fullPage: true })
if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw Error('Mobile page overflows')
await page.getByRole('button', { name: 'Codex Usage', exact: true }).click()
await page.getByRole('button', { name: /Build Today project view/ }).waitFor()
await page.screenshot({ path: 'artifacts/today/today-codex.png', fullPage: true })
empty = true
await page.reload()
await page.getByText('No recorded usage in this period.').waitFor()
if (periods.some(period => period !== 'today')) throw Error('Empty Today widened the selected period')
if (errors.length) throw Error(errors.join('\n'))
console.log('Today project expansion, drilldown, back, stable totals, mobile layout: passed')
await browser.close()
