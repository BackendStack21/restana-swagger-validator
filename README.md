# restana-swagger-validator
Swagger/OpenAPI validation middleware that uses the "api-schema-builder" module.

## Configuration options
- `buildRequests`: If TRUE, request validation schemas will be parsed and cached for use. Default value: `TRUE`
- `buildResponses`: If TRUE, response validation schemas will be parsed and cached for use. Default value: `TRUE`
- `requireSchemaSpec`: If TRUE, schema specification will be required while registering route endpoints. Default value: `TRUE`
- `apiSpecEndpoint`: Server endpoint to expose the Swagger specification. Default value: `/swagger.json`
- `uiEndpoint`: Server endpoint to expose the Swagger documentation UI. Default value: `/docs`
- `publicApiEndpoint`: Public HTTP server endpoint. Default value: `http://localhost:3000`

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
  buildResponses: false
})

app.use(bodyParser.json())

// register application endpoints

app.start()

```

## TODOs
- Unit tests
- Documentation
- Performance Benchmarks 

