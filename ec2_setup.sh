#!/bin/bash
# Chrysalis EC2 Stability Script
# Run this to prevent "npm install" from crashing your server

echo "🚀 Increasing Virtual RAM (Swap)..."
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

echo "✅ Swap memory enabled. You can now run npm install safely."
