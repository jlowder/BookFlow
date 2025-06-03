# Reading Journal - Docker Deployment Guide

This guide shows how to deploy the Reading Journal application using Docker with persistent database storage.

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone and build the application:**
```bash
git clone [YOUR_REPO_URL] reading-journal
cd reading-journal
docker-compose up -d
```

The application will be available at `http://localhost:3000`

### Using Docker directly

1. **Build the image:**
```bash
docker build -t reading-journal .
```

2. **Create a volume for data persistence:**
```bash
docker volume create reading-journal-data
```

3. **Run the container:**
```bash
docker run -d \
  --name reading-journal \
  -p 3000:3000 \
  -v reading-journal-data:/app/data \
  --restart unless-stopped \
  reading-journal
```

## Configuration

### Environment Variables

- `NODE_ENV`: Set to `production` (default in Docker)
- `PORT`: Application port (default: 3000)

### Custom Port

To run on a different port:

```bash
# Docker Compose
# Edit docker-compose.yml and change ports to "8080:3000"

# Docker directly
docker run -d \
  --name reading-journal \
  -p 8080:3000 \
  -v reading-journal-data:/app/data \
  reading-journal
```

## Data Persistence

The database file is stored in `/app/data/reading_journal.db` inside the container and mapped to a Docker volume. This ensures your reading data persists even when the container is removed or updated.

### Backup Database

```bash
# Copy database from volume to local machine
docker run --rm -v reading-journal-data:/data -v $(pwd):/backup alpine cp /data/reading_journal.db /backup/
```

### Restore Database

```bash
# Copy local database to volume
docker run --rm -v reading-journal-data:/data -v $(pwd):/backup alpine cp /backup/reading_journal.db /data/
```

## Management

### View logs
```bash
docker-compose logs -f reading-journal
# or
docker logs -f reading-journal
```

### Stop the application
```bash
docker-compose down
# or
docker stop reading-journal
```

### Update the application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Remove everything (including data)
```bash
docker-compose down -v
# or
docker stop reading-journal
docker rm reading-journal
docker volume rm reading-journal-data
```

## Reverse Proxy with Nginx

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

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/reading-journal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Troubleshooting

### Container won't start
```bash
docker logs reading-journal
```

### Port already in use
```bash
# Check what's using the port
sudo netstat -tlnp | grep :3000

# Use a different port
docker run -p 8080:3000 ...
```

### Database permissions
The container automatically creates the correct permissions for the database directory.

### Health check
```bash
# Check container health
docker ps
# Look for "healthy" status

# Manual health check
curl http://localhost:3000
```