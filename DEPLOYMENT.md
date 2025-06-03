# Reading Journal - Server Deployment Guide

This guide covers multiple deployment options for the Reading Journal application on your own server.

## Prerequisites

- Ubuntu/Debian server with root access
- Git installed

## Deployment Options

Choose one of the following deployment methods:

### Option 1: Docker Deployment (Recommended)

This is the easiest and most reliable deployment method.

#### Prerequisites for Docker
- Docker and Docker Compose installed

#### Install Docker (if not already installed)
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Deploy with Docker
```bash
# Create the directory structure
sudo mkdir -p /opt/BookFlow
cd /opt/BookFlow

# Clone the repository
sudo git clone [YOUR_REPO_URL] .

# Set proper permissions for database storage
sudo chown -R 1001:1001 /opt/BookFlow
sudo chmod 755 /opt/BookFlow

# Ensure the container can write to the database file
sudo touch /opt/BookFlow/reading_journal.db
sudo chown 1001:1001 /opt/BookFlow/reading_journal.db
sudo chmod 666 /opt/BookFlow/reading_journal.db

# Deploy the application
docker-compose up -d
```

The application will be available at `http://localhost:3000`

The database will be stored at `/opt/BookFlow/reading_journal.db` on your host system.

#### Docker Management Commands
```bash
# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Update the application
cd /opt/BookFlow
git pull
docker-compose down
docker-compose up -d --build

# Backup database
cp /opt/BookFlow/reading_journal.db /opt/BookFlow/reading_journal_backup_$(date +%Y%m%d).db
```

### Option 2: Systemd Service Deployment

#### Prerequisites for Systemd
- Node.js 18+ installed
- npm installed

## Installation Steps for Systemd

#### 1. Install Node.js (if not already installed)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 2. Create application directory

```bash
sudo mkdir -p /opt/BookFlow
sudo chown www-data:www-data /opt/BookFlow
```

#### 3. Clone and setup the application

```bash
cd /opt/BookFlow
sudo -u www-data git clone [YOUR_REPO_URL] .
sudo -u www-data npm install
sudo -u www-data npm run build
```

#### 4. Install the systemd service

Update the systemd service file to use the correct path:

```bash
# Edit the service file to use /opt/BookFlow
sudo sed -i 's|/var/www/reading-journal|/opt/BookFlow|g' reading-journal.service
sudo cp reading-journal.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable reading-journal
```

#### 5. Start the service

```bash
sudo systemctl start reading-journal
sudo systemctl status reading-journal
```

## Nginx Reverse Proxy Setup (For Both Deployment Methods)

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

## Service Management (Systemd Only)

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

### Docker Updates
```bash
cd /opt/BookFlow
git pull
docker-compose down
docker-compose up -d --build
```

### Systemd Updates
```bash
cd /opt/BookFlow
sudo systemctl stop reading-journal
sudo -u www-data git pull
sudo -u www-data npm install
sudo -u www-data npm run build
sudo systemctl start reading-journal
```

## Configuration

### Docker Configuration
Edit `docker-compose.yml` to change ports or environment variables:

```yaml
ports:
  - "8080:3000"  # Change external port
environment:
  - PORT=3000    # Internal port stays the same
```

### Systemd Configuration
To change the port for systemd deployment:

```bash
sudo systemctl edit reading-journal
```

Add:
```ini
[Service]
Environment=PORT=8080
```

## Database

### Database Location
- **Docker**: `/opt/BookFlow/reading_journal.db` (mapped from container's `/app/data/`)
- **Systemd**: `/opt/BookFlow/reading_journal.db`

### Database Backup
```bash
# Create timestamped backup
cp /opt/BookFlow/reading_journal.db /opt/BookFlow/reading_journal_backup_$(date +%Y%m%d_%H%M%S).db

# Automated daily backup (add to crontab)
0 2 * * * cp /opt/BookFlow/reading_journal.db /opt/BookFlow/backups/reading_journal_$(date +\%Y\%m\%d).db
```

## Troubleshooting

### Docker Troubleshooting
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs -f

# Restart containers
docker-compose restart

# Check disk space
df -h
```

### Systemd Troubleshooting
- Check logs: `sudo journalctl -u reading-journal -f`
- Verify Node.js installation: `node --version`
- Check file permissions: `ls -la /opt/BookFlow`

### Common Issues
- **Port already in use**: `sudo netstat -tlnp | grep :3000`
- **Database permissions**: `sudo chown -R www-data:www-data /opt/BookFlow` (systemd only)
- **Docker permissions**: `sudo chown -R 1001:1001 /opt/BookFlow` (Docker only)

### SSL/HTTPS Setup
For production deployment with SSL, use Let's Encrypt with Nginx:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```