# OAuth Provider Setup Guide

## Overview

EquiSplit supports authentication through multiple OAuth providers:
- **Google** - Google accounts
- **Apple** - Apple ID  
- **Microsoft** - Microsoft/Azure AD accounts
- **Email** - Magic link authentication

## Google OAuth Setup

### 1. Create Google Cloud Project

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"

### 2. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in application information:
   - **App name**: EquiSplit
   - **User support email**: Your support email
   - **Developer contact**: Your contact email
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
5. Add test users if needed

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Configure settings:
   - **Name**: EquiSplit Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://yourdomain.com/api/auth/callback/google`

### 4. Environment Variables

```bash
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 5. Enable Required APIs

1. Go to "APIs & Services" > "Library"
2. Enable "Google+ API" (if available) or ensure "People API" is enabled

## Apple OAuth Setup

### 1. Apple Developer Account

1. Visit [Apple Developer Console](https://developer.apple.com/)
2. Sign in with your Apple Developer account
3. Navigate to "Certificates, Identifiers & Profiles"

### 2. Create App ID

1. Go to "Identifiers" > "App IDs"
2. Click "+" to create new App ID
3. Configure:
   - **Description**: EquiSplit App
   - **Bundle ID**: `com.yourcompany.equisplit`
   - **Capabilities**: Enable "Sign In with Apple"

### 3. Create Services ID

1. Go to "Identifiers" > "Services IDs"
2. Click "+" to create new Services ID
3. Configure:
   - **Description**: EquiSplit Web Service
   - **Identifier**: `com.yourcompany.equisplit.web`
   - **Primary App ID**: Select the App ID created above

### 4. Configure Sign In with Apple

1. Edit the Services ID you just created
2. Check "Sign In with Apple"
3. Click "Configure"
4. Set domains and return URLs:
   - **Domains**: `localhost`, `yourdomain.com`
   - **Return URLs**: 
     - `http://localhost:3000/api/auth/callback/apple`
     - `https://yourdomain.com/api/auth/callback/apple`

### 5. Create Private Key

1. Go to "Keys"
2. Click "+" to create new key
3. Configure:
   - **Key Name**: EquiSplit Sign In Key
   - **Services**: Check "Sign In with Apple"
4. Download the private key file (`.p8`)
5. Note the Key ID

### 6. Environment Variables

```bash
APPLE_ID="com.yourcompany.equisplit.web"
APPLE_SECRET="-----BEGIN PRIVATE KEY-----
your-private-key-content-here
-----END PRIVATE KEY-----"
APPLE_TEAM_ID="your-team-id"
APPLE_KEY_ID="your-key-id"
```

## Microsoft OAuth Setup

### 1. Azure Portal Setup

1. Visit [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory"
3. Go to "App registrations"

### 2. Register Application

1. Click "New registration"
2. Configure:
   - **Name**: EquiSplit
   - **Supported account types**: "Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI**: 
     - Platform: Web
     - URI: `http://localhost:3000/api/auth/callback/microsoft-entra-id`

### 3. Configure Authentication

1. Go to "Authentication" in your app registration
2. Add platform "Web" if not already added
3. Add redirect URIs:
   - `http://localhost:3000/api/auth/callback/microsoft-entra-id`
   - `https://yourdomain.com/api/auth/callback/microsoft-entra-id`
4. Enable "ID tokens" in the implicit grant section

### 4. Create Client Secret

1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Configure:
   - **Description**: EquiSplit Web Secret
   - **Expires**: Choose appropriate expiration
4. Copy the secret value immediately

### 5. API Permissions

1. Go to "API permissions"
2. Ensure these permissions are granted:
   - `openid`
   - `email`
   - `profile`
   - `User.Read`

### 6. Environment Variables

```bash
MICROSOFT_CLIENT_ID="your-application-client-id"
MICROSOFT_CLIENT_SECRET="your-client-secret"
MICROSOFT_TENANT_ID="common" # or your specific tenant ID
```

## Email Authentication Setup

### 1. SMTP Configuration

Choose an email service provider:
- **Gmail**: Use App Passwords with 2FA enabled
- **SendGrid**: Professional email service
- **AWS SES**: Amazon Simple Email Service
- **Mailgun**: Developer-friendly email API

### 2. Gmail Setup (Development)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security > App passwords
   - Generate password for "Mail"

### 3. Environment Variables

```bash
# Gmail SMTP
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@yourdomain.com"

# SendGrid SMTP
EMAIL_SERVER_HOST="smtp.sendgrid.net"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="apikey"
EMAIL_SERVER_PASSWORD="your-sendgrid-api-key"
EMAIL_FROM="noreply@yourdomain.com"
```

## Testing OAuth Configuration

### Development Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the sign-in page:
   ```
   http://localhost:3000/auth/signin
   ```

3. Test each provider:
   - Click on provider buttons
   - Complete OAuth flow
   - Verify successful authentication
   - Check user data in database

### Debug OAuth Issues

#### Google OAuth Debugging

```bash
# Check provider configuration
curl http://localhost:3000/api/auth/providers

# Verify redirect URI in error messages
# Common issues:
# - Redirect URI mismatch
# - Missing scopes
# - Consent screen not configured
```

#### Apple OAuth Debugging

```bash
# Common issues:
# - Invalid private key format
# - Wrong Services ID
# - Incorrect return URLs
# - Missing team ID or key ID
```

#### Microsoft OAuth Debugging

```bash
# Common issues:
# - Wrong tenant ID
# - Missing API permissions
# - Client secret expired
# - Redirect URI not registered
```

### Production Considerations

#### Security Best Practices

1. **Use HTTPS**: All OAuth flows must use HTTPS in production
2. **Validate Redirect URIs**: Ensure only your domains are authorized
3. **Rotate Secrets**: Regularly rotate client secrets and private keys
4. **Monitor Usage**: Track OAuth authentication attempts and failures
5. **Secure Storage**: Never expose secrets in client-side code

#### Error Handling

```typescript
// Handle OAuth errors gracefully
export default function SignInPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const getErrorMessage = (error: string) => {
    switch (error) {
      case "OAuthSignin":
        return "Error in signing in with OAuth provider"
      case "OAuthCallback":
        return "Error in OAuth callback"
      case "OAuthCreateAccount":
        return "Error creating OAuth account"
      case "EmailCreateAccount":
        return "Error creating email account"
      case "Callback":
        return "Error in callback"
      case "OAuthAccountNotLinked":
        return "OAuth account not linked to existing account"
      case "EmailSignin":
        return "Error sending email"
      case "CredentialsSignin":
        return "Invalid credentials"
      case "SessionRequired":
        return "Please sign in to access this page"
      default:
        return "An unexpected error occurred"
    }
  }

  return (
    <div>
      {searchParams.error && (
        <div className="error">
          {getErrorMessage(searchParams.error)}
        </div>
      )}
      {/* Sign-in form */}
    </div>
  )
}
```

## Provider-Specific Features

### Google OAuth Features

- **Automatic email verification**: Google accounts are pre-verified
- **Profile information**: Name, email, profile picture
- **Workspace integration**: Supports Google Workspace accounts
- **Scope customization**: Request additional permissions if needed

### Apple OAuth Features

- **Privacy-focused**: Users can hide their email address
- **Native integration**: Seamless on Apple devices
- **Two-factor ready**: Integrates with Apple's 2FA
- **Email relay**: Apple can provide relay email addresses

### Microsoft OAuth Features

- **Enterprise integration**: Works with Azure AD organizations
- **Multi-tenant support**: Supports personal and business accounts
- **Advanced security**: Conditional access policies supported
- **Graph API access**: Can request additional Microsoft Graph permissions

### Email Authentication Features

- **Passwordless**: No password required
- **Magic links**: One-click authentication
- **Secure**: Time-limited verification tokens
- **Universal**: Works with any email address

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**
   - Verify exact URL matches in provider console
   - Check for trailing slashes
   - Ensure protocol (http/https) matches

2. **Invalid Client Configuration**
   - Verify environment variables are set correctly
   - Check for extra spaces or newlines in secrets
   - Ensure secrets haven't expired

3. **Scope Permissions**
   - Verify required scopes are configured
   - Check user consent for requested permissions
   - Ensure API permissions are granted (Microsoft)

4. **Email Delivery Issues**
   - Verify SMTP credentials
   - Check spam/junk folders
   - Test email server connectivity
   - Ensure FROM address is authorized

### Support Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)

*Last updated: December 15, 2024*