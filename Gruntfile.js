'use strict';

var path = require('path');
var matchdep = require('matchdep');

module.exports = function(grunt) {

  grunt.initConfig({
    clean: {
      dist: ['dist/*.js']
    },
    browserify: {
      options: {
        bundleOptions: {
          debug: false,
          standalone: 'c' // Export to window.c
        },
        ignore: ['buffer'] // will use ArrayBuffer in browsers
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
    jshint: {
      validate: {
        src: ['lib/**/*.js']
      },
      options: grunt.file.readJSON('.jshintrc')
    },
  });


  // Load all grunt tasks in package.json
  matchdep.filterAll('grunt-*').forEach(function(pkgName){
    grunt.loadNpmTasks(pkgName);
  });
  grunt.registerTask('test', ['browserify', 'simplemocha']);
  grunt.registerTask('release', ['clean:dist', 'browserify', 'uglify']);
  grunt.registerTask('default', ['jshint', 'test', 'release']);
};
