const checks = [
  ['format', ['bun', 'run', 'format:check']],
  ['typecheck', ['bun', 'run', 'typecheck']],
  ['unit tests', ['bun', 'run', 'test']],
  ['lint', ['bun', 'run', 'lint']],
  ['build', ['bun', 'run', 'build']],
] as const

for (const [label, command] of checks) {
  console.log(`\n[check] ${label}`)
  const child = Bun.spawn([...command], {
    cwd: import.meta.dir + '/..',
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const exitCode = await child.exited
  if (exitCode !== 0) process.exit(exitCode)
}

console.log('\n[check] all checks passed')
