#!/bin/sh

# makes new self-signed SSL certificate for nginx

mkdir -p nginx/ssl

# create 2048-bit RSA key (secure enough for what we need) and certificate, valid for 2 years
openssl req -x509 -nodes -days 730 -newkey rsa:2048 \
  -keyout nginx/ssl/selfsigned.key \
  -out nginx/ssl/selfsigned.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/OU=Development/CN=localhost"

# set secure file permissions
chmod 600 nginx/ssl/selfsigned.key
chmod 644 nginx/ssl/selfsigned.crt

echo "✓ SSL certificate (self-signed) generated in 'nginx/ssl/'"
