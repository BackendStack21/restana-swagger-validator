/* global describe, it */

const chai = require('chai')
const { expect } = chai
const restana = require('restana')
const axios = require('axios')
const personService = require('./person-service')

const {
  SwaggerValidator
} = require('../src/index')

describe('SwaggerValidator - person-api', () => {
  const app = restana()
  const spec = require('./person-spec.json')

  it('should init validator and register valid routes', (done) => {
    SwaggerValidator(app, spec, {})
    personService(app)

    done()
  })

  it('should start app', async () => {
    await app.start()
  })

  it('should succeed in calling all endpoints with successful arguments', async () => {
    // Define the base URL for the API server
    const baseURL = 'http://localhost:3000'

    const api = axios.create({
      baseURL
    })

    const personsAPI = {
      getAll: () => api.get('/persons'),
      getById: (id) => api.get(`/persons/${id}`),
      create: (person) => api.post('/persons', person),
      updateById: (id, person) => api.put(`/persons/${id}`, person),
      deleteById: (id) => api.delete(`/persons/${id}`)
    }

    await personsAPI.getAll()
    await personsAPI.getById(1)
    await personsAPI.create({ name: 'Alice', age: 28, todos: [], preferences: { color: 'purple', language: 'French' } })
    await personsAPI.updateById(1, { name: 'John Doe', age: 31 })
    await personsAPI.deleteById(1)
  })

  it('should fail on invalid request payload', async () => {
    // Define the base URL for the API server
    const baseURL = 'http://localhost:3000'

    const api = axios.create({
      baseURL
    })

    const personsAPI = {
      create: (person) => api.post('/persons', person)
    }

    try {
      await personsAPI.create({ age: 'Hello', todos: [], preferences: { color: 'purple', language: 'French' } })
    } catch ({ response }) {
      expect(response.status).to.eq(400)
    }
  })

  it('should stop app', async () => {
    await app.close()
  })
})
