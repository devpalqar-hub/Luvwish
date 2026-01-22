import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from '../orders/orders.service';
import { SessionState, SessionContext } from './interfaces/whatsapp-message.interface';

@Injectable()
export class WhatsAppMessageHandler {
  private readonly logger = new Logger(WhatsAppMessageHandler.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly cartService: CartService,
    private readonly ordersService: OrdersService,
  ) {}

  async handleIncomingMessage(phoneNumber: string, messageText: string, messageId: string) {
    try {
      // Get or create session
      const session = await this.whatsappService.getOrCreateSession(phoneNumber);

      // Log incoming message
      await this.whatsappService.logMessage(
        session.id,
        messageId,
        'INBOUND',
        messageText,
        'text',
      );

      // Process message based on current state
      await this.processMessage(session, messageText, phoneNumber);
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`, error.stack);
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        '❌ Sorry, an error occurred. Please try again or type "menu" to start over.',
      );
    }
  }

  async handleInteractiveMessage(
    phoneNumber: string,
    buttonId: string,
    messageId: string,
  ) {
    try {
      const session = await this.whatsappService.getOrCreateSession(phoneNumber);

      await this.whatsappService.logMessage(
        session.id,
        messageId,
        'INBOUND',
        `Button: ${buttonId}`,
        'interactive',
      );

      await this.processButtonClick(session, buttonId, phoneNumber);
    } catch (error) {
      this.logger.error(`Error handling interactive message: ${error.message}`);
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        '❌ Sorry, an error occurred. Please try again.',
      );
    }
  }

  private async processMessage(session: any, messageText: string, phoneNumber: string) {
    const text = messageText.toLowerCase().trim();

    // Global commands
    if (text === 'menu' || text === 'start' || text === 'hi' || text === 'hello') {
      return this.showMainMenu(phoneNumber);
    }

    if (text === 'cart') {
      return this.showCart(session, phoneNumber);
    }

    if (text === 'categories') {
      return this.showCategories(phoneNumber);
    }

    // State-based processing
    switch (session.state) {
      case 'IDLE':
        return this.showMainMenu(phoneNumber);

      case 'BROWSING_CATEGORIES':
        return this.handleCategorySelection(session, messageText, phoneNumber);

      case 'BROWSING_PRODUCTS':
        return this.handleProductSearch(session, messageText, phoneNumber);

      case 'SELECTING_VARIATION':
        return this.handleVariationSelection(session, messageText, phoneNumber);

      case 'VIEWING_CART':
        return this.handleCartAction(session, messageText, phoneNumber);

      case 'ENTERING_ADDRESS':
        return this.handleAddressInput(session, messageText, phoneNumber);

      case 'CONFIRMING_ORDER':
        return this.handleOrderConfirmation(session, messageText, phoneNumber);

      default:
        return this.showMainMenu(phoneNumber);
    }
  }

  private async processButtonClick(session: any, buttonId: string, phoneNumber: string) {
    const [action, ...params] = buttonId.split('_');

    switch (action) {
      case 'category':
        await this.selectCategory(session, params[0], phoneNumber);
        break;

      case 'product':
        await this.selectProduct(session, params[0], phoneNumber);
        break;

      case 'variation':
        await this.selectVariation(session, params[0], phoneNumber);
        break;

      case 'addcart':
        await this.addToCart(session, params[0], params[1], phoneNumber);
        break;

      case 'viewcart':
        await this.showCart(session, phoneNumber);
        break;

      case 'checkout':
        await this.startCheckout(session, phoneNumber);
        break;

      case 'remove':
        await this.removeFromCart(session, params[0], phoneNumber);
        break;

      case 'confirm':
        await this.confirmOrder(session, phoneNumber);
        break;

      case 'cancel':
        await this.showMainMenu(phoneNumber);
        break;

      default:
        await this.whatsappService.sendTextMessage(
          phoneNumber,
          'Invalid option. Please try again.',
        );
    }
  }

  // ==================== MAIN MENU ====================

  private async showMainMenu(phoneNumber: string) {
    await this.whatsappService.sendInteractiveMessage(
      phoneNumber,
      '🛍️ *Welcome to Luvwish!*\n\nHow can I help you today?',
      [
        { id: 'browse_categories', title: '📂 Browse Categories' },
        { id: 'search_products', title: '🔍 Search Products' },
        { id: 'view_cart', title: '🛒 View Cart' },
      ],
      '🏪 Luvwish Shopping',
      'Reply with a button or type "cart" anytime',
    );

    const session = await this.whatsappService.getOrCreateSession(phoneNumber);
    await this.whatsappService.updateSessionState(session.id, 'IDLE', {});
  }

  // ==================== CATEGORIES ====================

  private async showCategories(phoneNumber: string) {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        subCategories: {
          where: { isActive: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (categories.length === 0) {
      return this.whatsappService.sendTextMessage(
        phoneNumber,
        'No categories available at the moment.',
      );
    }

    const sections = categories.map((category) => ({
      title: category.name,
      rows: category.subCategories.map((sub) => ({
        id: `subcategory_${sub.id}`,
        title: sub.name,
        description: sub.description?.substring(0, 72),
      })),
    }));

    await this.whatsappService.sendListMessage(
      phoneNumber,
      '📂 *Browse Categories*\n\nSelect a category to view products:',
      'Select Category',
      sections,
      '🏪 Product Categories',
    );

    const session = await this.whatsappService.getOrCreateSession(phoneNumber);
    await this.whatsappService.updateSessionState(session.id, 'BROWSING_CATEGORIES', {});
  }

  private async handleCategorySelection(session: any, text: string, phoneNumber: string) {
    // User can type category name
    const category = await this.prisma.category.findFirst({
      where: {
        OR: [
          { name: { contains: text } },
          { slug: { contains: text } },
        ],
        isActive: true,
      },
      include: {
        subCategories: {
          where: { isActive: true },
        },
      },
    });

    if (!category) {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        '❌ Category not found. Please type "categories" to see all available categories.',
      );
      return;
    }

    if (category.subCategories.length === 0) {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        `No products found in ${category.name}. Type "categories" to browse other categories.`,
      );
      return;
    }

    const sections = [
      {
        title: category.name,
        rows: category.subCategories.map((sub) => ({
          id: `subcategory_${sub.id}`,
          title: sub.name,
          description: sub.description?.substring(0, 72),
        })),
      },
    ];

    await this.whatsappService.sendListMessage(
      phoneNumber,
      `📂 *${category.name}*\n\nSelect a subcategory:`,
      'Select Subcategory',
      sections,
    );
  }

  private async selectCategory(session: any, subCategoryId: string, phoneNumber: string) {
    const products = await this.prisma.product.findMany({
      where: {
        subCategoryId,
        isStock: true,
      },
      include: {
        images: {
          where: { isMain: true },
          take: 1,
        },
        variations: {
          where: { isAvailable: true },
        },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    if (products.length === 0) {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        'No products available in this category. Type "categories" to browse others.',
      );
      return;
    }

    await this.displayProducts(products, phoneNumber);

    await this.whatsappService.updateSessionState(session.id, 'BROWSING_PRODUCTS', {
      subCategoryId,
    });
  }

  // ==================== PRODUCT SEARCH & DISPLAY ====================

  private async handleProductSearch(session: any, text: string, phoneNumber: string) {
    const searchQuery = text.trim();

    const products = await this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: searchQuery } },
          { description: { contains: searchQuery } },
        ],
        isStock: true,
      },
      include: {
        images: {
          where: { isMain: true },
          take: 1,
        },
        variations: {
          where: { isAvailable: true },
        },
        subCategory: true,
      },
      take: 10,
    });

    if (products.length === 0) {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        `❌ No products found for "${searchQuery}".\n\nTry different keywords or type "categories" to browse.`,
      );
      return;
    }

    await this.whatsappService.sendTextMessage(
      phoneNumber,
      `🔍 Found ${products.length} product(s) matching "${searchQuery}":`,
    );

    await this.displayProducts(products, phoneNumber);

    await this.whatsappService.updateSessionState(session.id, 'BROWSING_PRODUCTS', {
      searchQuery,
    });
  }

  private async displayProducts(products: any[], phoneNumber: string) {
    for (const product of products.slice(0, 5)) {
      // Limit to 5 products at a time
      const price =
        product.discountedPrice < product.actualPrice
          ? `₹${product.discountedPrice} ~~₹${product.actualPrice}~~`
          : `₹${product.actualPrice}`;

      const stock = product.stockCount > 0 ? `✅ In Stock (${product.stockCount})` : '❌ Out of Stock';

      let message = `*${product.name}*\n\n`;
      message += `${product.description ? product.description.substring(0, 200) + '...\n\n' : ''}`;
      message += `💰 Price: ${price}\n`;
      message += `📦 ${stock}\n`;

      if (product.variations && product.variations.length > 0) {
        message += `🎨 Available in ${product.variations.length} variation(s)\n`;
      }

      // Send image if available
      if (product.images && product.images.length > 0) {
        await this.whatsappService.sendImageMessage(
          phoneNumber,
          product.images[0].url,
          message,
        );
      } else {
        await this.whatsappService.sendTextMessage(phoneNumber, message);
      }

      // Send action buttons
      const buttons = [];

      if (product.variations && product.variations.length > 0) {
        buttons.push({
          id: `product_${product.id}_variations`,
          title: '🎨 View Options',
        });
      } else if (product.stockCount > 0) {
        buttons.push({
          id: `addcart_${product.id}_`,
          title: '➕ Add to Cart',
        });
      }

      buttons.push({
        id: `viewcart`,
        title: '🛒 View Cart',
      });

      if (buttons.length > 0) {
        await this.whatsappService.sendInteractiveMessage(
          phoneNumber,
          'What would you like to do?',
          buttons.slice(0, 3),
        );
      }
    }

    if (products.length > 5) {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        `... and ${products.length - 5} more products. Type to search more specifically.`,
      );
    }
  }

  private async selectProduct(session: any, productId: string, phoneNumber: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: true,
        variations: {
          where: { isAvailable: true },
        },
      },
    });

    if (!product) {
      await this.whatsappService.sendTextMessage(phoneNumber, 'Product not found.');
      return;
    }

    if (product.variations && product.variations.length > 0) {
      // Show variations
      const sections = [
        {
          title: product.variationTitle || 'Options',
          rows: product.variations.map((variation) => ({
            id: `variation_${variation.id}`,
            title: variation.variationName,
            description: `₹${variation.discountedPrice} | Stock: ${variation.stockCount}`,
          })),
        },
      ];

      await this.whatsappService.sendListMessage(
        phoneNumber,
        `🎨 *${product.name}*\n\nSelect a variation:`,
        'Select Option',
        sections,
      );

      await this.whatsappService.updateSessionState(session.id, 'SELECTING_VARIATION', {
        productId: product.id,
      });
    } else {
      // Direct add to cart
      await this.addToCart(session, product.id, '', phoneNumber);
    }
  }

  // ==================== VARIATIONS ====================

  private async handleVariationSelection(session: any, text: string, phoneNumber: string) {
    const context = session.contextData as SessionContext;

    if (!context.productId) {
      await this.showMainMenu(phoneNumber);
      return;
    }

    // User selected from list button
    await this.whatsappService.sendTextMessage(
      phoneNumber,
      'Please use the list button to select a variation.',
    );
  }

  private async selectVariation(session: any, variationId: string, phoneNumber: string) {
    const variation = await this.prisma.productVariation.findUnique({
      where: { id: variationId },
      include: { product: true },
    });

    if (!variation || !variation.isAvailable) {
      await this.whatsappService.sendTextMessage(phoneNumber, 'This variation is not available.');
      return;
    }

    await this.addToCart(session, variation.productId, variation.id, phoneNumber);
  }

  // ==================== CART MANAGEMENT ====================

  private async addToCart(
    session: any,
    productId: string,
    variationId: string,
    phoneNumber: string,
  ) {
    try {
      // Ensure customer profile exists
      let customerProfile = session.customerProfile;

      if (!customerProfile) {
        // Create customer profile linked to phone number
        const user = await this.findOrCreateUserByPhone(phoneNumber);
        customerProfile = await this.prisma.customerProfile.findUnique({
          where: { userId: user.id },
        });

        if (!customerProfile) {
          customerProfile = await this.prisma.customerProfile.create({
            data: {
              userId: user.id,
              phone: phoneNumber,
              name: 'WhatsApp Customer',
            },
          });
        }

        await this.whatsappService.linkSessionToCustomer(session.id, customerProfile.id);
      }

      // Add to cart
      await this.cartService.addToCart(customerProfile.userId, {
        productId,
        productVariationId: variationId || null,
        quantity: 1,
      });

      await this.whatsappService.sendTextMessage(
        phoneNumber,
        '✅ Product added to cart!\n\nType "cart" to view your cart or continue shopping.',
      );

      await this.whatsappService.sendInteractiveMessage(
        phoneNumber,
        'What would you like to do next?',
        [
          { id: 'viewcart', title: '🛒 View Cart' },
          { id: 'browse_categories', title: '🔙 Continue Shopping' },
          { id: 'checkout', title: '💳 Checkout' },
        ],
      );

      await this.whatsappService.updateSessionState(session.id, 'IDLE', {});
    } catch (error) {
      this.logger.error(`Error adding to cart: ${error.message}`);
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        `❌ Failed to add to cart: ${error.message}`,
      );
    }
  }

  private async showCart(session: any, phoneNumber: string) {
    try {
      let customerProfile = session.customerProfile;

      if (!customerProfile) {
        await this.whatsappService.sendTextMessage(
          phoneNumber,
          '🛒 Your cart is empty.\n\nType "menu" to start shopping!',
        );
        return;
      }

      const cartItems = await this.prisma.cartItem.findMany({
        where: { customerProfileId: customerProfile.id },
        include: {
          product: {
            include: {
              images: {
                where: { isMain: true },
                take: 1,
              },
            },
          },
          productVariation: true,
        },
      });

      if (cartItems.length === 0) {
        await this.whatsappService.sendTextMessage(
          phoneNumber,
          '🛒 Your cart is empty.\n\nType "menu" to start shopping!',
        );
        return;
      }

      let total = 0;
      let message = '🛒 *Your Cart*\n\n';

      cartItems.forEach((item, index) => {
        const product = item.product;
        const variation = item.productVariation;

        const price = variation
          ? parseFloat(variation.discountedPrice.toString())
          : parseFloat(product.discountedPrice.toString());

        const itemTotal = price * item.quantity;
        total += itemTotal;

        message += `${index + 1}. *${product.name}*\n`;
        if (variation) {
          message += `   Variation: ${variation.variationName}\n`;
        }
        message += `   Qty: ${item.quantity} × ₹${price} = ₹${itemTotal}\n\n`;
      });

      message += `━━━━━━━━━━━━━━━\n`;
      message += `💰 *Total: ₹${total}*\n\n`;
      message += `📦 Cash on Delivery Available`;

      await this.whatsappService.sendTextMessage(phoneNumber, message);

      // Show action buttons
      const buttons = [
        { id: 'checkout', title: '💳 Checkout' },
        { id: 'browse_categories', title: '➕ Add More' },
      ];

      if (cartItems.length > 0) {
        buttons.push({ id: 'clear_cart', title: '🗑️ Clear Cart' });
      }

      await this.whatsappService.sendInteractiveMessage(
        phoneNumber,
        'What would you like to do?',
        buttons.slice(0, 3),
      );

      await this.whatsappService.updateSessionState(session.id, 'VIEWING_CART', {});
    } catch (error) {
      this.logger.error(`Error showing cart: ${error.message}`);
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        '❌ Error loading cart. Please try again.',
      );
    }
  }

  private async handleCartAction(session: any, text: string, phoneNumber: string) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('remove') || lowerText.includes('delete')) {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        'To remove an item, please view your cart again and I will show you options.',
      );
      return this.showCart(session, phoneNumber);
    }

    if (lowerText.includes('clear')) {
      await this.clearCart(session, phoneNumber);
      return;
    }

    if (lowerText.includes('checkout') || lowerText.includes('order')) {
      await this.startCheckout(session, phoneNumber);
      return;
    }

    await this.showCart(session, phoneNumber);
  }

  private async removeFromCart(session: any, cartItemId: string, phoneNumber: string) {
    try {
      await this.prisma.cartItem.delete({
        where: { id: cartItemId },
      });

      await this.whatsappService.sendTextMessage(phoneNumber, '✅ Item removed from cart.');
      await this.showCart(session, phoneNumber);
    } catch (error) {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        '❌ Failed to remove item. Please try again.',
      );
    }
  }

  private async clearCart(session: any, phoneNumber: string) {
    try {
      if (!session.customerProfile) {
        await this.whatsappService.sendTextMessage(phoneNumber, 'Your cart is already empty.');
        return;
      }

      await this.prisma.cartItem.deleteMany({
        where: { customerProfileId: session.customerProfile.id },
      });

      await this.whatsappService.sendTextMessage(
        phoneNumber,
        '✅ Cart cleared.\n\nType "menu" to start shopping again!',
      );

      await this.whatsappService.updateSessionState(session.id, 'IDLE', {});
    } catch (error) {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        '❌ Failed to clear cart. Please try again.',
      );
    }
  }

  // ==================== CHECKOUT & ADDRESS ====================

  private async startCheckout(session: any, phoneNumber: string) {
    try {
      if (!session.customerProfile) {
        await this.whatsappService.sendTextMessage(
          phoneNumber,
          'Your cart is empty. Type "menu" to start shopping!',
        );
        return;
      }

      // Check if address exists
      const addresses = await this.prisma.address.findMany({
        where: { customerProfileId: session.customerProfile.id },
      });

      if (addresses.length === 0) {
        await this.whatsappService.sendTextMessage(
          phoneNumber,
          '📍 *Delivery Address Required*\n\nLet me collect your delivery address.\n\nPlease provide your *Full Name*:',
        );

        await this.whatsappService.updateSessionState(session.id, 'ENTERING_ADDRESS', {
          addressStep: 1,
          addressData: {},
        });
      } else {
        // Show existing addresses
        const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];
        await this.confirmOrderWithAddress(session, phoneNumber, defaultAddress);
      }
    } catch (error) {
      this.logger.error(`Error starting checkout: ${error.message}`);
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        '❌ Error starting checkout. Please try again.',
      );
    }
  }

  private async handleAddressInput(session: any, text: string, phoneNumber: string) {
    try {
      const context = session.contextData as SessionContext;
      const addressData = context.addressData || {};
      const step = context.addressStep || 1;

      switch (step) {
        case 1: // Name
          addressData.name = text.trim();
          await this.whatsappService.sendTextMessage(
            phoneNumber,
            `✅ Name: ${text}\n\nPlease provide your *Complete Address* (House/Flat, Street):`,
          );
          await this.whatsappService.updateSessionState(session.id, 'ENTERING_ADDRESS', {
            addressStep: 2,
            addressData,
          });
          break;

        case 2: // Address
          addressData.address = text.trim();
          await this.whatsappService.sendTextMessage(
            phoneNumber,
            `✅ Address saved.\n\nPlease provide your *City*:`,
          );
          await this.whatsappService.updateSessionState(session.id, 'ENTERING_ADDRESS', {
            addressStep: 3,
            addressData,
          });
          break;

        case 3: // City
          addressData.city = text.trim();
          await this.whatsappService.sendTextMessage(
            phoneNumber,
            `✅ City: ${text}\n\nPlease provide your *State*:`,
          );
          await this.whatsappService.updateSessionState(session.id, 'ENTERING_ADDRESS', {
            addressStep: 4,
            addressData,
          });
          break;

        case 4: // State
          addressData.state = text.trim();
          await this.whatsappService.sendTextMessage(
            phoneNumber,
            `✅ State: ${text}\n\nPlease provide your *PIN Code*:`,
          );
          await this.whatsappService.updateSessionState(session.id, 'ENTERING_ADDRESS', {
            addressStep: 5,
            addressData,
          });
          break;

        case 5: // Postal Code
          addressData.postalCode = text.trim();
          await this.whatsappService.sendTextMessage(
            phoneNumber,
            `✅ PIN Code: ${text}\n\nPlease provide any *Landmark* (Optional, type "skip" to skip):`,
          );
          await this.whatsappService.updateSessionState(session.id, 'ENTERING_ADDRESS', {
            addressStep: 6,
            addressData,
          });
          break;

        case 6: // Landmark
          if (text.toLowerCase() !== 'skip') {
            addressData.landmark = text.trim();
          }
          await this.whatsappService.sendTextMessage(
            phoneNumber,
            `✅ Almost done!\n\nPlease provide your *Contact Phone Number*:`,
          );
          await this.whatsappService.updateSessionState(session.id, 'ENTERING_ADDRESS', {
            addressStep: 7,
            addressData,
          });
          break;

        case 7: // Phone
          addressData.phone = text.trim();
          addressData.country = 'India';

          // Save address
          const newAddress = await this.prisma.address.create({
            data: {
              customerProfileId: session.customerProfile.id,
              name: addressData.name,
              address: addressData.address,
              city: addressData.city,
              state: addressData.state,
              postalCode: addressData.postalCode,
              landmark: addressData.landmark,
              country: addressData.country,
              phone: addressData.phone,
              isDefault: true,
            },
          });

          await this.whatsappService.sendTextMessage(
            phoneNumber,
            `✅ *Address Saved Successfully!*\n\n${addressData.name}\n${addressData.address}\n${addressData.city}, ${addressData.state} - ${addressData.postalCode}\n${addressData.phone}`,
          );

          await this.confirmOrderWithAddress(session, phoneNumber, newAddress);
          break;

        default:
          await this.startCheckout(session, phoneNumber);
      }
    } catch (error) {
      this.logger.error(`Error handling address input: ${error.message}`);
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        '❌ Error saving address. Please try again or type "menu" to start over.',
      );
    }
  }

  private async confirmOrderWithAddress(session: any, phoneNumber: string, address: any) {
    try {
      // Get cart summary
      const cartItems = await this.prisma.cartItem.findMany({
        where: { customerProfileId: session.customerProfile.id },
        include: {
          product: true,
          productVariation: true,
        },
      });

      if (cartItems.length === 0) {
        await this.whatsappService.sendTextMessage(
          phoneNumber,
          'Your cart is empty. Type "menu" to start shopping!',
        );
        return;
      }

      let total = 0;
      let summary = '📋 *Order Summary*\n\n';

      cartItems.forEach((item, index) => {
        const price = item.productVariation
          ? parseFloat(item.productVariation.discountedPrice.toString())
          : parseFloat(item.product.discountedPrice.toString());

        const itemTotal = price * item.quantity;
        total += itemTotal;

        summary += `${index + 1}. ${item.product.name}`;
        if (item.productVariation) {
          summary += ` (${item.productVariation.variationName})`;
        }
        summary += `\n   Qty: ${item.quantity} × ₹${price} = ₹${itemTotal}\n`;
      });

      summary += `\n━━━━━━━━━━━━━━━\n`;
      summary += `💰 *Total: ₹${total}*\n\n`;
      summary += `📍 *Delivery Address:*\n`;
      summary += `${address.name}\n`;
      summary += `${address.address}\n`;
      summary += `${address.city}, ${address.state} - ${address.postalCode}\n`;
      summary += `📞 ${address.phone}\n\n`;
      summary += `💳 *Payment: Cash on Delivery*`;

      await this.whatsappService.sendTextMessage(phoneNumber, summary);

      await this.whatsappService.sendInteractiveMessage(
        phoneNumber,
        'Please confirm your order:',
        [
          { id: 'confirm_order', title: '✅ Confirm Order' },
          { id: 'cancel_order', title: '❌ Cancel' },
        ],
      );

      await this.whatsappService.updateSessionState(session.id, 'CONFIRMING_ORDER', {
        addressId: address.id,
      });
    } catch (error) {
      this.logger.error(`Error confirming order: ${error.message}`);
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        '❌ Error preparing order. Please try again.',
      );
    }
  }

  private async handleOrderConfirmation(session: any, text: string, phoneNumber: string) {
    await this.whatsappService.sendTextMessage(
      phoneNumber,
      'Please use the buttons to confirm or cancel your order.',
    );
  }

  private async confirmOrder(session: any, phoneNumber: string) {
    try {
      if (!session.customerProfile) {
        await this.whatsappService.sendTextMessage(phoneNumber, 'Session expired. Please start over.');
        return;
      }

      const context = session.contextData as SessionContext;
      const addressId = context.addressId;

      if (!addressId) {
        await this.startCheckout(session, phoneNumber);
        return;
      }

      // Get cart items
      const cartItems = await this.prisma.cartItem.findMany({
        where: { customerProfileId: session.customerProfile.id },
        include: {
          product: true,
          productVariation: true,
        },
      });

      if (cartItems.length === 0) {
        await this.whatsappService.sendTextMessage(phoneNumber, 'Your cart is empty.');
        return;
      }

      // Calculate total
      let totalAmount = 0;
      const orderItems = [];

      for (const item of cartItems) {
        const price = item.productVariation
          ? parseFloat(item.productVariation.discountedPrice.toString())
          : parseFloat(item.product.discountedPrice.toString());

        const actualPrice = item.productVariation
          ? parseFloat(item.productVariation.actualPrice.toString())
          : parseFloat(item.product.actualPrice.toString());

        totalAmount += price * item.quantity;

        orderItems.push({
          productId: item.productId,
          productVariationId: item.productVariationId,
          quantity: item.quantity,
          discountedPrice: price,
          actualPrice: actualPrice,
        });
      }

      // Create order
      const orderNumber = `WA${Date.now()}`;

      const order = await this.prisma.order.create({
        data: {
          orderNumber,
          customerProfileId: session.customerProfile.id,
          shippingAddressId: addressId,
          status: 'pending',
          paymentStatus: 'pending',
          paymentMethod: 'cash_on_delivery',
          totalAmount,
          shippingCost: 0,
          taxAmount: 0,
          discountAmount: 0,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              product: true,
              productVariation: true,
            },
          },
          shippingAddress: true,
        },
      });

      // Clear cart
      await this.prisma.cartItem.deleteMany({
        where: { customerProfileId: session.customerProfile.id },
      });

      // Send confirmation
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        `🎉 *Order Confirmed!*\n\n📦 Order Number: *${orderNumber}*\n💰 Total: ₹${totalAmount}\n💳 Payment: Cash on Delivery\n\nYour order has been placed successfully! We will contact you soon for confirmation.\n\nThank you for shopping with Luvwish! 🛍️`,
      );

      await this.whatsappService.updateSessionState(session.id, 'IDLE', {});

      // Show menu
      await this.showMainMenu(phoneNumber);
    } catch (error) {
      this.logger.error(`Error confirming order: ${error.message}`, error.stack);
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        `❌ Error placing order: ${error.message}\n\nPlease try again or contact support.`,
      );
    }
  }

  // ==================== HELPER METHODS ====================

  private async findOrCreateUserByPhone(phoneNumber: string) {
    // Check if user exists with this phone in customer profile
    const customerProfile = await this.prisma.customerProfile.findFirst({
      where: { phone: phoneNumber },
      include: { user: true },
    });

    if (customerProfile) {
      return customerProfile.user;
    }

    // Create new user
    const user = await this.prisma.user.create({
      data: {
        email: `whatsapp_${phoneNumber}@luvwish.com`,
        role: 'CUSTOMER',
        isActive: true,
      },
    });

    return user;
  }
}
