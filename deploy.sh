#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

log() { echo -e "\033[1;34m[deploy]\033[0m $1"; }
require_sudo() { if [[ "$EUID" -ne 0 ]]; then SUDO="sudo"; else SUDO=""; fi; }

require_sudo

log "Checking dependencies (node, npm, git, pm2, nginx, certbot)..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
  $SUDO apt-get update && $SUDO apt-get install -y nodejs
fi
if ! command -v npm >/dev/null 2>&1; then $SUDO apt-get install -y npm; fi
if ! command -v git >/dev/null 2>&1; then $SUDO apt-get install -y git; fi
if ! command -v pm2 >/dev/null 2>&1; then $SUDO npm install -g pm2; fi
if ! command -v nginx >/dev/null 2>&1; then $SUDO apt-get update && $SUDO apt-get install -y nginx; fi
if ! command -v certbot >/dev/null 2>&1; then $SUDO apt-get install -y certbot python3-certbot-nginx; fi

if [[ ! -f .env ]]; then
  log "Creating .env from .env.example"
  cp .env.example .env
fi

set -a
source .env
set +a

log "Installing backend dependencies"
cd backend && npm install && cd ..
log "Installing frontend dependencies"
cd frontend && npm install && npm run build && cd ..

log "Starting backend with pm2"
pm2 startOrReload ecosystem.config.js
pm2 save

FRONTEND_ROOT="$PROJECT_DIR/frontend/dist"
DOMAIN="${DOMAIN_OR_IP:-_}"

log "Generating nginx configuration"
CONFIG_CONTENT="$(sed "s#__DOMAIN__#$DOMAIN#g; s#__FRONTEND_ROOT__#$FRONTEND_ROOT#g" nginx.conf.template)"
echo "$CONFIG_CONTENT" | $SUDO tee /etc/nginx/sites-available/ai-agency >/dev/null
$SUDO ln -sf /etc/nginx/sites-available/ai-agency /etc/nginx/sites-enabled/ai-agency
$SUDO rm -f /etc/nginx/sites-enabled/default
$SUDO nginx -t
$SUDO systemctl restart nginx

if [[ -n "${LETSENCRYPT_EMAIL:-}" && "$DOMAIN" != "_" ]]; then
  log "Obtaining Let's Encrypt staging certificate"
  $SUDO certbot --nginx --non-interactive --agree-tos --email "$LETSENCRYPT_EMAIL" --staging -d "$DOMAIN" || true
fi

FINAL_URL="http://$DOMAIN"
if [[ -n "${LETSENCRYPT_EMAIL:-}" && "$DOMAIN" != "_" ]]; then
  FINAL_URL="https://$DOMAIN"
fi

log "Deployment complete"
echo "URL: $FINAL_URL"
echo "Backend status:"
pm2 status ai-agency-backend
