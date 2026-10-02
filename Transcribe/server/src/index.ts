const port = Number(process.env.PORT ?? 3000)

const server = Bun.serve({
  port,
  routes: {
    '/api/health': () => Response.json({ status: 'ok' }),
  },
  fetch() {
    return new Response('Not Found', { status: 404 })
  },
})

console.log(`Server listening on ${server.url}`)
