# 🔧 Fix Next.js Build Error

## Issue:
```
Module not found: Can't resolve './EmployeeSettingsTab'
```

## The file exists but Next.js can't find it due to cache issues.

## Solution - Run these commands:

### 1. Clean Next.js cache
```bash
cd apps/web
rm -rf .next
rm -rf node_modules/.cache
```

### 2. Restart the dev server
```bash
npm run dev
# or
pnpm dev
```

## If that doesn't work, try:

### 3. Full clean reinstall
```bash
cd apps/web
rm -rf node_modules
rm -rf .next
npm install
# or
pnpm install
```

### 4. Restart dev server
```bash
npm run dev
```

## Root Cause:
Next.js sometimes caches module resolution. When files are edited or imports change, the cache can become stale and cause "Module not found" errors even though the file exists.

The `.next` folder contains Next.js build cache and needs to be deleted when these errors occur.
