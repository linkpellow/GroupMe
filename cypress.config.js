module.exports = {
  e2e: {
    baseUrl: process.env.CYPRESS_baseUrl || 'http://localhost:3000',
    defaultCommandTimeout: 10000,
  },
}; 