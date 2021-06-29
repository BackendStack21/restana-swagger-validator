# restana-swagger-validator
Swagger/OpenAPI validation middleware that uses the "api-schema-builder" module.

## Usage
```js
const restana = require('restana')
const bodyParser = require('body-parser')
const path = require('path')

const {
  SwaggerValidationError,
  SwaggerValidator
} = require('restana-swagger-validator')

const app = restana({
  errorHandler: (err, req, res) => {
    if (err instanceof SwaggerValidationError) {
      res.statusCode = err.statusCode
      res.send({
        message: err.message,
        errors: err.errors
      })
    } else {
      res.send(err)
    }
  }
})

SwaggerValidator(app, path.join(__dirname, '/spec.json'), {
})

app.use(bodyParser.json())

app.post('/store/order', (req, res) => {
  return res.send(req.body)
})

app.get('/pet/:petId', (_, res) => {
  return res.send({
    name: 'Bob'
  })
})

app.start()

```

## TODOs
- Unit tests
- Documentation
- Performance Benchmarks 

