# Reading Journal - Server Deployment Guide

This guide will help you deploy the Reading Journal application on your own server using systemd.

## Prerequisites

- Ubuntu/Debian server with root access
- Node.js 18+ installed
- npm installed
- Git installed

## Installation Steps

### 1. Install Node.js (if not already installed)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Create application directory

```bash
sudo mkdir -p /var/www/reading-journal
sudo chown www-data:www-data /var/www/reading-journal
```

### 3. Clone and setup the application

```bash
cd /var/www/reading-journal
sudo -u www-data git clone [YOUR_REPO_URL] .
sudo -u www-data npm install
sudo -u www-data npm run build
```

### 4. Install the systemd service

```bash
sudo cp reading-journal.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable reading-journal
```

### 5. Start the service

```bash
sudo systemctl start reading-journal
sudo systemctl status reading-journal
```

### 6. Setup Nginx reverse proxy (optional but recommended)

Create `/etc/nginx/sites-available/reading-journal`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/reading-journal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Service Management

### Check service status
```bash
sudo systemctl status reading-journal
```

### View logs
```bash
sudo journalctl -u reading-journal -f
```

### Restart service
```bash
sudo systemctl restart reading-journal
```

### Stop service
```bash
sudo systemctl stop reading-journal
```

## Updates

To update the application:

```bash
cd /var/www/reading-journal
sudo systemctl stop reading-journal
sudo -u www-data git pull
sudo -u www-data npm install
sudo -u www-data npm run build
sudo systemctl start reading-journal
```

## Configuration

The application runs on port 3000 by default. To change this, edit the systemd service file:

```bash
sudo systemctl edit reading-journal
```

Add:
```ini
[Service]
Environment=PORT=8080
```

## Database

The application uses SQLite and will automatically create the database file in the application directory. Make sure the www-data user has write permissions to the directory.

## Troubleshooting

### Service won't start
- Check logs: `sudo journalctl -u reading-journal -f`
- Verify Node.js installation: `node --version`
- Check file permissions: `ls -la /var/www/reading-journal`

### Port already in use
- Check what's using the port: `sudo netstat -tlnp | grep :3000`
- Change the port in the systemd service file

### Database permissions
- Ensure www-data can write to the directory: `sudo chown -R www-data:www-data /var/www/reading-journal`