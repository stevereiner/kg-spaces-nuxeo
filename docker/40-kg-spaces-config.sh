#!/bin/sh
# Runtime settings for assets/config.json, applied at container start (the nginx image runs /docker-entrypoint.d/*
# in name order before nginx; 20-envsubst-on-templates.sh renders default.conf.template first).
#
#   KG_SPACES_NUXEO_BACKEND_URL  where the Flexible GraphRAG BACKEND reaches Nuxeo, server to server (the backend's
#                                NUXEO_URL); unset = keep the image's value
#
# Not `sed -i`: that makes a temp file beside the target, in a root-owned directory; rewriting through /tmp only
# needs write access to the file itself.
CONFIG_FILE=/usr/share/nginx/html/assets/config.json

if [ -n "${KG_SPACES_NUXEO_BACKEND_URL}" ] && [ -f "${CONFIG_FILE}" ]; then
  TMP=$(mktemp)
  sed "s|\"nuxeoBackendUrl\": *\"[^\"]*\"|\"nuxeoBackendUrl\": \"${KG_SPACES_NUXEO_BACKEND_URL}\"|" \
    "${CONFIG_FILE}" > "${TMP}" && cat "${TMP}" > "${CONFIG_FILE}"
  rm -f "${TMP}"
  if grep -q "\"nuxeoBackendUrl\": *\"${KG_SPACES_NUXEO_BACKEND_URL}\"" "${CONFIG_FILE}"; then
    echo "kg-spaces: nuxeoBackendUrl = ${KG_SPACES_NUXEO_BACKEND_URL}"
  else
    echo "kg-spaces: ERROR could not set nuxeoBackendUrl in ${CONFIG_FILE}" >&2
  fi
fi
