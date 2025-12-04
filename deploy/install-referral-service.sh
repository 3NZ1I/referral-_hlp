#!/usr/bin/env bash
# Installs systemd service to auto-start the docker-compose stack on boot
SERVICE_FILE="/etc/systemd/system/referral.service"
if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root or with sudo"
  exit 1
fi

cp deploy/referral.service "$SERVICE_FILE"
systemctl daemon-reload
systemctl enable referral.service
systemctl start referral.service
echo "Service installed and started. Check status: sudo systemctl status referral.service"
