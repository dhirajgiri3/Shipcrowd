# Storage Providers (Disk / DigitalOcean Spaces)

Shipcrowd uses a storage abstraction so PODs, invoices, and other documents can be stored on local disk during development or in DigitalOcean Spaces in production.

## 1) Local Disk (default)

No extra configuration is required. Files are written to the `uploads/` directory and served from `/uploads`.

## 2) DigitalOcean Spaces

Set the storage driver and Spaces credentials in your environment:

```
STORAGE_DRIVER=spaces
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
SPACES_REGION=nyc3
SPACES_BUCKET=your-space-name
SPACES_ACCESS_KEY=your-access-key
SPACES_SECRET_KEY=your-secret-key

# Optional
SPACES_PUBLIC=true                    # If bucket is public
SPACES_CDN_URL=https://your-cdn-url   # Public base URL for files (recommended)
SPACES_PUBLIC_URL=https://your-space-url
SPACES_SIGNED_URL_TTL=900             # Signed URL expiry in seconds (default 900)
```

### Notes
- If `SPACES_CDN_URL` (or `SPACES_PUBLIC_URL`) is set, file URLs are returned as public links.
- If no public URL is set, Shipcrowd generates signed URLs for downloads.
- The storage layer is used by POD uploads and invoice PDF storage.
