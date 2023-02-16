const bodyParser = require('body-parser')

module.exports = function init (app) {
  // Define some mock data for the API
  const persons = [
    { id: 1, name: 'John', age: 30, todos: ['Task 1', 'Task 2'], preferences: { color: 'blue', language: 'English' } },
    { id: 2, name: 'Jane', age: 25, todos: ['Task 3', 'Task 4'], preferences: { color: 'green', language: 'Spanish' } }
  ]

  // Enable JSON body parsing for the API
  app.use(bodyParser.json())

  // Define the routes for the API based on the OpenAPI specification
  // GET /persons
  app.get('/persons', (req, res) => {
    res.send(persons)
  })

  // POST /persons
  app.post('/persons', (req, res) => {
    const newPerson = req.body
    newPerson.id = persons.length + 1
    persons.push(newPerson)

    res.send(newPerson, 201)
  })

  // GET /persons/{id}
  app.get('/persons/:id', (req, res) => {
    const person = persons.find(p => p.id === parseInt(req.params.id))
    if (person) {
      res.send(person)
    } else {
      res.send('Person not found', 404)
    }
  })

  // PUT /persons/{id}
  app.put('/persons/:id', (req, res) => {
    const personIndex = persons.findIndex(p => p.id === parseInt(req.params.id))
    if (personIndex !== -1) {
      persons[personIndex] = { id: persons[personIndex].id, ...req.body }
      res.send(persons[personIndex])
    } else {
      res.send('Person not found', 404)
    }
  })

  // DELETE /persons/{id}
  app.delete('/persons/:id', (req, res) => {
    const personIndex = persons.findIndex(p => p.id === parseInt(req.params.id))
    if (personIndex !== -1) {
      persons.splice(personIndex, 1)
      res.send(204)
    } else {
      res.send('Person not found', 404)
    }
  })
}
