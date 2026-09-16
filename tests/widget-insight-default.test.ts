import { expect, it } from 'vitest'

import { DEFAULT_INSIGHT, INSIGHT_ORDER } from '../windows/src/components/InsightPills.js'
import { STATUS_SNAPSHOT_RENDER_VERSION } from '../src/status-snapshot-semantic.js'

it('opens the widget on projects and tasks before the trend view', () => {
  expect(DEFAULT_INSIGHT).toBe('projects')
  expect(INSIGHT_ORDER[0]).toBe('projects')
})

it('invalidates older widget payload snapshots that cap projects and threads', () => {
  expect(STATUS_SNAPSHOT_RENDER_VERSION).toBeGreaterThanOrEqual(8)
})

it('invalidates snapshots that cap selected-period projects at five', () => {
  expect(STATUS_SNAPSHOT_RENDER_VERSION).toBeGreaterThanOrEqual(9)
})
