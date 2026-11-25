// Local cross-origin parent page for share-link Playwright tests. Not shipped in the plugin zip.
import { createReadStream, existsSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const pluginEmbed = path.join(here, '../plugin/assets/embed.js')
const port = Number(process.env.CBR_PARENT_PORT || 4178)
const host = '127.0.0.1'

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

const routes = {
  '/': path.join(here, 'parent-host/share-host.html'),
  '/share-host.html': path.join(here, 'parent-host/share-host.html'),
  '/share-host-two.html': path.join(here, 'parent-host/share-host-two.html'),
  '/embed.js': pluginEmbed,
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url || '/', `http://${host}:${port}`)
  const file = routes[u.pathname]
  if (!file || !existsSync(file)) {
    res.writeHead(404)
    res.end('not found')
    return
  }
  const ext = path.extname(file)
  res.writeHead(200, {
    'content-type': types[ext] || 'application/octet-stream',
    'cache-control': 'no-store',
  })
  createReadStream(file).pipe(res)
})

server.listen(port, host, () => {
  process.stdout.write(`share parent host http://${host}:${port}/share-host.html\n`)
})
