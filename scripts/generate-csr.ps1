# GameTime APNS Certificate Signing Request (CSR) Generator (Windows PowerShell)
# This script helps generate a CSR for Apple Push Notification certificates

Write-Host "🍎 GameTime APNS CSR Generator" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Check if OpenSSL is available
$opensslPath = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $opensslPath) {
    Write-Host "❌ OpenSSL is not installed or not in PATH" -ForegroundColor Red
    Write-Host "You can install OpenSSL on Windows by:"
    Write-Host "1. Download from https://slproweb.com/products/Win32OpenSSL.html"
    Write-Host "2. Or install via Chocolatey: choco install openssl"
    Write-Host "3. Or install via Scoop: scoop install openssl"
    Write-Host "4. Or use the macOS Keychain Access method instead (see docs/CSR_GENERATION_GUIDE.md)"
    exit 1
}

# Create certificates directory if it doesn't exist
if (-not (Test-Path "certificates")) {
    New-Item -ItemType Directory -Path "certificates" | Out-Null
}

# Prompt for information
Write-Host "Please provide the following information for your CSR:" -ForegroundColor Yellow
Write-Host ""

$email = Read-Host "Your Apple Developer email"
$name = Read-Host "Your name or organization"
$country = Read-Host "Country code (e.g., US)"
$state = Read-Host "State/Province"
$city = Read-Host "City"
$org = Read-Host "Organization name (e.g., GameTime)"

# Set common name
$commonName = "GameTime APNS Certificate"

Write-Host ""
Write-Host "Generating CSR with the following information:" -ForegroundColor Cyan
Write-Host "  Email: $email"
Write-Host "  Name: $name" 
Write-Host "  Country: $country"
Write-Host "  State: $state"
Write-Host "  City: $city"
Write-Host "  Organization: $org"
Write-Host "  Common Name: $commonName"
Write-Host ""

try {
    # Generate private key
    Write-Host "🔑 Generating private key..." -ForegroundColor Yellow
    & openssl genrsa -out certificates/gametime_apns_private_key.pem 2048
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to generate private key"
    }

    # Generate CSR
    Write-Host "📝 Generating Certificate Signing Request..." -ForegroundColor Yellow
    $subject = "/C=$country/ST=$state/L=$city/O=$org/CN=$commonName/emailAddress=$email"
    & openssl req -new -key certificates/gametime_apns_private_key.pem -out certificates/GameTime_APNS_CSR.csr -subj $subject
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to generate CSR"
    }

    Write-Host ""
    Write-Host "✅ CSR generated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Files created:" -ForegroundColor Cyan
    Write-Host "  📄 certificates/GameTime_APNS_CSR.csr (upload this to Apple Developer Portal)"
    Write-Host "  🔐 certificates/gametime_apns_private_key.pem (keep this safe and private!)"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Go to https://developer.apple.com"
    Write-Host "2. Navigate to Certificates, Identifiers & Profiles"
    Write-Host "3. Create a new certificate for 'Apple Push Notification service SSL (Sandbox)'"
    Write-Host "4. Upload the GameTime_APNS_CSR.csr file when prompted"
    Write-Host "5. Download the certificate and install it in Keychain Access (macOS) or manage via EAS"
    Write-Host ""
    Write-Host "⚠️  Important: Keep the private key file safe and backed up!" -ForegroundColor Red
    Write-Host "   You'll need it to use the certificate Apple generates."
    Write-Host ""
    Write-Host "For more detailed instructions, see: docs/CSR_GENERATION_GUIDE.md" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "❌ Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check that OpenSSL is properly installed and try again."
    exit 1
}
