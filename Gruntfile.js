'use strict';

var matchdep = require('matchdep');

module.exports = function(grunt) {

  grunt.initConfig({
    clean: {
      dist: ['dist/*.js']
    },
    browserify: {
      options: {
        browserifyOptions: {
          debug: false,
          standalone: 'c' // Export to window.c
        },
        ignore: ['buffer'], // will use ArrayBuffer in browsers
        transform: ['babelify']
      },
      dist: {
        src: ['index.js'],
        dest: 'dist/c.js'
      }
    },
    uglify: {
      dist: {
        files: {
          'dist/c.min.js': 'dist/c.js',
        }
      }
    },
    simplemocha: {
      options: {
        globals: ['expect'],
        ui: 'bdd',
        reporter: 'tap'
      },
      test: {
        src: 'test/spec/*.js'
      }
    },
    eslint: {
      target: {
        src: ['lib/**/*.js']
      }
    },
  });


  // Load all grunt tasks in package.json
  matchdep.filterAll('grunt-*').forEach(function(pkgName){
    grunt.loadNpmTasks(pkgName);
  });
  grunt.registerTask('test', ['browserify', 'simplemocha']);
  grunt.registerTask('release', ['clean:dist', 'browserify', 'uglify']);
  grunt.registerTask('default', ['eslint', 'test', 'release']);
};
