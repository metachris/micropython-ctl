import express from 'express'
import bodyParser from 'body-parser'
import { MicroPythonDevice } from './main'

const app = express()
app.use(bodyParser.text());

let _device: MicroPythonDevice | null = null

app.get('/', (_req, res) => {
  res.send('Hello World')
})

app.get('/api', (_req, res) => {
  res.send({
    deviceId: _device!.getState().connectionPath
  });
})

app.post('/api/run-script', async (req, res) => {
  console.log('runscript', req.body)
  if (!req.body) { return res.status(400).send({ success: false, error: 'no script in request body' })}
  const scriptResponse = await _device!.runScript(req.body)
  res.send(scriptResponse)
})

export const run = async (device: MicroPythonDevice) => {
  _device = device
  app.listen(3000)
}

if (require.main === module) {
  const d = new MicroPythonDevice()
  run(d)
}
