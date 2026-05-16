#!/usr/bin/env bash
# Wrapper de assinatura — Tauri chama este script via `signCommand` passando
# o path do .exe a assinar como argumento. Assinamos in-place.
#
# Cert local: codesign/remoctrl-dev.pfx (auto-assinado, válido só na máquina
# do dev depois de importar o .crt no Trusted Root). Quando comprar EV cert,
# basta trocar o caminho e a senha.

set -euo pipefail

FILE="${1:?missing file path}"
CERT_DIR="$(dirname "$(readlink -f "$0")")"
PFX="$CERT_DIR/remoctrl-dev.pfx"
PASSWORD="remoctrl"

osslsigncode sign \
  -pkcs12 "$PFX" \
  -pass "$PASSWORD" \
  -n "Remoctrl" \
  -i "https://remoctrl.app" \
  -t "http://timestamp.digicert.com" \
  -h sha256 \
  -in "$FILE" \
  -out "$FILE.signed"

mv "$FILE.signed" "$FILE"
echo "✓ Assinado: $FILE"
