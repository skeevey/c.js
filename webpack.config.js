var webpack = require('webpack');

module.exports = {
  entry: './index.js',
  output: {
    filename: './dist/c.js',
    sourceMapFilename: './dist/c.js.map',
    devtoolModuleFilenameTemplate: '../[resource-path]',
    library: 'c',
    libraryTarget: 'umd'
  },
  module: {
    loaders: [
      {
        test: /\.(?:js|es).?$/,
        loader: 'babel-loader?cacheDirectory',
        exclude: /(node_modules)/
      }
    ]
  },
  resolve: {
    extensions: ['', '.webpack.js', '.web.js', '.js', '.es6']
  },
  plugins: [
    new webpack.IgnorePlugin(/buffer/)
  ]
};
