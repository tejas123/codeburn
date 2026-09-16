import { expect, it } from 'vitest'

import { parseCodexTitleIndex } from '../src/context-tree-codex.js'

it('uses the latest saved task title for each Codex session', () => {
  const rows = [
    JSON.stringify({ id: 'one', thread_name: 'Old title' }),
    JSON.stringify({ id: 'one', thread_name: 'New title' }),
    '{broken',
  ].join('\n')
  expect(parseCodexTitleIndex(rows).get('one')).toBe('New title')
})
