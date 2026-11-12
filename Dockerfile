# Browser build of Swrl List for Cloud Run.
#
# Stage 1 builds the Cordova 8 "browser" platform; stage 2 serves the static
# output with Express.
#
# The build runs on Node 22, not the Node 11.7.0 in package.json "engines":
# cordova-universal-links-plugin installs the latest `plist` at build time,
# which is published as ES modules and cannot be loaded by Node 11
# ("SyntaxError: Unexpected token export"). Node 22 can require() it, and
# --openssl-legacy-provider keeps the project's webpack 4 working there.
#
# Base images come from mirror.gcr.io (Google's Docker Hub mirror) so Cloud
# Build is not subject to Docker Hub pull rate limits.

FROM mirror.gcr.io/library/node:22 AS build
WORKDIR /app
# npm_config_include=dev: Cordova installs each plugin with `npm install
# --production`, which on a modern npm prunes the dev dependencies webpack
# needs (babel-loader etc.). "include" wins over that flag.
ENV CI=1 CYPRESS_INSTALL_BINARY=0 NODE_OPTIONS=--openssl-legacy-provider \
    npm_config_include=dev
RUN npm install -g cordova@8.1.2
COPY package.json package-lock.json ./
RUN npm install
COPY . .
# Mirrors the old heroku-postbuild: the repeated prepare is a known
# workaround for plugins that only restore on a second pass.
RUN cordova platform add browser \
 && cordova prepare browser \
 && cordova prepare browser \
 && cordova prepare browser \
 && test -s platforms/browser/www/bundle.js \
 && test -s platforms/browser/www/cordova.js \
 && grep -q cordova-plugin-device platforms/browser/www/cordova_plugins.js \
 && grep -q cordova-plugin-network-information platforms/browser/www/cordova_plugins.js

FROM mirror.gcr.io/library/node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY --from=build /app/platforms/browser/www ./platforms/browser/www
USER node
EXPOSE 8080
CMD ["node", "server.js"]
