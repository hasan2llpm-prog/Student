import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.PORT || 3000)
const root = resolve(fileURLToPath(new URL('./dist', import.meta.url)))
const indexFile = join(root, 'index.html')

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

function safeFilePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0])
  const candidate = normalize(join(root, decoded))
  return candidate.startsWith(`${root}/`) || candidate === root ? candidate : null
}

const server = createServer((request, response) => {
  const pathname = request.url || '/'

  if (pathname === '/_app/health') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    response.end(JSON.stringify({ ok: true, service: 'student-web', version: process.env.npm_package_version || '0.1.0' }))
    return
  }

  const requested = safeFilePath(pathname)
  const filePath = requested && existsSync(requested) && statSync(requested).isFile() ? requested : indexFile
  const extension = extname(filePath)
  response.writeHead(200, {
    'content-type': contentTypes[extension] || 'application/octet-stream',
    'cache-control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  })
  createReadStream(filePath).on('error', () => {
    if (!response.headersSent) response.writeHead(500)
    response.end('Internal Server Error')
  }).pipe(response)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Student Web listening on ${port}`)
})
