# Deployment Guide for routinebuzz

## Vercel Deployment

This application is configured for optimal deployment on Vercel with proper CORS handling for external API calls.

### Prerequisites
- Vercel account
- GitHub/GitLab repository (recommended)

### Deployment Steps

1. **Connect Repository to Vercel**
   - Import your repository to Vercel
   - Vercel will auto-detect this as a Vite project

2. **Build Configuration**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Environment Variables (Optional)**
   - No environment variables are required for basic functionality
   - The app fetches data directly from: `https://usis-cdn.eniamza.com/connect.json`

### Configuration Files

- **vercel.json**: Contains routing rules and security headers
- **.env.example**: Template for environment variables (optional)
- **src/utils/api.ts**: Robust API fetching with retry logic

### Features Configured for Vercel

✅ **CORS Handling**: Proper headers and fetch configuration  
✅ **Error Handling**: Retry logic with exponential backoff  
✅ **Security Headers**: XSS protection, content type sniffing prevention  
✅ **SPA Routing**: All routes redirect to index.html  
✅ **Production Build**: Optimized bundle with tree shaking  

### Data Source

The application fetches course schedule data from:
```
https://usis-cdn.eniamza.com/connect.json
```

### Testing Deployment

After deployment, verify:
1. App loads correctly
2. Course data fetches properly
3. Filters work as expected
4. Theme switching functions
5. Help modal displays correctly

### Troubleshooting

**Data not loading?**
- Check browser console for CORS errors
- Verify the API endpoint is accessible
- Check network tab for failed requests

**Build fails?**
- Run `npm run build` locally to test
- Check for TypeScript errors
- Ensure all dependencies are installed

### Performance Notes

- The app includes retry logic for API calls
- Data is cached using browser's default cache strategy
- Bundle is optimized but could benefit from code splitting for larger applications