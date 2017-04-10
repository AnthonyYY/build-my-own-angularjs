module.exports = function(config){
  config.set({
    frameworks: ['browserify','jasmine'],
    files: [
      'node_modules/jasmine-core/index.js',
      'src/**/*.js',
      'test/**/*_spec.js',
    ],
    preprocessors: {
      'src/**/*.js': ['jshint','browserify'],
      'test/**/*.js': ['jshint','browserify']
    },
    browsers: ['PhantomJS'],
    browserify: {
      debug: true
    }
  })
}
