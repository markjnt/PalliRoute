#!/bin/bash
# Generiert selbstsignierte SSL-Zertifikate für PalliRoute (interne Anwendung über VPN)
# Führen Sie dieses Skript einmal vor dem ersten Start aus.

set -e
CERT_DIR="$(cd "$(dirname "$0")" && pwd)/certs"
mkdir -p "$CERT_DIR"

# Ersetzen Sie SERVER_HOST durch Ihren Servernamen bzw. die IP-Adresse, über die
# die Anwendung erreichbar ist (z.B. palliroute.internal oder 192.168.1.100)
SERVER_HOST="${SERVER_HOST:-localhost}"

echo "Erstelle Zertifikate in $CERT_DIR für: localhost, 127.0.0.1, $SERVER_HOST"

# OpenSSL-Konfiguration mit Subject Alternative Names (für Browser-Kompatibilität)
CONFIG_FILE=$(mktemp)
cat > "$CONFIG_FILE" << EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = palliroute

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
DNS.3 = $SERVER_HOST
IP.1 = 127.0.0.1
EOF

openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -config "$CONFIG_FILE"

rm "$CONFIG_FILE"

echo "Fertig. Zertifikate erstellt:"
echo "  - $CERT_DIR/cert.pem"
echo "  - $CERT_DIR/key.pem"
echo ""
echo "Hinweis: Wenn Sie die Anwendung über eine andere IP/Hostname erreichen,"
echo "führen Sie das Skript erneut aus mit: SERVER_HOST=192.168.1.100 ./generate-certs.sh"
