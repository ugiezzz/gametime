# 📞 Twilio Setup Guide

## 🔧 **Required for SMS OTP Functionality**

To enable SMS OTP sending, you need to configure Twilio credentials in your Firebase Functions.

### **Step 1: Get Twilio Credentials**

1. **Sign up for Twilio**: https://www.twilio.com/try-twilio
2. **Get your credentials** from the Twilio Console: https://console.twilio.com/
3. **Note down**:
   - Account SID
   - Auth Token
   - Twilio Phone Number

### **Step 2: Configure Environment Variables**

Create a `.env` file in the `functions/` directory:

```bash
cd gameTime/functions
touch .env
```

Add your Twilio credentials:

```env
# From your Twilio Console
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID=YOUR_TWILIO_VERIFY_SERVICE_SID

# Your Twilio Phone Number (for sending SMS)
TWILIO_PHONE_NUMBER=+15555555555
```

### **Step 3: Deploy Functions**

```bash
cd gameTime/functions
firebase deploy --only functions
```

### **Step 4: Test SMS**

1. Start the app: `npm start`
2. Enter a phone number
3. Check if SMS is received
4. Verify OTP code

---

## 🚨 **Important Notes:**

- **Free Twilio Trial**: Limited to verified phone numbers
- **Production**: Requires paid Twilio account
- **Phone Number Format**: Must include country code (+1234567890)
- **Environment Variables**: Never commit `.env` to git

---

## 🔍 **Troubleshooting:**

### **SMS not sending:**
1. Check Twilio credentials in `.env`
2. Verify phone number format
3. Check Firebase Function logs
4. Ensure Twilio account has credits

### **Function deployment fails:**
1. Check Firebase CLI is logged in
2. Verify project is selected
3. Check function syntax

---

## ✅ **Success Indicators:**

- ✅ SMS received on test phone
- ✅ OTP verification works
- ✅ User authentication successful
- ✅ App redirects to main screen

**Once configured, the complete OTP flow will work!** 🎉 