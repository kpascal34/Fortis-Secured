# Fortis Secured - Deployment Guide

## Production Build

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Appwrite account with production project setup

### Environment Setup

1. **Create production environment file:**
```bash
cp .env.production .env.production.local
```

2. **Configure your Appwrite credentials:**
Edit `.env.production.local` with your actual values:
```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-production-project-id
VITE_APPWRITE_DATABASE_ID=your-production-database-id
VITE_ENABLE_DEMO_MODE=false
```

### Build Commands

```bash
# Clean build
npm run clean

# Production build
npm run build

# Production build with clean
npm run build:prod

# Preview production build locally
npm run preview
```

### Build Output

The build will create:
- `dist/` - Production-ready files
- `dist/assets/js/` - JavaScript chunks with hashing
- `dist/assets/images/` - Optimized images
- `dist/assets/[name]-[hash].[ext]` - Other assets

### Build Optimizations

#### Code Splitting
The build automatically splits code into chunks:
- **react-vendor.js** - React, React DOM, React Router (core framework)
- **ui-vendor.js** - Framer Motion, React Icons, Lucide (UI libraries)
- **appwrite-vendor.js** - Appwrite SDK
- **[page]-[hash].js** - Individual page components (lazy loaded)

#### Minification
- JavaScript minified with Terser
- CSS minified
- `console.log` removed in production
- Dead code elimination

#### Asset Optimization
- Images: Organized in `assets/images/`
- Fonts: Organized in `assets/fonts/`
- Cache-busting hashes on all files

### Deployment Platforms

#### Vercel (Recommended)

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Deploy:**
```bash
vercel
```

3. **Configure:**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

4. **Environment Variables:**
Add in Vercel Dashboard → Settings → Environment Variables:
```
VITE_APPWRITE_ENDPOINT
VITE_APPWRITE_PROJECT_ID
VITE_APPWRITE_DATABASE_ID
```

#### Netlify

1. **Create `netlify.toml`:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. **Deploy:**
```bash
netlify deploy --prod
```

#### AWS S3 + CloudFront

1. **Build:**
```bash
npm run build
```

2. **Upload to S3:**
```bash
aws s3 sync dist/ s3://your-bucket-name --delete
```

3. **Invalidate CloudFront:**
```bash
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

#### Docker

1. **Create `Dockerfile`:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. **Build and run:**
```bash
docker build -t fortis-secured .
docker run -p 80:80 fortis-secured
```

### Performance Checklist

- ✅ Code splitting enabled
- ✅ Minification enabled
- ✅ Tree shaking enabled
- ✅ Asset optimization
- ✅ Cache-busting hashes
- ✅ Gzip/Brotli compression (server-side)
- ✅ Lazy loading for routes
- ✅ Image optimization
- ✅ Font preloading
- ✅ DNS prefetching for Appwrite

### Post-Deployment

1. **Test production build locally:**
```bash
npm run preview
```

2. **Verify:**
- [ ] All routes work correctly
- [ ] Assets load properly
- [ ] API connections successful
- [ ] Authentication flows work
- [ ] GPS clock-in works on mobile
- [ ] No console errors

3. **Monitor:**
- Check browser console for errors
- Monitor Appwrite logs
- Check performance metrics

### Troubleshooting

#### Build fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

#### Routes not working (404 on refresh)
Add redirect rules in your hosting platform:
```
/* /index.html 200
```

#### Environment variables not working
- Ensure variables start with `VITE_`
- Restart dev server after changes
- Rebuild for production

#### Large bundle size
- Check `dist/` folder size
- Remove unused dependencies
- Verify code splitting is working

### Security Considerations

1. **Environment Variables:**
   - Never commit `.env.local` files
   - Use different projects for dev/prod
   - Rotate API keys regularly

2. **Appwrite Security:**
   - Enable rate limiting
   - Configure proper CORS
   - Set up proper permissions
   - Enable 2FA for admin accounts

3. **Headers (configure in hosting):**
```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

### Maintenance

- Update dependencies regularly: `npm update`
- Monitor bundle size: Check `dist/` after builds
- Review performance: Use Lighthouse
- Check for security vulnerabilities: `npm audit`

---

## Production Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] Appwrite production project created
- [ ] Database collections created
- [ ] Permissions configured
- [ ] Demo mode disabled (`VITE_ENABLE_DEMO_MODE=false`)
- [ ] Debug logging disabled
- [ ] Build succeeds without errors
- [ ] Preview looks correct
- [ ] All routes tested
- [ ] Authentication tested
- [ ] Mobile responsive verified
- [ ] GPS functionality tested (if using)
- [ ] Performance acceptable (Lighthouse score >90)
- [ ] No console errors
- [ ] HTTPS enabled
- [ ] Domain configured
- [ ] Backup strategy in place

---

For issues or questions, check:
- Vite Documentation: https://vitejs.dev/
- Appwrite Documentation: https://appwrite.io/docs
- React Router Documentation: https://reactrouter.com/
