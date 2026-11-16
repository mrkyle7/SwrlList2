const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

const dist = path.resolve(__dirname, 'dist');

// Builds the whole site into dist/: the static files from www/, bundle.js and
// the push-notification service worker.
//
// `--env emulators` (npm run build:emulators) points the app at the local
// Firebase emulators instead of the live project, for testing.
module.exports = (env = {}) => {
  // Shown discreetly in the menu: the package version, plus the commit it was
  // built from when the build is told (GIT_SHA, set by the deploy's Docker build).
  const commit = (process.env.GIT_SHA || '').slice(0, 7);
  const version = 'v' + require('./package.json').version + (commit ? ' · ' + commit : '');
  const define = new webpack.DefinePlugin({
    USE_FIREBASE_EMULATORS: JSON.stringify(Boolean(env.emulators)),
    APP_VERSION: JSON.stringify(version)
  });

  return [
    {
      name: 'app',
      entry: './src/index.js',
      output: {
        path: dist,
        filename: 'bundle.js',
        publicPath: '/',
        assetModuleFilename: 'fonts/[name][ext]'
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
        define,
        new CopyPlugin({ patterns: [{ from: 'www' }] })
      ],
      performance: {
        // One bundle, dominated by the Firebase SDK; the service worker caches it.
        maxAssetSize: 1500000,
        maxEntrypointSize: 1500000
      }
    },
    {
      name: 'messaging-sw',
      target: 'webworker',
      entry: './src/firebase/messaging-sw.js',
      output: {
        path: dist,
        filename: 'firebase-messaging-sw.js'
      },
      plugins: [define]
    }
  ];
};
