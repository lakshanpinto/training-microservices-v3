const express = require('express')
const proxy = require('express-http-proxy')
const cors = require('cors')
const { cacheMiddleware, updateCache, requestWithCache } = require('./cache')

const { productsAPIURL, usersAPIURL } = require('./config')
const auth = require('./auth')

const api = express()

// api.use(cors())

// TODO use route versioning
api.post('/users/register', proxy(usersAPIURL))
api.post(
  '/users/login',
  proxy(usersAPIURL, {
    proxyReqPathResolver: function (req) {
      return '/login'
    },
    userResDecorator: function (proxyRes, proxyResData, userReq, userRes) {
      if (proxyRes.statusCode === 200) {
        console.log(proxyResData.toString('UTF-8'))
        const { id: userId, username, email } = JSON.parse(
          proxyResData.toString('UTF-8')
        )

        const isAdmin = true

        return JSON.stringify({
          message: 'Successful login',
          token: auth.sign({ userId, isAdmin }),
          user: {
            username,
            email,
            isAdmin
          }
        })
      }
      return proxyResData
    }
  })
)

api.get('/products', cacheMiddleware, proxy(productsAPIURL, { userResDecorator: updateCache }))
api.get('/products/:id', (req, res) => {
  requestWithCache(`${productsAPIURL}/products/${req.params.id}`, 'GET')
    .then(result => {
      res.send(result)
    })
    .catch( err => {
      res.status(500).send()
    })
})
api.post('/products', auth.middleware, proxy(productsAPIURL))
api.get('/products/:id', proxy(productsAPIURL))
api.delete('/products/:id', auth.middleware, proxy(productsAPIURL))
api.put('/products/:id', auth.middleware, proxy(productsAPIURL))

module.exports = api
