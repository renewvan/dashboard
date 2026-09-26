#!/bin/sh
# Generates /usr/share/nginx/html/env.js from this container's environment
# at startup. The SPA in dist/ was built once in CI -- Vite's VITE_* env
# vars are inlined then, not at container runtime -- so this is what lets
# the same published image point at a different renewvan bus per deployment.
# Runs automatically: the official nginx image executes every executable
# *.sh under /docker-entrypoint.d/ before starting nginx.
set -eu

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV__ = {
  VITE_MQTT_WS_URL: "$(json_escape "${VITE_MQTT_WS_URL:-}")",
  VITE_MQTT_USERNAME: "$(json_escape "${VITE_MQTT_USERNAME:-}")",
  VITE_MQTT_PASSWORD: "$(json_escape "${VITE_MQTT_PASSWORD:-}")"
};
EOF
