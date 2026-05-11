# Secret Management for Save to Drive Extension

Following Google's best practices for security, here is how sensitive information is managed in this project.

## Zero-Code Storage

The "Save to Drive" extension uses the **Chrome Identity API** (`chrome.identity`) for authentication. This is the most secure method for Chrome Extensions because:

- **No Client Secrets**: Unlike server-side apps, this extension does not use a `client_secret`. Client secrets should NEVER be included in a Chrome Extension.
- **Public Client IDs**: The `client_id` in `manifest.json` is considered public information as it is distributed with the extension.
- **Dynamic Token Exchange**: Access tokens are requested at runtime through the user's browser, ensuring they are never stored in the source code or version control.

## Best Practices for Development

If you wish to further secure your `client_id` or other configuration strings:

1. **GitHub Secrets**: Use GitHub Actions Secrets to inject the `client_id` into the `manifest.json` during your build process.
2. **Environment Variables**: Create a `.env` file (and add it to `.gitignore`) to store your development `client_id`. Use a build script (like Vite or Webpack) to replace the placeholder in `manifest.json`.

## API Restrictions

Ensure your API keys (if added in the future) are restricted in the [Google Cloud Console](https://console.cloud.google.com/):

- **IP Restrictions**: Limit keys to specific IP addresses (less relevant for extensions).
- **HTTP Referrer Restrictions**: Limit keys to `chrome-extension://[YOUR_EXTENSION_ID]/*`.
- **API Restrictions**: Limit keys to only the **Google Drive API**.
