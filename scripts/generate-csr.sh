#!/bin/bash

# GameTime APNS Certificate Signing Request (CSR) Generator
# This script helps generate a CSR for Apple Push Notification certificates

set -e

echo "🍎 GameTime APNS CSR Generator"
echo "================================"
echo ""

# Check if OpenSSL is available
if ! command -v openssl &> /dev/null; then
    echo "❌ OpenSSL is not installed or not in PATH"
    echo "On macOS, you can install it with: brew install openssl"
    echo "Or use Keychain Access method instead (see docs/CSR_GENERATION_GUIDE.md)"
    exit 1
fi

# Create certificates directory if it doesn't exist
mkdir -p certificates

# Prompt for information
echo "Please provide the following information for your CSR:"
echo ""

read -p "Your Apple Developer email: " email
read -p "Your name or organization: " name
read -p "Country code (e.g., US): " country
read -p "State/Province: " state
read -p "City: " city
read -p "Organization name (e.g., GameTime): " org

# Set common name
common_name="GameTime APNS Certificate"

echo ""
echo "Generating CSR with the following information:"
echo "  Email: $email"
echo "  Name: $name" 
echo "  Country: $country"
echo "  State: $state"
echo "  City: $city"
echo "  Organization: $org"
echo "  Common Name: $common_name"
echo ""

# Generate private key
echo "🔑 Generating private key..."
openssl genrsa -out certificates/gametime_apns_private_key.pem 2048

# Generate CSR
echo "📝 Generating Certificate Signing Request..."
openssl req -new \
    -key certificates/gametime_apns_private_key.pem \
    -out certificates/GameTime_APNS_CSR.csr \
    -subj "/C=$country/ST=$state/L=$city/O=$org/CN=$common_name/emailAddress=$email"

echo ""
echo "✅ CSR generated successfully!"
echo ""
echo "Files created:"
echo "  📄 certificates/GameTime_APNS_CSR.csr (upload this to Apple Developer Portal)"
echo "  🔐 certificates/gametime_apns_private_key.pem (keep this safe and private!)"
echo ""
echo "Next steps:"
echo "1. Go to https://developer.apple.com"
echo "2. Navigate to Certificates, Identifiers & Profiles"
echo "3. Create a new certificate for 'Apple Push Notification service SSL (Sandbox)'"
echo "4. Upload the GameTime_APNS_CSR.csr file when prompted"
echo "5. Download the certificate and install it in Keychain Access"
echo ""
echo "⚠️  Important: Keep the private key file safe and backed up!"
echo "   You'll need it to use the certificate Apple generates."
echo ""

# Set appropriate permissions
chmod 600 certificates/gametime_apns_private_key.pem
chmod 644 certificates/GameTime_APNS_CSR.csr

echo "🔒 Set secure permissions on private key file"
echo ""
echo "For more detailed instructions, see: docs/CSR_GENERATION_GUIDE.md"
