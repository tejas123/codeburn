import { spawn } from 'node:child_process'

// Test the staged distribution, including Electron argv handling and static assets.
export function verifyDashboard(executable, launcher, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [launcher, 'web', '--no-open', '--port', '0'], {
      env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    })
    let output = ''
    let checking = false
    let settled = false
    const finish = error => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.kill()
      error ? reject(error) : resolve()
    }
    const timer = setTimeout(() => finish(new Error('Dashboard readiness timed out')), 30_000)
    child.stderr.resume()
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', chunk => {
      output += chunk
      const match = output.match(/CodeBurn dashboard at (http:\/\/127\.0\.0\.1:\d+)/)
      if (!match || checking) return
      checking = true
      const check = async () => {
        const response = await fetch(match[1])
        const html = await response.text()
        if (!response.ok || !html.includes('<html')) throw new Error('Dashboard HTML missing')
        const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^\"]+)"/g)]
        if (assets.length < 2) throw new Error('Dashboard assets missing')
        for (const [, path] of assets) {
          const asset = await fetch(new URL(path, match[1]))
          if (!asset.ok) throw new Error(`Dashboard asset failed: ${path}`)
          await asset.arrayBuffer()
        }
      }
      check().then(() => finish(), finish)
    })
    child.on('error', finish)
    child.on('close', code => {
      if (!settled) finish(new Error(`Dashboard exited before verification (${code})`))
    })
  })
}
