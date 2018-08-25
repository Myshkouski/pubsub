module.exports = (req, res, next) => {
  res.setHeader('access-control-allow-origin', 'http://localhost:3000,http://localhost:8080')
  next()
}
