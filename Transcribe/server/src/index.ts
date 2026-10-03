import express from 'express'
import { api, apiErrors } from './api'

const port = Number(process.env.PORT ?? 3000)

const app = express()
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', api)

app.use((_req, res) => {
  res.status(404).send('Not Found')
})

app.use(apiErrors)

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
