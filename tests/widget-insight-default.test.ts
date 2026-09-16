import { expect, it } from 'vitest'

import { DEFAULT_INSIGHT, INSIGHT_ORDER } from '../windows/src/components/InsightPills.js'

it('opens the widget on projects and tasks before the trend view', () => {
  expect(DEFAULT_INSIGHT).toBe('projects')
  expect(INSIGHT_ORDER[0]).toBe('projects')
})
