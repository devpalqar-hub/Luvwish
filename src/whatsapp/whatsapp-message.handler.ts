import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from '../orders/orders.service';
import { SessionState, SessionContext } from './interfaces/whatsapp-message.interface';
import { EnquiryService } from 'src/enquiry-forms/enquiry.service';
import { CreatePaymentIntentDto } from 'src/razorpay/dto/checkout.dto';
import { PaymentMethod } from '@prisma/client';
import { RazorpayService } from 'src/razorpay/razorpay.service';
import { AddressService } from 'src/address/address.service';

@Injectable()
export class WhatsAppMessageHandler {
  private readonly logger = new Logger(WhatsAppMessageHandler.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly cartService: CartService,
    private readonly ordersService: OrdersService,
    private readonly enquiryService: EnquiryService,
    private readonly razorpayservice: RazorpayService,
    private readonly addressService: AddressService,
  ) { }

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

      case 'ENQUIRY_NAME':
      case 'ENQUIRY_EMAIL':
      case 'ENQUIRY_PHONE':
      case 'ENQUIRY_PURPOSE':
      case 'ENQUIRY_NOTES':
        return this.handleEnquiryFlow(session, messageText, phoneNumber);

      default:
        return this.showMainMenu(phoneNumber);
    }
  }
  private async processButtonClick(session: any, buttonId: string, phoneNumber: string) {
    const [action, ...params] = buttonId.split('_');

    switch (buttonId) {
      case 'purchase':
        return this.startPurchaseFlow(session, phoneNumber);

      case 'viewcart':
        return this.showCart(session, phoneNumber);

      case 'purchase_now':
        return this.startAddressSelection(session, phoneNumber);

      default:
        switch (action) {
          case 'addcart':
            return this.addToCart(session, params[0], '', phoneNumber);

          case 'remove':
            return this.removeFromCart(session, params[0], phoneNumber);

          case 'selectaddress':
            return this.confirmPurchase(session, params[0], phoneNumber);

          case 'newaddress':
            return this.startAddressCreation(session, phoneNumber);
        }
    }
  }



  // private async showMainMenu(phoneNumber: string) {
  //   await this.whatsappService.sendInteractiveMessage(
  //     phoneNumber,
  //     '🛍️ *Welcome to Aviar Biotech!*\n\nHow can I help you today?',
  //     [
  //       { id: 'Purchase', title: '📂 Browse Categories' },
  //       { id: 'search_products', title: '🔍 Search Products' },
  //       { id: 'view_cart', title: '🛒 View Cart' },
  //     ],
  //     '🏪 Aviar BioTech Shopping',
  //     'Reply with a button or type "cart" anytime',
  //   );

  //   const session = await this.whatsappService.getOrCreateSession(phoneNumber);
  //   await this.whatsappService.updateSessionState(session.id, 'IDLE', {});
  // }



  // ==================== MAIN MENU ====================
  private async showMainMenu(phoneNumber: string) {
    await this.whatsappService.sendInteractiveMessage(
      phoneNumber,
      '🛍️ *Welcome to Aviar Biotech!*\n\nHow can I help you today?',
      [
        { id: 'purchase', title: '🛒 Purchase Products' },
        { id: 'enquiry', title: '🔍 Product Enquiry' },
        { id: 'view_product', title: '📦 View Products' },
      ],
      '🏪 Aviar BioTech Shopping',
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

    // Show first 3 categories as buttons
    const categoriesToShow = categories.slice(0, 3);
    const buttons = categoriesToShow.map((category) => ({
      id: `maincategory_${category.id}`,
      title: category.name.substring(0, 20), // WhatsApp limit
    }));

    await this.whatsappService.sendInteractiveMessage(
      phoneNumber,
      '📂 *Browse Categories*\n\nSelect a category:',
      buttons,
      '🏪 Product Categories',
    );

    if (categories.length > 3) {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        `Showing ${categoriesToShow.length} of ${categories.length} categories. Type category name to see more.`,
      );
    }

    const session = await this.whatsappService.getOrCreateSession(phoneNumber);
    await this.whatsappService.updateSessionState(session.id, 'BROWSING_CATEGORIES', {});
  }

  private async showSubCategories(session: any, categoryId: string, phoneNumber: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        subCategories: {
          where: { isActive: true },
        },
      },
    });

    if (!category) {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        '❌ Category not found.',
      );
      return;
    }

    if (category.subCategories.length === 0) {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        `No subcategories found in ${category.name}.`,
      );
      return;
    }

    // Show first 3 subcategories as buttons
    const subCategoriesToShow = category.subCategories.slice(0, 3);
    const buttons = subCategoriesToShow.map((sub) => ({
      id: `subcategory_${sub.id}`,
      title: sub.name.substring(0, 20), // WhatsApp limit
    }));

    await this.whatsappService.sendInteractiveMessage(
      phoneNumber,
      `📂 *${category.name}*\n\nSelect a subcategory:`,
      buttons,
    );

    if (category.subCategories.length > 3) {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        `Showing ${subCategoriesToShow.length} of ${category.subCategories.length} subcategories.`,
      );
    }

    await this.whatsappService.updateSessionState(session.id, 'BROWSING_CATEGORIES', {
      categoryId,
    });
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
    });

    if (!category) {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        '❌ Category not found. Please type "categories" to see all available categories.',
      );
      return;
    }

    // Show subcategories for this category
    await this.showSubCategories(session, category.id, phoneNumber);
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

  private async startProductSearch(session: any, phoneNumber: string) {
    await this.whatsappService.sendTextMessage(
      phoneNumber,
      '🔍 *Product Search*\n\nType the name or keywords of the product you\'re looking for.\n\nExample: "shoes", "red dress", "laptop"',
    );

    await this.whatsappService.updateSessionState(session.id, 'BROWSING_PRODUCTS', {
      searchQuery: '',
    });
  }

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
          id: `product_${product.id}`,
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

  //------------------------------------------
  // Added by Devanand
  //------------------------------------------
  private async startEnquiry(session: any, phoneNumber: string) {
    await this.whatsappService.sendTextMessage(
      phoneNumber,
      '📝 *Product Enquiry*\n\nPlease enter your *Full Name*:',
    );

    await this.whatsappService.updateSessionState(session.id, 'ENQUIRY_NAME', {
      enquiryData: {},
    });
  }
  private async handleEnquiryFlow(
    session: any,
    text: string,
    phoneNumber: string,
  ) {
    const context = session.contextData || {};
    const enquiryData = context.enquiryData || {};

    switch (session.state) {

      case 'ENQUIRY_NAME':
        enquiryData.name = text.trim();

        await this.whatsappService.sendTextMessage(
          phoneNumber,
          '📧 Please enter your *Email Address*:'
        );

        return this.whatsappService.updateSessionState(
          session.id,
          'ENQUIRY_EMAIL',
          { enquiryData },
        );

      case 'ENQUIRY_EMAIL':
        enquiryData.email = text.trim();

        await this.whatsappService.sendTextMessage(
          phoneNumber,
          '📞 Please enter your *Phone Number*:'
        );

        return this.whatsappService.updateSessionState(
          session.id,
          'ENQUIRY_PHONE',
          { enquiryData },
        );

      case 'ENQUIRY_PHONE':
        enquiryData.phone = text.trim();

        await this.whatsappService.sendListMessage(
          phoneNumber,
          '📌 Select Enquiry Purpose:',
          'Select Purpose',
          [{
            title: 'Purpose',
            rows: [
              { id: 'purpose_PRODUCT', title: 'Product Information' },
              { id: 'purpose_BULK', title: 'Bulk Purchase' },
              { id: 'purpose_SUPPORT', title: 'Support' },
              { id: 'purpose_OTHER', title: 'Other' },
            ],
          }],
        );

        return this.whatsappService.updateSessionState(
          session.id,
          'ENQUIRY_PURPOSE',
          { enquiryData },
        );

      case 'ENQUIRY_NOTES':
        if (text.toLowerCase() !== 'skip') {
          enquiryData.additionalNotes = text.trim();
        }

        // ✅ FINAL STEP — API CALL
        await this.enquiryService.create({
          name: enquiryData.name,
          email: enquiryData.email,
          phone: enquiryData.phone,
          purpose: enquiryData.purpose,
          additionalNotes: enquiryData.additionalNotes,
        });

        await this.whatsappService.sendTextMessage(
          phoneNumber,
          '✅ *Enquiry Submitted Successfully!*\n\nOur team will contact you shortly.',
        );

        await this.whatsappService.updateSessionState(session.id, 'IDLE', {});
        return this.showMainMenu(phoneNumber);

      default:
        return this.showMainMenu(phoneNumber);
    }
  }

  private async handleEnquiryPurpose(
    session: any,
    purpose: string,
    phoneNumber: string,
  ) {
    const context = session.contextData;
    context.enquiryData.purpose = purpose;

    await this.whatsappService.sendTextMessage(
      phoneNumber,
      '📝 Any additional notes? (Optional — type "skip" to continue)',
    );

    await this.whatsappService.updateSessionState(
      session.id,
      'ENQUIRY_NOTES',
      context,
    );
  }


  private async startViewProducts(session: any, phoneNumber: string) {
    const result = await this.productsService.findAll(
      {
        limit: 5, page: 1,
        skip: 0
      },
    );

    if (!result.data || result.data.length === 0) {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        '📦 No products available at the moment.',
      );
      return this.showMainMenu(phoneNumber);
    }

    await this.displayViewOnlyProducts(result.data, phoneNumber);

    await this.whatsappService.updateSessionState(
      session.id,
      'VIEWING_PRODUCTS_ONLY',
      {},
    );
  }

  private async displayViewOnlyProducts(products: any[], phoneNumber: string) {
    for (const product of products) {
      let message = `*${product.name}*\n\n`;

      if (product.description) {
        message += `${product.description.substring(0, 200)}...\n\n`;
      }

      message += `💰 Price: ₹${product.discountedPrice}\n`;

      if (product.subCategory?.category) {
        message += `📂 Category: ${product.subCategory.category.name}\n`;
      }

      if (product.images?.length) {
        await this.whatsappService.sendImageMessage(
          phoneNumber,
          product.images[0].url,
          message,
        );
      } else {
        await this.whatsappService.sendTextMessage(phoneNumber, message);
      }

      await this.whatsappService.sendInteractiveMessage(
        phoneNumber,
        'Options:',
        [
          {
            id: `viewproduct_${product.id}`,
            title: '🔍 View Details',
          },
          {
            id: 'menu',
            title: '🔙 Back to Menu',
          },
        ],
      );
    }
  }

  private async viewSingleProduct(productId: string, phoneNumber: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: true,
        subCategory: {
          include: { category: true },
        },
        productMetas: true,
      },
    });

    if (!product) {
      return this.whatsappService.sendTextMessage(
        phoneNumber,
        '❌ Product not found.',
      );
    }

    let message = `*${product.name}*\n\n`;
    message += `${product.description || ''}\n\n`;
    message += `💰 Price: ₹${product.discountedPrice}\n`;
    message += `📂 Category: ${product.subCategory?.category?.name}\n`;

    if (product.productMetas?.length) {
      message += '\n📌 *Specifications:*\n';
      product.productMetas.forEach((m) => {
        message += `• ${m.title}: ${m.value}\n`;
      });
    }

    if (product.images?.length) {
      await this.whatsappService.sendImageMessage(
        phoneNumber,
        product.images[0].url,
        message,
      );
    } else {
      await this.whatsappService.sendTextMessage(phoneNumber, message);
    }

    await this.whatsappService.sendInteractiveMessage(
      phoneNumber,
      'What next?',
      [
        { id: 'menu', title: '🏠 Main Menu' },
        { id: 'enquiry', title: '📝 Enquiry' },
      ],
    );
  }

  private async startPurchaseFlow(session: any, phoneNumber: string) {
    const products = await this.productsService.findAll(
      { limit: 5, page: 1, skip: 0 },
    );

    if (!products.data.length) {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        '🛒 No products available right now.',
      );
      return this.showMainMenu(phoneNumber);
    }

    await this.displayPurchasableProducts(products.data, phoneNumber);

    await this.whatsappService.updateSessionState(
      session.id,
      'PURCHASE_BROWSING',
      {},
    );
  }

  private async displayPurchasableProducts(products: any[], phoneNumber: string) {
    for (const product of products) {
      let message = `*${product.name}*\n\n`;
      message += `💰 ₹${product.discountedPrice}\n`;
      message += `📦 Stock: ${product.stockCount}\n`;

      if (product.images?.length) {
        await this.whatsappService.sendImageMessage(
          phoneNumber,
          product.images[0].url,
          message,
        );
      } else {
        await this.whatsappService.sendTextMessage(phoneNumber, message);
      }

      await this.whatsappService.sendInteractiveMessage(
        phoneNumber,
        'Choose an action:',
        [
          { id: `addcart_${product.id}_`, title: '➕ Add to Cart' },
          { id: 'viewcart', title: '🛒 View Cart' },
          { id: 'purchase_now', title: '✅ Purchase' },
        ],
      );
    }
  }


  private async startAddressSelection(session: any, phoneNumber: string) {
    const addresses = await this.prisma.address.findMany({
      where: { customerProfileId: session.customerProfile.id },
    });

    if (!addresses.length) {
      return this.startAddressCreation(session, phoneNumber);
    }

    await this.whatsappService.sendListMessage(
      phoneNumber,
      '📍 Select a delivery address:',
      'Choose Address',
      [{
        title: 'Saved Addresses',
        rows: addresses.map(a => ({
          id: `selectaddress_${a.id}`,
          title: a.name,
          description: `${a.city}, ${a.state} - ${a.postalCode}`,
        })),
      }],
    );

    await this.whatsappService.sendInteractiveMessage(
      phoneNumber,
      'Or add a new address:',
      [{ id: 'newaddress', title: '➕ Add New Address' }],
    );

    await this.whatsappService.updateSessionState(
      session.id,
      'PURCHASE_ADDRESS_SELECT',
      {},
    );
  }

  private async startAddressCreation(session: any, phoneNumber: string) {
    await this.whatsappService.sendTextMessage(
      phoneNumber,
      '📍 Enter Full Name:',
    );

    await this.whatsappService.updateSessionState(
      session.id,
      'PURCHASE_ADDRESS_CREATE',
      { step: 1, address: {} },
    );
  }

  private async handleAddressCreation(
    session: any,
    text: string,
    phoneNumber: string,
  ) {
    const ctx = session.contextData;

    switch (ctx.step) {
      case 1:
        ctx.address.name = text;
        ctx.step = 2;
        return this.whatsappService.sendTextMessage(phoneNumber, 'Address:');

      case 2:
        ctx.address.address = text;
        ctx.step = 3;
        return this.whatsappService.sendTextMessage(phoneNumber, 'City:');

      case 3:
        ctx.address.city = text;
        ctx.step = 4;
        return this.whatsappService.sendTextMessage(phoneNumber, 'State:');

      case 4:
        ctx.address.state = text;
        ctx.step = 5;
        return this.whatsappService.sendTextMessage(phoneNumber, 'Postal Code:');

      case 5:
        ctx.address.postalCode = text;
        ctx.address.country = 'India';

        const address = await this.addressService.create(
          ctx.address,
          session.customerProfile.userId,
        );

        return this.confirmPurchase(session, address.id, phoneNumber);
    }
  }

  private async confirmPurchase(
    session: any,
    addressId: string,
    phoneNumber: string,
  ) {
    const dto: CreatePaymentIntentDto = {
      useCart: true,
      ShippingAddressId: addressId,
      paymentMethod: PaymentMethod.cash_on_delivery,
      couponName: ''
    };

    const result = await this.razorpayservice.createOrder(
      dto,
      session.customerProfile.userId,
    );

    await this.whatsappService.sendTextMessage(
      phoneNumber,
      `🎉 *Order Confirmed!*\n\n🧾 Order ID: ${result.order.orderNumber}\n💰 Total: ₹${result.totalOrderAmount}`,
    );

    await this.whatsappService.updateSessionState(session.id, 'IDLE', {});
    await this.showMainMenu(phoneNumber);
  }


}