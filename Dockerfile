# Phase 1 of the Heroku → Cloud Run migration: containerise the *current*
# stack verbatim. Node 11.7.0 + Cordova 8.1.2 are intentional; modernisation
# happens in Phase 2 (see MIGRATION_PLAN.md).

FROM node:11.7.0

# Cypress 4.5's postinstall downloads a binary that's no longer reliably
# fetchable, and the runtime container has no use for it.
ENV CYPRESS_INSTALL_BINARY=0

WORKDIR /app

# Cordova is invoked from npm scripts and from this Dockerfile; install it
# globally so the bare `cordova` binary resolves.
RUN npm install -g cordova@8.1.2

# Install deps from the lockfile for reproducibility. devDependencies are
# required at build time because cordova-plugin-webpack pulls babel-loader
# and the css/sass/style/file loaders.
COPY package.json package-lock.json ./
RUN npm ci

# Bring in the rest of the source so cordova has something to prepare.
COPY . .

# Mirrors the heroku-postbuild recipe: add the browser platform and prepare
# three times. The 3× prepare is a documented workaround per CLAUDE.md and
# package.json — do NOT trim it.
RUN cordova platform add browser \
 && cordova prepare browser \
 && cordova prepare browser \
 && cordova prepare browser

# Cloud Run injects PORT=8080.
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
