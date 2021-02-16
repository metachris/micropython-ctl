const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: './src/main.ts',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  externals: ['serialport', 'crypto'],
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist-browser'),
    library: 'MicroPythonCtl',
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.DEBUG': JSON.stringify(process.env.DEBUG)
    })
  ]
};
