const crypto = require('crypto');
const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

const dist = path.resolve(__dirname, 'dist');

// Builds the whole site into dist/: the static files from www/, the app
// (bundle.<hash>.js), the stylesheet renamed css/index.<hash>.css, and the
// push-notification service worker.
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

  // dist/version.json holds the same string the bundle was built with, so a
  // running app can tell when a newer build is live (src/components/updateCheck.js).
  const writeVersion = {
    apply(compiler) {
      compiler.hooks.thisCompilation.tap('SwrlVersion', compilation => {
        compilation.hooks.processAssets.tap({ name: 'SwrlVersion', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL }, () => {
          // updateNotice in package.json ({version, text}) marks a release that
          // changes how the app looks or works enough to ask before switching;
          // it stays until a later release replaces it, so an app that skipped
          // that release still gets asked
          const notice = require('./package.json').updateNotice;
          compilation.emitAsset('version.json', new webpack.sources.RawSource(JSON.stringify(notice ? { version, notice } : { version })));
        });
      });
    }
  };

  // Content-hashed names for the app and the stylesheet, so the server can let
  // browsers keep them for a year and the service worker can keep one build's
  // files together. index.html and sw.js are rewritten to name this build's
  // files: sw.js changes with every build, which is how a new build reaches an
  // installed app (src/components/updateCheck.js, www/sw.js).
  const hashedShell = {
    apply(compiler) {
      compiler.hooks.thisCompilation.tap('SwrlHashedShell', compilation => {
        compilation.hooks.processAssets.tap({ name: 'SwrlHashedShell', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER }, () => {
          const { RawSource } = webpack.sources;
          const bundle = Object.keys(compilation.assets).find(name => /^bundle\.[0-9a-f]+\.js$/.test(name));
          const css = compilation.getAsset('css/index.css');
          const index = compilation.getAsset('index.html');
          const sw = compilation.getAsset('sw.js');
          if (!bundle || !css || !index || !sw) {
            compilation.errors.push(new webpack.WebpackError('SwrlHashedShell: bundle, css/index.css, index.html or sw.js missing'));
            return;
          }
          const cssSource = css.source.source();
          const cssHash = crypto.createHash('sha256').update(cssSource).digest('hex').slice(0, 8);
          const cssName = `css/index.${cssHash}.css`;
          compilation.emitAsset(cssName, new RawSource(cssSource));
          compilation.deleteAsset('css/index.css');
          const html = index.source.source().toString();
          // by now the HTML may be minified, with its attribute quotes gone
          const script = /src=(["']?)bundle\.js\1(?=[\s>])/;
          const style = /href=(["']?)css\/index\.css\1(?=[\s>/])/;
          if (!script.test(html) || !style.test(html)) {
            compilation.errors.push(new webpack.WebpackError('SwrlHashedShell: index.html no longer names bundle.js and css/index.css'));
            return;
          }
          compilation.updateAsset('index.html', new RawSource(html
            .replace(script, `src="${bundle}"`)
            .replace(style, `href="${cssName}"`)));
          const build = crypto.createHash('sha256').update(bundle + cssName + html + version).digest('hex').slice(0, 10);
          const worker = sw.source.source().toString();
          // minified by now: quotes may have changed and the constants may be
          // inlined (e.g. "swrl-shell-__BUILD__"), so replace every occurrence
          const files = /(["'])__SHELL_FILES__\1/g;
          if (!worker.includes('__BUILD__') || !files.test(worker)) {
            compilation.errors.push(new webpack.WebpackError('SwrlHashedShell: sw.js placeholders missing'));
            return;
          }
          compilation.updateAsset('sw.js', new RawSource(worker
            .replace(/__BUILD__/g, build)
            .replace(files, JSON.stringify(['/' + bundle, '/' + cssName]))));
        });
      });
    }
  };

  return [
    {
      name: 'app',
      entry: './src/index.js',
      output: {
        path: dist,
        filename: 'bundle.[contenthash:8].js',
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
        writeVersion,
        new CopyPlugin({ patterns: [{ from: 'www' }] }),
        hashedShell
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
