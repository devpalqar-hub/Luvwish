-- Drop existing triggers if present
DROP TRIGGER IF EXISTS products_stock_before_insert;
DROP TRIGGER IF EXISTS products_stock_before_update;

-- Create BEFORE INSERT trigger
CREATE TRIGGER products_stock_before_insert
BEFORE INSERT ON products
FOR EACH ROW
SET NEW.isStock = (NEW.stockCount IS NOT NULL AND NEW.stockCount > 0);

-- Create BEFORE UPDATE trigger
CREATE TRIGGER products_stock_before_update
BEFORE UPDATE ON products
FOR EACH ROW
SET NEW.isStock = (NEW.stockCount IS NOT NULL AND NEW.stockCount > 0);
