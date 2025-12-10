# Quick Start Guide: Payment & Login System

## For Users

### Sign Up for Free Trial
1. Click "Enter Interactive Reader"
2. Click "Start 7-Day Free Trial"
3. Enter your name and email
4. Agree to Terms of Service
5. Get immediate access to Chapters 1-2 and front matter

### Upgrade to Full Version
**Option A: From Trial**
1. Click "Upgrade Now" button
2. Review pricing ($29.99 lifetime access)
3. Click "Proceed to Payment"
4. Payment processes instantly
5. You're automatically upgraded - no license key needed!

**Option B: Direct Purchase**
1. Click "Upgrade" in header
2. Enter your email
3. Click "Proceed to Payment"
4. Complete purchase
5. Full access unlocked

### Sign Back In Later
1. Click "Enter Interactive Reader"
2. Click "Sign In" button (appears if you've used this device before)
3. Enter your email
4. Your account and all purchased access is restored
5. Pick up where you left off

---

## For Site Owner

### What Data is Collected
- **User email** - Required for all accounts
- **User name** - Optional, for personalization
- **Trial dates** - Start and expiry
- **License keys** - Unique identifier for purchases
- **Device ID** - Tracks license to specific device
- **Purchase info** - Date, amount, status

### What Gets Sent to Make Automation
Events are automatically sent:
- ✅ When user signs up for trial
- ✅ When user logs in
- ✅ When user purchases
- ✅ License activation with unique key

### How to Customize Pricing
1. Open `index.html`
2. Find: `<span class="payment-tier-price">$29.99</span>`
3. Change price to desired amount
4. Find `processPayment()` method
5. Update `amount: 29.99` to match

### How to Customize Trial Duration
1. Find CONFIG section
2. Change: `TRIAL_DAYS: 7` to desired days
3. System automatically calculates expiry

### How to Customize Trial Chapter Limit
1. Find CONFIG section
2. Change: `TRIAL_CHAPTERS: 2` to desired chapter number
3. Trial users can only access chapters up to this number

---

## Testing the System

### Test Trial Signup
```
1. Open app in new/private browser window
2. Click "Enter Interactive Reader"
3. Choose "Start Trial"
4. Fill in: name="John Test", email="test@example.com"
5. Check: Can access Chapters 1-2
6. Check: Cannot access Chapter 3+
7. Check: localStorage has "infinityLoopTrial" key
```

### Test Upgrade
```
1. After starting trial (above)
2. Click "Upgrade Now"
3. Click "Proceed to Payment"
4. Check: Payment success message appears
5. Check: "Continue Reading" button available
6. Check: Can now access all 11 chapters
7. Check: localStorage has "infinityLoopLicense" key
8. Check: No "infinityLoopTrial" key (removed)
```

### Test Login
```
1. Open same browser
2. Clear app session (close app, reopen)
3. Click "Enter Interactive Reader"
4. Click "Sign In" button (should appear)
5. Enter email: "test@example.com"
6. Check: Account restored
7. Check: Full access still available
8. Check: Make webhook received login event
```

### Test Make Webhook Events
1. Go to your Make automation
2. Check logs during each action:
   - After trial signup → `trial_signup` event
   - After login → `user_login` event
   - After payment → `payment_completed` event
3. Verify email and access type are correct

---

## Browser Storage (localStorage)

### What's Stored
Data is stored **locally on user's device only**:
- Trial account info: expires after 7 days (configurable)
- License info: permanent (until manually cleared)
- User preferences: reading position, etc.

### Privacy Note
- No data on external servers (until Make webhook integration)
- Users can clear data any time
- One license per device (enforced by deviceId)

### Clearing Data (Emergency)
```javascript
// Open browser console and run:
localStorage.removeItem("infinityLoopTrial");
localStorage.removeItem("infinityLoopLicense");
localStorage.removeItem("infinityLoopPurchase");
localStorage.removeItem("infinityLoopUser");
```

---

## Integration with Real Payment Processor

### Current State
- ✅ Automatic license generation after purchase
- ✅ User account management
- ✅ Trial duration tracking
- ⏳ **Simulated payment** (needs integration)

### Next Steps for Real Payments

#### Option 1: Stripe Integration
```javascript
// Replace processPayment() with:
const stripe = Stripe('pk_live_YOUR_KEY');
const result = await stripe.redirectToCheckout({
  sessionId: sessionIdFromServer // Get from your backend
});
```

#### Option 2: PayPal Integration
```javascript
// Update paymentModal to launch PayPal:
const response = await fetch('/create-payment', {
  method: 'POST',
  body: JSON.stringify({ email, amount: 29.99 })
});
window.location.href = response.paypalApprovalUrl;
```

#### Server-Side Validation (CRITICAL)
After integrating real payment:
1. Verify payment status on server
2. Only generate license key after verified payment
3. Never generate licenses client-side for real money
4. Validate webhook signatures from payment processor

---

## Troubleshooting

### "No account found" when logging in
- ✓ Check spelling of email
- ✓ Make sure you signed up on THIS device
- ✓ Try a new trial signup with that email instead

### Sign In button not showing
- ✓ You need to have signed up previously on this device
- ✓ Check localStorage has trial/license data
- ✓ Clear browser cache and reload

### Payment not going through
- ✓ This is simulated - payment completes instantly
- ✓ Check that your email is valid
- ✓ Look for error messages in browser console

### Can't access all chapters after upgrade
- ✓ Refresh page (Ctrl+F5)
- ✓ Check localStorage has "infinityLoopLicense"
- ✓ Make sure trial wasn't active instead

### Make webhook not receiving events
- ✓ Check webhook URL in CONFIG
- ✓ Verify webhook is active in Make
- ✓ Check browser console for errors
- ✓ Verify network tab shows POST requests

---

## Security Notes

### Before Going to Production

⚠️ **IMPORTANT SECURITY REQUIREMENTS**

1. **Backend Validation**
   - Never trust client-side license generation for real purchases
   - Verify all payments on secure backend
   - Only generate/activate licenses after verified payment

2. **HTTPS Only**
   - All user data must be transmitted over HTTPS
   - Enable secure localStorage access

3. **Payment Processor**
   - Integrate with Stripe, PayPal, or similar
   - Maintain PCI compliance
   - Never store raw credit card data

4. **User Data**
   - Comply with GDPR/CCPA regulations
   - Provide account deletion option
   - Secure email transmission

5. **License Validation**
   - Implement server-side license checks
   - Prevent offline bypass
   - Log license validations

---

## Support Contact

For issues or questions:
- Check PAYMENT_LOGIN_IMPLEMENTATION.md for detailed docs
- Review Make webhook logs for integration issues
- Check browser console (F12) for JavaScript errors
