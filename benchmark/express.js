const app = require('express')()
const swaggerValidation = require('openapi-validator-middleware')

swaggerValidation.init('./benchmark/spec.json', {
  buildResponses: true
})

app.get('/example', swaggerValidation.validate, (req, res) => {
  const { name } = req.query
  res.send({ name })
})

app.listen(3000)
