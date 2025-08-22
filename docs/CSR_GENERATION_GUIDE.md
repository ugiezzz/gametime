# Certificate Signing Request (CSR) Generation Guide

This guide will help you create a Certificate Signing Request (CSR) file for Apple Push Notification service SSL certificates.

## What is a CSR?

A Certificate Signing Request (CSR) is a file that contains your public key and identifying information. Apple uses this to generate your push notification certificate.

## Method 1: Using macOS Keychain Access (Recommended)

### Step 1: Open Keychain Access
1. Press `Cmd + Space` and search for "Keychain Access"
2. Open the Keychain Access application

### Step 2: Request a Certificate
1. In Keychain Access, go to **Keychain Access** > **Certificate Assistant** > **Request a Certificate From a Certificate Authority**
2. Fill in the form:
   - **User Email Address**: Your Apple Developer account email
   - **Common Name**: Your name or company name (e.g., "GameTime App Push Certificate")
   - **CA Email Address**: Leave blank
   - **Request is**: Select "Saved to disk"
   - **Let me specify key pair information**: Check this box

### Step 3: Key Pair Information
1. Click "Continue"
2. Choose:
   - **Key Size**: 2048 bits
   - **Algorithm**: RSA
3. Click "Continue"

### Step 4: Save the CSR
1. Choose where to save the CSR file (e.g., Desktop)
2. Name it something descriptive like `GameTime_APNS_CSR.certSigningRequest`
3. Click "Save"

## Method 2: Using OpenSSL (Command Line)

If you prefer using the command line or don't have access to macOS:

### Step 1: Generate Private Key
```bash
openssl genrsa -out gametime_apns_private_key.pem 2048
```

### Step 2: Create CSR
```bash
openssl req -new -key gametime_apns_private_key.pem -out GameTime_APNS_CSR.csr -subj "/C=US/ST=YourState/L=YourCity/O=YourOrganization/OU=YourUnit/CN=GameTime APNS Certificate/emailAddress=your-email@example.com"
```

Replace the following values:
- `C=US`: Your country code
- `ST=YourState`: Your state/province
- `L=YourCity`: Your city
- `O=YourOrganization`: Your organization name
- `OU=YourUnit`: Your organizational unit (optional)
- `CN=GameTime APNS Certificate`: Common name for the certificate
- `emailAddress=your-email@example.com`: Your Apple Developer account email

## What to do with the CSR file

1. **Upload to Apple Developer Portal**: 
   - Go to [developer.apple.com](https://developer.apple.com)
   - Navigate to Certificates, Identifiers & Profiles
   - Create a new certificate for Apple Push Notification service SSL (Sandbox)
   - Upload your CSR file when prompted

2. **Keep the private key safe**: 
   - If you used Keychain Access, the private key is automatically stored in your keychain
   - If you used OpenSSL, keep the `.pem` file secure and backed up

## Important Notes

- **For Development**: Use "Apple Push Notification service SSL (Sandbox)" certificate type
- **For Production**: Use "Apple Push Notification service SSL (Production)" certificate type
- **Bundle ID**: Make sure your certificate is associated with the correct Bundle ID (`com.gametimeapp.app`)
- **Expiration**: APNS certificates expire after 1 year and need to be renewed

## Troubleshooting

### Common Issues:
1. **"Certificate not trusted"**: Make sure you're using the correct certificate type (Sandbox vs Production)
2. **"Invalid Bundle ID"**: Ensure your app's Bundle ID matches the certificate's Bundle ID
3. **"Private key not found"**: Make sure the private key is in your keychain (macOS) or accessible (OpenSSL)

### Verification:
After creating your certificate in Apple Developer Portal:
1. Download the certificate file (`.cer`)
2. Double-click to install it in Keychain Access
3. Export as `.p12` file for use with push notification services

## Next Steps

After generating and uploading your CSR:
1. Download the certificate from Apple Developer Portal
2. Install it in Keychain Access
3. Export as `.p12` format if needed for your backend services
4. Configure your push notification service (Firebase, OneSignal, etc.)

## Alternative: Using EAS (Recommended for Expo projects)

For Expo/EAS projects like GameTime, you can use EAS to handle certificates automatically:

```bash
# From gameTime/ directory
EAS_NO_VCS=1 eas credentials
```

This will automatically generate and manage your APNS certificates.
