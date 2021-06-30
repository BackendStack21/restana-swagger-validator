const apiSchemaBuilder = require('api-schema-builder')

class SwaggerValidationError extends Error {
  constructor (message, statusCode, errors) {
    super(message)

    this.errors = errors
    this.statusCode = statusCode
  }
}

class RequestValidationError extends SwaggerValidationError {
  constructor (errors) {
    super('Swagger request validation failed!', 400, errors)
  }
}

class ResponseValidationError extends SwaggerValidationError {
  constructor (errors) {
    super('Swagger response validation failed!', 500, errors)
  }
}

class SwaggerSchemaNotFound extends SwaggerValidationError {
  constructor (path, method, type = 'request') {
    super(`Swagger schema not found for ${type}!`, 500)

    this.path = path
    this.method = method
    this.type = type
  }
}

function validateParameters ({ query, headers, params, files }, schema) {
  if (schema.parameters) {
    schema.parameters.validate({
      query,
      headers,
      path: params,
      files
    })

    return schema.parameters.errors || []
  }

  return []
}

function getContentType ({ 'content-type': contentType }) {
  return contentType && contentType.split(';')[0].trim()
}

function validateBody ({ headers, body }, schema) {
  const contentType = getContentType(headers)

  if (schema.body) {
    const validator = schema.body[contentType] || schema.body
    if (!validator.validate(body)) {
      return validator.errors || []
    }
  }

  return []
}

function validate (req, schema) {
  return [].concat(
    validateParameters(req, schema),
    validateBody(req, schema)
  )
}

function SwaggerValidator (app, spec, options = {}) {
  spec = typeof spec === 'string' ? require(spec) : spec

  options = Object.assign({
    buildRequests: true,
    buildResponses: true,
    requireSchemaSpec: true,
    apiSpecEndpoint: '/swagger.json',
    uiEndpoint: '/docs',
    publicApiEndpoint: 'http://localhost:3000'
  }, options)

  const schema = apiSchemaBuilder.buildSchemaSync(spec, options)
  const uiHtml = getSwaggerUi(options.publicApiEndpoint + options.apiSpecEndpoint)

  app.get(options.uiEndpoint, (_, res) => {
    res.setHeader('content-type', 'text/html')
    res.send(uiHtml)
  })

  app.get(options.apiSpecEndpoint, (_, res) => {
    res.send(spec)
  })

  const eventName = app.events.BEFORE_ROUTE_REGISTER
  app.events.on(eventName, (method, args) => {
    const path = args[0]

    if (!(schema[path] && schema[path][method])) {
      if (options.requireSchemaSpec) {
        throw new SwaggerSchemaNotFound(path, method)
      }
    } else {
      const endpointSchema = schema[path][method]

      args.splice(1, 0, (req, res, next) => {
        try {
          req.swagger = {
            schema: endpointSchema
          }
          const errors = validate(req, endpointSchema)
          if (errors.length) {
            return next(new RequestValidationError(errors))
          } else {
            if (options.buildResponses) {
              const _end = res.end

              res.end = (data, cb) => {
                res.end = _end

                const endpointSchema = schema[path][method].responses[res.statusCode]
                if (options.requireSchemaSpec && !endpointSchema) {
                  throw new SwaggerSchemaNotFound(path, method, 'response')
                }
                const isValid = endpointSchema.validate({
                  body: res.getHeader('content-type').startsWith('application/json') ? JSON.parse(data) : data,
                  headers: res.getHeaders()
                })

                if (!isValid) {
                  throw new ResponseValidationError(endpointSchema.errors)
                } else {
                  res.end(data, cb)
                }
              }
            }

            return next()
          }
        } catch (err) {
          return next(err)
        }
      })
    }
  })
}

function getSwaggerUi (swaggerSpec) {
  return `
      <!DOCTYPE html>
      <html lang="en">
      
      <head>
        <meta charset="UTF-8">
        <title>Swagger UI</title>
        <link
          href="https://fonts.googleapis.com/css?family=Open+Sans:400,700|Source+Code+Pro:300,600|Titillium+Web:400,600,700"
          rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/3.31.1/swagger-ui.css" integrity="sha512-1gs56cGdIn+SDweW3bEtMcVVxX+oWJdpKHztczu8WpE3GmZquxIpjg4IoOPRJ8hmTPLiZriIW38uE+059dcYcA==" crossorigin="anonymous" />
        <style>
          html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
          }
      
          *,
          *:before,
          *:after {
            box-sizing: inherit;
          }
      
          body {
            margin: 0;
            background: #fafafa;
          }
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/3.31.1/swagger-ui-bundle.min.js" integrity="sha512-oGb0sN1rO+CBXLRsaiWSWRrTj+Ja9Tq/iDqhetDHrtUlkuDEP4vQk1T5bIM1gRtTnnWJNf2CMc++oDZNiTIR8g==" crossorigin="anonymous"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/3.31.1/swagger-ui-standalone-preset.min.js" integrity="sha512-eaXFoJZC91+fHqbvojyUgDvwiwn2uZQ8mNe3RxZnJKl+bEWrxa/HLzammegshoUR2BLVlnuUXMMVRP6axf9suQ==" crossorigin="anonymous"></script>
        <script>
              const catalog = [{
                url: '${swaggerSpec}',
                name: 'API Documentation'
              }]
              const ui = SwaggerUIBundle({
                validatorUrl: null,
                urls: catalog,
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                  SwaggerUIBundle.presets.apis,
                  SwaggerUIStandalonePreset
                ],
                requestInterceptor: (req) => {
                  return req
                },
                displayRequestDuration: true,
                plugins: [SwaggerUIBundle.plugins.DownloadUrl],
                layout: "StandaloneLayout"
              })
              window.ui = ui
        </script>
      </body>
      </html>
  `
}

module.exports = {
  SwaggerSchemaNotFound,
  SwaggerValidationError,
  SwaggerValidator,
  RequestValidationError,
  ResponseValidationError
}
