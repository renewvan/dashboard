# `dist/` is static JS, identical for every target arch, so the build stage always runs on the
# builder's native platform (no QEMU) and only the nginx stage is produced per-arch.
FROM --platform=$BUILDPLATFORM ghcr.io/voidzero-dev/vite-plus:1.3.0 AS build

WORKDIR /app
# `.node-version` is copied with the manifests so `vp` provisions the pinned Node.js. The image
# runs as the non-root `vp` user, so every COPY needs --chown.
COPY --chown=vp:vp package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
RUN vp install --frozen-lockfile --ignore-scripts
COPY --chown=vp:vp . .
# `vp run build` (not the `vp build` built-in) so the package.json script type-checks first.
RUN vp run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/generate-env-js.sh /docker-entrypoint.d/10-generate-env-js.sh
RUN chmod +x /docker-entrypoint.d/10-generate-env-js.sh
EXPOSE 80
