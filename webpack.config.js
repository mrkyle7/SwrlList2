const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

// Builds the whole site into dist/: the static files from www/ plus bundle.js.
module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/',
    assetModuleFilename: 'fonts/[name][ext]',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(woff2?|ttf|eot)$/,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new CopyPlugin({ patterns: [{ from: 'www' }] })
  ],
  performance: {
    // One bundle, dominated by the Firebase SDK; the service worker caches it.
    maxAssetSize: 1500000,
    maxEntrypointSize: 1500000
  }
};
