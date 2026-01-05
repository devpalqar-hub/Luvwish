#!/bin/bash

# Production Deployment Script for Categories & Variations Feature
# This script safely deploys the new schema changes to production

set -e  # Exit on any error

echo "========================================="
echo "Production Deployment Starting..."
echo "========================================="
echo ""

# Step 1: Backup database
echo "Step 1: Creating database backup..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
mysqldump -u root -p ecommerce_db > "$BACKUP_FILE"
echo "✓ Backup created: $BACKUP_FILE"
echo ""

# Step 2: Clean duplicate cart items
echo "Step 2: Cleaning duplicate cart items..."
mysql -u root -p ecommerce_db < prisma/clean-duplicate-cart-items.sql
echo "✓ Duplicate cart items cleaned"
echo ""

# Step 3: Apply migrations
echo "Step 3: Applying database migrations..."
npx prisma migrate deploy
echo "✓ Migrations applied successfully"
echo ""

# Step 4: Generate Prisma Client
echo "Step 4: Generating Prisma Client..."
npx prisma generate
echo "✓ Prisma Client generated"
echo ""

# Step 5: Verify deployment
echo "Step 5: Verifying deployment..."
npx prisma migrate status
echo ""

echo "========================================="
echo "✓ Production Deployment Completed!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Test API endpoints"
echo "2. Monitor application logs"
echo "3. Check for any errors in production"
echo ""
echo "Rollback instructions (if needed):"
echo "  mysql -u root -p ecommerce_db < $BACKUP_FILE"
