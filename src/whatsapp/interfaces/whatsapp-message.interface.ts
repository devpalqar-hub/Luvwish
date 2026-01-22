export interface WhatsAppTextMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: {
    preview_url?: boolean;
    body: string;
  };
}

export interface WhatsAppImageMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'image';
  image: {
    link: string;
    caption?: string;
  };
}

export interface WhatsAppInteractiveMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'button' | 'list';
    header?: {
      type: 'text' | 'image';
      text?: string;
      image?: {
        link: string;
      };
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: InteractiveAction;
  };
}

export interface InteractiveAction {
  buttons?: InteractiveButton[];
  button?: string;
  sections?: InteractiveSection[];
}

export interface InteractiveButton {
  type: 'reply';
  reply: {
    id: string;
    title: string;
  };
}

export interface InteractiveSection {
  title: string;
  rows: InteractiveSectionRow[];
}

export interface InteractiveSectionRow {
  id: string;
  title: string;
  description?: string;
}

export enum SessionState {
  IDLE = 'IDLE',
  BROWSING_CATEGORIES = 'BROWSING_CATEGORIES',
  BROWSING_PRODUCTS = 'BROWSING_PRODUCTS',
  SELECTING_VARIATION = 'SELECTING_VARIATION',
  VIEWING_CART = 'VIEWING_CART',
  ENTERING_ADDRESS = 'ENTERING_ADDRESS',
  CONFIRMING_ORDER = 'CONFIRMING_ORDER',
}

export interface SessionContext {
  categoryId?: string;
  subCategoryId?: string;
  productId?: string;
  productVariationId?: string;
  searchQuery?: string;
  addressStep?: number;
  addressId?: string;
  addressData?: Partial<AddressData>;
  selectedProducts?: SelectedProduct[];
}

export interface AddressData {
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  landmark?: string;
  country: string;
  phone: string;
}

export interface SelectedProduct {
  productId: string;
  productVariationId?: string;
  quantity: number;
}
