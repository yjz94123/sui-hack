#!/usr/bin/env bash
set -euo pipefail

# Initialize Sui client config (first run will write config)
echo "y" | sui client

# Switch to testnet (adjust if you want mainnet later)
sui client switch --env testnet

# Create a new address and export its private key
# WARNING: The private key will be printed to the terminal.
new_addr_json="$(sui client new-address ed25519 --json)"
alias="$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read()).get("alias",""))' <<< "$new_addr_json")"

if [ -z "$alias" ]; then
  echo "Failed to parse alias from Sui CLI output. Printing raw output:"
  echo "$new_addr_json"
  exit 1
fi

echo "Private key (suiprivkey...) for alias: $alias"
sui keytool export --key-identity "$alias"

# Show active address and balance
sui client active-address
sui client gas
