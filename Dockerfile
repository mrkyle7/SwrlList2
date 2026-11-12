# Swrl List web app for Cloud Run.
#
# Stage 1 builds the site with webpack; stage 2 serves dist/ with Express and
# carries only the runtime dependency (express).
#
# Base images come from mirror.gcr.io (Google's Docker Hub mirror) so builds
# are not subject to Docker Hub pull rate limits.

FROM mirror.gcr.io/library/node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY webpack.config.js ./
COPY src ./src
COPY www ./www
RUN npm run build

FROM mirror.gcr.io/library/node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "server.js"]
