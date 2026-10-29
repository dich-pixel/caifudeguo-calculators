// Minimal typing for the one Node API the source-scan tests use (the project has no @types/node).
declare module 'node:fs' {
  export function readFileSync(path: URL | string, encoding: 'utf8'): string
}
