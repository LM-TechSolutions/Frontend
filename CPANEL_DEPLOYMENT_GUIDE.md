# TEKUUMA Frontend - cPanel Deployment Guide

This guide explains how to deploy the **TEKUUMA React/Vite Frontend (Call Center & Admin Dashboard)** directly to **cPanel** using the automated GitHub Actions FTP workflow.

---

## 🏗️ Architecture Overview

The frontend is a client-side Single Page Application (SPA) built with React and Vite. When built, it compiles into optimized static files (`HTML`, `JS`, `CSS`, assets).

- **Backend API**: `https://backend-api.tokuma.et`
- **Real-Time WebSockets**: `wss://backend-api.tokuma.et`
- **Web Server**: LiteSpeed / Apache with SPA rewriting (`.htaccess`)

---

## Step 1: Create Domain / Subdomain on cPanel

1. Log into your **cPanel**.
2. Go to **Domains** (or **Subdomains**).
3. Click **Create A New Domain**:
   - **Domain**: e.g., `app.tokuma.et` (or `admin.tokuma.et`, or your root domain `tokuma.et`)
   - **Document Root**: Specify the folder where files will live (e.g., `public_html/app` or `public_html` or `/home/tokumaet/app.tokuma.et`).
   - Click **Submit**.
4. Ensure SSL is active on the domain via **cPanel -> SSL/TLS Status** (Run AutoSSL if needed).

---

## Step 2: Create FTP Account in cPanel

1. Go to **cPanel -> FTP Accounts**.
2. Create an FTP user:
   - **Log in**: e.g., `frontend_deployer` (Full username will be `frontend_deployer@tokuma.et`)
   - **Password**: Generate a strong password (save this for GitHub secrets).
   - **Directory**: Set this to the exact **Document Root** of your frontend domain (e.g., `public_html/app` or `app.tokuma.et`).
3. Click **Create FTP Account**.

> [!TIP]
> If your FTP account directory is set directly to the folder where files should live, the `FTP_SERVER_DIR` secret can be left as `./`.

---

## Step 3: Configure GitHub Repository Secrets

In your GitHub repository for the Frontend:
1. Navigate to **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository secret** and add the following:

| Secret Name | Description | Example Value |
|---|---|---|
| `FTP_SERVER` | Your server hostname or IP address | `tokuma.et` or `warners.server.com` |
| `FTP_USERNAME` | Full FTP username created in Step 2 | `frontend_deployer@tokuma.et` |
| `FTP_PASSWORD` | Password for the FTP account | `YourStrongPassword!123` |
| `FTP_SERVER_DIR` | Target folder on server *(optional)* | `./` (or `public_html/app/`) |
| `VITE_GEBETA_API_KEY` | Gebeta Maps API Key | `eyJhbGciOiJIUzI1Ni...` |
| `VITE_API_BASE_URL` | *(Optional - defaults to backend-api.tokuma.et)* | `https://backend-api.tokuma.et` |
| `VITE_SOCKET_URL` | *(Optional - defaults to backend-api.tokuma.et)* | `https://backend-api.tokuma.et` |

---

## Step 4: SPA Routing & Apache `.htaccess`

In client-side React apps (SPA), paths like `/login`, `/rides`, `/drivers` are handled in the browser by React Router. Without rewriting, refreshing a page returns a LiteSpeed/Apache `404 Not Found`.

This repository includes a pre-configured [`.htaccess`](file:///./public/.htaccess) that is automatically bundled into every build:
- **Routes all requests to `index.html`** while serving real files (`.js`, `.css`, images) directly.
- **Aggressive Caching for Assets**: Hashed JS and CSS files are cached for 1 year (`max-age=31536000`).
- **No-Cache on `index.html`**: Guarantees users always receive the newest code release immediately after deployment.
- **Forces HTTPS**: Automatically redirects all insecure `http://` traffic to `https://`.

---

## Step 5: Trigger Deployment

Push your code to the `main` branch:

```bash
git add .
git commit -m "Configure cPanel automated FTP deployment for Frontend"
git push origin main
```

1. Go to the **Actions** tab on your GitHub repository.
2. Watch the **Deploy Frontend to cPanel** workflow run:
   - Sets up pnpm v9 and Node.js 20.
   - Injects the API and Gebeta keys.
   - Compiles the production bundle via `pnpm run build`.
   - Uploads the bundle and `.htaccess` to cPanel via FTP.
3. Open your domain (e.g. `https://app.tokuma.et`) in your browser to verify!

---

## 🛠️ Troubleshooting

### 1. 404 Error when refreshing pages
- Verify that `.htaccess` is present in your frontend folder on cPanel.
- In cPanel File Manager, make sure **Show Hidden Files (dotfiles)** is enabled in Settings (top right).
- Check that `.htaccess` contains `RewriteRule ^ index.html [L]`.

### 2. CORS Error when calling the backend
- Ensure your frontend domain (e.g. `https://app.tokuma.et`) is listed in the backend `.env`:
  ```env
  BETTER_AUTH_TRUSTED_ORIGINS="http://localhost:3000,http://localhost:3002,https://app.tokuma.et"
  SOCKET_IO_CORS_ORIGIN="http://localhost:3000,http://localhost:3002,https://app.tokuma.et"
  ```
- Restart the backend in cPanel (**Setup Node.js App** -> **Restart Application**).

### 3. Blank page after deployment
- Open Browser Developer Tools (`F12`) -> **Console**.
- If scripts fail to load, ensure your `base` path in `vite.config.ts` is `/` (default).
