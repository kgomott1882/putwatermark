# Signup email OTP (Supabase dashboard)

Apply these settings in the Supabase project dashboard before deploying the OTP signup UI.

## 1. Email OTP expiration

**Authentication → Sign In / Providers → Email → Email OTP expiration**

Set to **900** seconds (15 minutes).

This must match `SIGNUP_OTP_EXPIRY_SECONDS` in `src/lib/authOtp.ts`.

## 2. Confirm signup email template

**Authentication → Email Templates → Confirm signup**

Replace the confirmation link with the numeric code only (no magic link fallback).

Suggested subject:

```
Confirm your PutWatermark account
```

Suggested body (HTML):

```html
<h2>Confirm your email</h2>
<p>Thanks for signing up for PutWatermark.</p>
<p>Enter this 6-digit code in the app to verify your account:</p>
<p style="font-size: 28px; font-weight: 700; letter-spacing: 0.25em;">{{ .Token }}</p>
<p>This code expires in 15 minutes.</p>
<p>If you did not create a PutWatermark account, you can ignore this email.</p>
```

Do **not** include `{{ .ConfirmationURL }}` in this template.

## 3. SMTP (Resend)

Delivery uses your existing **Resend SMTP** configuration under **Authentication → SMTP Settings**. No app code changes are required.

## 4. Password reset (unchanged)

Keep the **Reset password** template and magic link flow as-is. `/auth/callback?next=/reset-password` is still used for password reset only.
