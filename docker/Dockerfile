# syntax=docker/dockerfile:1
#
# KG Spaces for Nuxeo. Build context: this repository's root.
#
#   docker build -f docker/Dockerfile -t kg-spaces/kg-spaces-nuxeo .            the app (nginx, port 8080)
#   docker build -f docker/Dockerfile --target addon --output <dir> .                 the Web UI add-on jar, into <dir>
#
# The shared UI library comes from npm (app/package.json); to build against an unreleased one, put its tarball
# (flexible-graphrag-angular-ui-<version>.tgz, from `npm run pack:lib` in flexible-graphrag-ui/frontend-angular) in
# docker/lib/, with the flexible-graphrag-graph-view-<version>.tgz packed beside it when that is unreleased too.

# ----- the Web UI add-on jar -----
FROM eclipse-temurin:21-jdk-alpine AS addon-build
WORKDIR /addon
COPY webui-addon/ ./
RUN sh build.sh

FROM scratch AS addon
COPY --from=addon-build /addon/dist/*.jar /

# ----- the app -----
FROM node:24-alpine AS builder
WORKDIR /build
COPY app/package.json app/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY docker/lib/ /tmp/fglib/
RUN if ls /tmp/fglib/flexible-graphrag-angular-ui-*.tgz >/dev/null 2>&1; then \
      npm install --no-audit --no-fund /tmp/fglib/flexible-graphrag-*.tgz; fi
COPY app/ ./
RUN npx ng build --configuration production

FROM nginxinc/nginx-unprivileged:1-alpine
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 docker/40-kg-spaces-config.sh /docker-entrypoint.d/40-kg-spaces-config.sh
COPY --chown=101:101 --from=builder /build/dist/kg-spaces-nuxeo/browser/ /usr/share/nginx/html/
# where this image's own nginx sends /nuxeo/ and /api/ (when the app is used on its own port); the deployment's
# proxy serves both itself. Looked up per request through the container's DNS (NGINX_ENTRYPOINT_LOCAL_RESOLVERS: the
# nginx image fills in NGINX_LOCAL_RESOLVERS), so nginx starts even when one of them is down.
ENV NUXEO_URL=http://host.docker.internal:8081 \
    FLEXIBLE_GRAPHRAG_URL=http://host.docker.internal:8000 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1
