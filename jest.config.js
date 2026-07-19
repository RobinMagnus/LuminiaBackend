module.exports = {
  collectCoverageFrom: [
    'src/app.js',
    'src/controllers/**/*.js',
    'src/middlewares/**/*.js',
    'src/models/**/*.js',
    'src/routes/**/*.js',
    '!src/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 90.01,
      functions: 90.01,
      lines: 90.01,
      statements: 90.01
    }
  }
};
