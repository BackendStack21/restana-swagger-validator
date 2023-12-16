/* global describe, it */

const chai = require('chai')
const { expect } = chai
const restana = require('restana')
const axios = require('axios')

const {
  SwaggerSchemaNotFound,
  SwaggerValidationError,
  SwaggerValidator,
  RequestValidationError,
  ResponseValidationError,
  getSwaggerUi
} = require('../src/index')

describe('SwaggerSchemaNotFound', () => {
  it('should set path, method and type properties', () => {
    const error = new SwaggerSchemaNotFound('/test', 'GET', 'response')
    expect(error.path).to.equal('/test')
    expect(error.method).to.equal('GET')
    expect(error.type).to.equal('response')
  })
})

describe('SwaggerValidationError', () => {
  it('should set errors and statusCode properties', () => {
    const error = new SwaggerValidationError('Validation failed', 400, ['error 1', 'error 2'])
    expect(error.errors).to.deep.equal(['error 1', 'error 2'])
    expect(error.statusCode).to.equal(400)
  })
})

describe('RequestValidationError', () => {
  it('should set message, statusCode and errors properties', () => {
    const error = new RequestValidationError(['error 1', 'error 2'])
    expect(error.message).to.equal('Swagger request validation failed!')
    expect(error.statusCode).to.equal(400)
    expect(error.errors).to.deep.equal(['error 1', 'error 2'])
  })
})

describe('ResponseValidationError', () => {
  it('should set message, statusCode and errors properties', () => {
    const error = new ResponseValidationError(['error 1', 'error 2'])
    expect(error.message).to.equal('Swagger response validation failed!')
    expect(error.statusCode).to.equal(500)
    expect(error.errors).to.deep.equal(['error 1', 'error 2'])
  })
})

describe('SwaggerValidator - smoke', () => {
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
  const spec = {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Test API'
    },
    paths: {
      '/test': {
        get: {
          parameters: [
            {
              name: 'name',
              in: 'query',
              schema: { type: 'string' },
              required: true
            }
          ],
          responses: {
            200: {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/test-invalid-response': {
        get: {
          responses: {
            200: {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/test-invalid-payload': {
        get: {
          responses: {
            200: {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/test-missing-response-spec': {
        get: {
          responses: {
            201: {
              description: 'Success'
            }
          }
        }
      }
    }
  }

  it('should fail on invalid spec', (done) => {
    try {
      SwaggerValidator(app, {}, {})
    } catch (err) {
      expect(err.message).to.eq('Invalid OpenAPI specification was provided "Cannot convert undefined or null to object"')
      done()
    }
  })

  it('should init validator and register valid routes', (done) => {
    SwaggerValidator(app, spec, {})
    app.get('/test', (req, res) => {
      res.send({
        name: req.query.name
      })
    })

    app.get('/test-missing-response-spec', (req, res) => {
      res.send('Created!', 204)
    })

    app.get('/test-invalid-response', (req, res) => {
      res.send([])
    })

    app.get('/test-invalid-payload', (req, res) => {
      res.setHeader('content-type', 'application/json')
      res.end('"Invalid JSON')
    })

    done()
  })

  it('should fail on route with missing definition', (done) => {
    try {
      app.get('/undefined-spec-endpoint', (req, res) => {
        res.send(200)
      })
    } catch (err) {
      expect(err).instanceOf(SwaggerSchemaNotFound)
      done()
    }
  })

  it('should start app', async () => {
    await app.start()
  })

  it('should get swagger spec', async () => {
    const url = 'http://localhost:3000/swagger.json'
    const options = {
      method: 'GET',
      url
    }

    const response = await axios.request(options)
    expect(response.data).deep.eq(spec)
  })

  it('should get swagger UI', async () => {
    const url = 'http://localhost:3000/docs'
    const options = {
      method: 'GET',
      url
    }

    const response = await axios.request(options)
    expect(response.data).to.eq(getSwaggerUi('http://localhost:3000/swagger.json'))
  })

  it('should succeed on valid GET /test', async () => {
    const url = 'http://localhost:3000/test?name=OpenAPI'
    const options = {
      method: 'GET',
      url
    }

    const response = await axios.request(options)
    expect(response.data.name).to.eq('OpenAPI')
  })

  it('should fail on invalid GET /test', async () => {
    const url = 'http://localhost:3000/test'
    const options = {
      method: 'GET',
      url
    }

    try {
      await axios.request(options)
    } catch ({ response }) {
      expect(response.status).to.eq(400)
      expect(response.data.message).to.eq('Swagger request validation failed!')
      expect(response.data.errors.length).to.eq(1)
    }
  })

  it('should fail on missing response spec GET /test-missing-response-spec', async () => {
    const url = 'http://localhost:3000/test-missing-response-spec'
    const options = {
      method: 'GET',
      url
    }

    try {
      await axios.request(options)
    } catch ({ response }) {
      expect(response.status).to.eq(500)
      expect(response.data.message).to.eq('Swagger schema not found for response!')
    }
  })

  it('should fail on invalid response GET /test-invalid-response', async () => {
    const url = 'http://localhost:3000/test-invalid-response'
    const options = {
      method: 'GET',
      url
    }

    try {
      await axios.request(options)
    } catch ({ response }) {
      expect(response.status).to.eq(500)
      expect(response.data.message).to.eq('Swagger response validation failed!')
      expect(response.data.errors.length).to.eq(1)
    }
  })

  it('should fail on invalid JSON parsing GET /test-invalid-payload', async () => {
    const url = 'http://localhost:3000/test-invalid-payload'
    const options = {
      method: 'GET',
      url
    }

    try {
      await axios.request(options)
    } catch ({ response }) {
      expect(response.status).to.eq(500)
    }
  })

  it('change validator settings (requireSchemaSpec = false)', async () => {
    app.swaggerValidatorOptions.requireSchemaSpec = false
  })

  it('should succeed on missing response spec GET /test-missing-response-spec after (requireSchemaSpec = false)', async () => {
    const url = 'http://localhost:3000/test-missing-response-spec'
    const options = {
      method: 'GET',
      url
    }

    await axios.request(options)
  })

  it('should stop app', async () => {
    await app.close()
  })
})
