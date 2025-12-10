# Code Reference: Payment & Login System

## Core Methods Reference

### 1. showLoginModal()
**Purpose**: Display the login modal to existing users

```javascript
showLoginModal() {
    this.splashEntrance.style.display = "none";
    this.loginModal.style.display = "flex";
}
```

**When Called**:
- User clicks "Sign In" button on splash
- User clicks "switchToTrial" or "switchToUpgrade" links
- Initial app load detects saved accounts

**DOM Updates**:
- Hides: Splash screen
- Shows: Login modal with email input form

---

### 2. handleLogin(email)
**Purpose**: Process user login and restore their account

```javascript
handleLogin(email) {
    if (!this.validateEmail(email)) {
        alert("Please enter a valid email address.");
        return;
    }

    const userRecord = this.findUserByEmail(email);
    
    if (!userRecord) {
        alert("No account found with this email. Please sign up for a new trial or purchase.");
        return;
    }

    // Restore their account (trial or license)
    if (userRecord.type === "trial") {
        this.licenseManager.trialData = userRecord.data;
        localStorage.setItem("infinityLoopTrial", JSON.stringify(userRecord.data));
    } else if (userRecord.type === "license") {
        this.licenseManager.licenseData = userRecord.data;
        localStorage.setItem("infinityLoopLicense", JSON.stringify(userRecord.data));
    }

    // Show confirmation and restore access
    alert("Welcome back! Your account has been restored.");
    this.loginModal.style.display = "none";
    this.showApp();
    this.updateAccessUI();

    // Send event to Make webhook
    this.sendToMake("user_login", {
        email,
        accessType: userRecord.type,
    });
}
```

**User Journey**:
1. Enters email: "user@example.com"
2. System searches localStorage
3. Finds matching trial or license
4. Restores account automatically
5. Loads reading interface
6. Sends login event to Make

**localStorage Keys Checked**:
- `infinityLoopTrial`
- `infinityLoopLicense`

---

### 3. findUserByEmail(email)
**Purpose**: Search for existing user accounts by email

```javascript
findUserByEmail(email) {
    // Check current trial
    if (this.licenseManager.trialData && 
        this.licenseManager.trialData.email === email) {
        return { type: "trial", data: this.licenseManager.trialData };
    }

    // Check current license
    if (this.licenseManager.licenseData && 
        this.licenseManager.licenseData.email === email) {
        return { type: "license", data: this.licenseManager.licenseData };
    }

    // Check stored trial
    const storedTrial = localStorage.getItem("infinityLoopTrial");
    if (storedTrial) {
        try {
            const trialData = JSON.parse(storedTrial);
            if (trialData.email === email) {
                return { type: "trial", data: trialData };
            }
        } catch (e) {
            console.warn("Could not parse stored trial data");
        }
    }

    // Check stored license
    const storedLicense = localStorage.getItem("infinityLoopLicense");
    if (storedLicense) {
        try {
            const licenseData = JSON.parse(storedLicense);
            if (licenseData.email === email) {
                return { type: "license", data: licenseData };
            }
        } catch (e) {
            console.warn("Could not parse stored license data");
        }
    }

    return null;
}
```

**Return Values**:
```javascript
// If trial found:
{ type: "trial", data: { email, name, expiry, startDate } }

// If license found:
{ type: "license", data: { email, name, licenseKey, ... } }

// If nothing found:
null
```

---

### 4. showPaymentModal()
**Purpose**: Display the payment/upgrade interface

```javascript
showPaymentModal() {
    // Initialize first tier as selected
    this.selectedPaymentTier = "lifetime";
    const tiers = document.querySelectorAll(".payment-tier-option");
    tiers.forEach(el => el.classList.remove("selected"));
    if (tiers.length > 0) {
        tiers[0].classList.add("selected");
    }
    
    // Show payment content, hide success
    document.getElementById("paymentContent").style.display = "block";
    document.getElementById("paymentSuccess").style.display = "none";
    
    this.paymentModal.style.display = "flex";
}
```

**DOM Updates**:
- Shows: Payment modal backdrop
- Shows: Tier selection interface
- Shows: "Proceed to Payment" button
- Hides: Success message (initially)

**Instance Variables Set**:
- `this.selectedPaymentTier` = "lifetime"

---

### 5. processPayment()
**Purpose**: Handle payment processing and automatic license upgrade

```javascript
processPayment() {
    const email = this.licenseManager.getUserEmail();
    
    if (!email) {
        alert("Please start a trial or provide an email before purchasing.");
        return;
    }

    // Create purchase record
    const purchaseData = {
        email,
        tier: this.selectedPaymentTier || "lifetime",
        purchaseDate: new Date().toISOString(),
        amount: 29.99,
        currency: "USD",
        status: "completed",
    };

    // Generate unique license key from email
    const generatedLicenseKey = this.generateLicenseKey(email);
    
    // Create license data
    const licenseData = {
        licenseKey: generatedLicenseKey,
        email,
        name: this.licenseManager.getUserName() || "",
        activated: new Date().toISOString(),
        deviceId: this.licenseManager.deviceId,
        version: CONFIG.APP_VERSION,
        isMaster: false,
        purchaseInfo: purchaseData,
    };

    // Save to localStorage (client-side)
    localStorage.setItem("infinityLoopLicense", JSON.stringify(licenseData));
    localStorage.setItem("infinityLoopPurchase", JSON.stringify(purchaseData));
    this.licenseManager.licenseData = licenseData;
    
    // Remove trial (upgrading from trial)
    localStorage.removeItem("infinityLoopTrial");
    this.licenseManager.trialData = null;

    // Show success UI
    document.getElementById("paymentContent").style.display = "none";
    document.getElementById("paymentSuccess").style.display = "block";

    // Send payment event to Make
    this.sendToMake("payment_completed", {
        email,
        tier: purchaseData.tier,
        amount: purchaseData.amount,
        licenseKey: generatedLicenseKey,
    });
}
```

**What Happens**:
1. Validates user has email
2. Creates purchase record with timestamp
3. Generates unique license key
4. Creates license data object
5. Saves everything to localStorage
6. Removes trial status (if upgrading)
7. Shows success message
8. Sends payment to Make webhook

**localStorage After**:
```javascript
// Added/Updated:
localStorage.infinityLoopLicense = { licenseKey, email, purchaseInfo, ... }
localStorage.infinityLoopPurchase = { email, tier, amount, purchaseDate }

// Removed (if upgrading):
// localStorage.infinityLoopTrial
```

---

### 6. generateLicenseKey(email)
**Purpose**: Create unique license key from email address

```javascript
generateLicenseKey(email) {
    // Create hash from email characters
    const emailHash = email.split("").reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0).toString(16).slice(0, 4);
    
    // Get timestamp component
    const timestamp = Date.now().toString(16).slice(0, 4);
    
    // Get random component
    const random = Math.random().toString(16).slice(2, 6);
    
    // Combine into format: INF-XXXX-XXXX-XXXX
    return `INF-${timestamp}-${emailHash}-${random}`.toUpperCase();
}
```

**Example Output**:
- Input: "user@example.com"
- Output: "INF-0C35-8F2A-A7B9"

**Why This Format**:
- Unique per email + time combination
- No sequential patterns (prevents guessing)
- Deterministic for same email at same second
- Valid according to existing license validation

**Important**: For production, use server-side generation after verified payment

---

## Event Listeners

### Login Modal Listeners
```javascript
// Login form submission
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleLogin(loginEmailInput.value.trim());
    });
}

// Login button on splash screen
const loginSplashBtn = document.getElementById("loginSplashBtn");
if (loginSplashBtn) {
    loginSplashBtn.addEventListener("click", () => this.showLoginModal());
}

// Links from other modals
const switchToTrial = document.getElementById("switchToTrial");
if (switchToTrial) {
    switchToTrial.addEventListener("click", (e) => {
        e.preventDefault();
        this.loginModal.style.display = "none";
        this.showEmailModal();
    });
}
```

### Payment Modal Listeners
```javascript
// Payment tier selection
const paymentTierContainer = document.getElementById("paymentTierContainer");
if (paymentTierContainer) {
    paymentTierContainer.addEventListener("click", (e) => {
        const option = e.target.closest(".payment-tier-option");
        if (option) {
            document.querySelectorAll(".payment-tier-option")
                .forEach(el => el.classList.remove("selected"));
            option.classList.add("selected");
            this.selectedPaymentTier = option.dataset.tier;
        }
    });
}

// Proceed to payment button
const proceedPaymentBtn = document.getElementById("proceedPaymentBtn");
if (proceedPaymentBtn) {
    proceedPaymentBtn.addEventListener("click", () => {
        this.processPayment();
    });
}

// Continue after successful payment
const continueAfterPayment = document.getElementById("continueAfterPayment");
if (continueAfterPayment) {
    continueAfterPayment.addEventListener("click", () => {
        this.paymentModal.style.display = "none";
        this.showApp();
    });
}
```

---

## HTML Structure

### Login Modal
```html
<div id="loginModal" class="modal-backdrop">
    <div class="modal">
        <button class="modal-close" id="closeLoginModal">✕</button>
        <h2>Welcome back</h2>
        <p>Sign in with your email to restore your trial or full access.</p>
        <form id="loginForm">
            <div class="input-group">
                <label for="loginEmail">Email</label>
                <input type="email" id="loginEmail" placeholder="you@example.com" required />
            </div>
            <button type="submit" class="btn-primary" style="width: 100%; margin-bottom: 12px;">
                <span>Sign In</span>
            </button>
        </form>
        <p class="small-text">
            New here? <a href="#" id="switchToTrial">Start a free trial</a> 
            or <a href="#" id="switchToUpgrade">upgrade now</a>.
        </p>
    </div>
</div>
```

### Payment Modal
```html
<div id="paymentModal" class="modal-backdrop">
    <div class="modal">
        <button class="modal-close" id="closePaymentModal">✕</button>
        
        <!-- Payment Selection View -->
        <div id="paymentContent">
            <h2>Unlock full access</h2>
            <p>Choose your plan to access all 11 chapters, appendices, and premium content.</p>
            
            <div id="paymentTierContainer">
                <div class="payment-tier-option" data-tier="lifetime">
                    <div class="payment-tier-header">
                        <span class="payment-tier-name">Full Lifetime Access</span>
                        <span class="payment-tier-price">$29.99</span>
                    </div>
                    <div class="payment-tier-description">
                        One-time purchase • All chapters • All updates • One device
                    </div>
                </div>
            </div>

            <button class="btn-primary" id="proceedPaymentBtn" style="width: 100%; margin-bottom: 12px;">
                <span>Proceed to Payment</span>
            </button>
        </div>
        
        <!-- Success View (hidden initially) -->
        <div id="paymentSuccess" style="display: none;">
            <div class="payment-success">
                <div class="payment-success-icon">✓</div>
                <div class="payment-success-title">Payment Successful!</div>
                <div class="payment-success-message">
                    Your account has been upgraded to full access. 
                    You can now read all chapters and appendices.
                </div>
            </div>
            <button id="continueAfterPayment" class="btn-primary" style="width: 100%;">
                <span>Continue Reading</span>
            </button>
        </div>
    </div>
</div>
```

---

## Data Structures

### Make Webhook Events

#### user_login Event
```json
{
  "eventType": "user_login",
  "appVersion": "2.0.0",
  "timestamp": "2025-12-09T12:34:56.789Z",
  "deviceId": "unique-device-id",
  "email": "user@example.com",
  "accessType": "trial" // or "license"
}
```

#### payment_completed Event
```json
{
  "eventType": "payment_completed",
  "appVersion": "2.0.0",
  "timestamp": "2025-12-09T12:34:56.789Z",
  "deviceId": "unique-device-id",
  "email": "user@example.com",
  "tier": "lifetime",
  "amount": 29.99,
  "licenseKey": "INF-0C35-8F2A-A7B9"
}
```

#### trial_signup Event
```json
{
  "eventType": "trial_signup",
  "appVersion": "2.0.0",
  "timestamp": "2025-12-09T12:34:56.789Z",
  "deviceId": "unique-device-id",
  "email": "user@example.com",
  "name": "User Name",
  "accessType": "trial",
  "agreedToTerms": true,
  "trial": {
    "email": "user@example.com",
    "name": "User Name",
    "expiry": "2025-12-16T12:34:56.789Z",
    "startDate": "2025-12-09T12:34:56.789Z"
  }
}
```

---

## CSS Reference

### Payment Tier Styling
```css
.payment-tier-option {
    padding: 14px;
    border-radius: 14px;
    border: 2px solid rgba(148, 163, 184, 0.4);
    margin-bottom: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: rgba(15, 23, 42, 0.5);
}

.payment-tier-option:hover {
    border-color: var(--accent);
    background: rgba(230, 57, 70, 0.1);
}

.payment-tier-option.selected {
    border-color: var(--accent);
    background: rgba(230, 57, 70, 0.15);
}

.payment-tier-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
}

.payment-tier-price {
    color: var(--accent);
    font-weight: 700;
    font-size: 1.1rem;
}
```

### Success Message Styling
```css
.payment-success {
    text-align: center;
    padding: 20px 0;
}

.payment-success-icon {
    font-size: 3.5rem;
    margin-bottom: 12px;
}

.payment-success-title {
    font-size: 1.3rem;
    color: #22c55e;
    margin-bottom: 8px;
}

.payment-success-message {
    color: var(--text-muted);
    font-size: 0.9rem;
}
```

---

## Configuration

### In CONFIG Object
```javascript
const CONFIG = {
    APP_VERSION: "2.0.0",
    TRIAL_CHAPTERS: 2,
    TRIAL_DAYS: 7,
    TEST_LICENSE: "INF-TEST-2024-ABCD-5678",
    MASTER_LICENSE: "INF-MASTER-2025-ROOT-0001",
    VALID_LICENSE_PREFIX: "INF-",
    STRIPE_CHECKOUT_URL: "https://buy.stripe.com/...",
    PAYPAL_CHECKOUT_URL: "https://www.paypal.com/...",
    MAKE_WEBHOOK_URL: "https://hook.us2.make.com/...",
};
```

### Payment Amount (Update in processPayment())
```javascript
// Current
amount: 29.99,

// Change to
amount: 49.99, // or your desired amount
```

---

## Testing Code Snippets

### Test: Manually Create Trial
```javascript
// Run in browser console
const trialData = {
    email: "test@example.com",
    name: "Test User",
    expiry: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
    startDate: new Date().toISOString()
};
localStorage.setItem("infinityLoopTrial", JSON.stringify(trialData));
location.reload();
```

### Test: Manually Create License
```javascript
// Run in browser console
const licenseData = {
    licenseKey: "INF-TEST-ABCD-1234",
    email: "test@example.com",
    name: "Test User",
    activated: new Date().toISOString(),
    deviceId: "test-device-123",
    version: "2.0.0",
    isMaster: false
};
localStorage.setItem("infinityLoopLicense", JSON.stringify(licenseData));
location.reload();
```

### Test: Check Make Webhooks
```javascript
// Check if webhooks are being sent (look in browser Network tab)
// Filter for: hook.us2.make.com
// Should see POST requests with payment/login/signup events
```

---

## Common Modifications

### Add Monthly Tier
```html
<!-- In paymentTierContainer -->
<div class="payment-tier-option" data-tier="monthly">
    <div class="payment-tier-header">
        <span class="payment-tier-name">Monthly Access</span>
        <span class="payment-tier-price">$4.99/month</span>
    </div>
    <div class="payment-tier-description">
        Cancel anytime • All chapters • Monthly billing
    </div>
</div>
```

### Change Trial Duration
```javascript
// In CONFIG
TRIAL_DAYS: 14, // Changed from 7
```

### Disable Automatic License Generation
```javascript
// In processPayment(), comment out this section:
/*
const generatedLicenseKey = this.generateLicenseKey(email);
const licenseData = { ... };
localStorage.setItem("infinityLoopLicense", ...);
*/
// Then send key request to server instead
```

---

## Debugging Tips

### Check localStorage
```javascript
console.log("Trial:", JSON.parse(localStorage.getItem("infinityLoopTrial")));
console.log("License:", JSON.parse(localStorage.getItem("infinityLoopLicense")));
console.log("Purchase:", JSON.parse(localStorage.getItem("infinityLoopPurchase")));
```

### Check Make Webhook
1. Open Make automation logs
2. Look for recent executions
3. Check input data structure
4. Verify email and tier are correct

### Monitor Events
```javascript
// Add to sendToMake method
console.log("Sending to Make:", payload);
```

### Test Login Flow
```javascript
// 1. Create trial
// 2. Reload page
// 3. Click "Sign In"
// 4. Enter same email
// 5. Should restore account
```

---

## Version History
- **v2.0.0** - Initial payment & login system (2025-12-09)
  - Added login modal
  - Added payment modal with auto-upgrade
  - Added account recovery
  - Integrated Make webhooks
