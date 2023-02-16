const app = require('restana')()
const { SwaggerValidator } = require('../src/index')
const path = require('path')

SwaggerValidator(app, path.join(__dirname, '/spec.json'), {
  buildResponses: false
})

app.get('/example', (req, res) => {
  const { name } = req.query
  res.send({ name })
})

app.start()
