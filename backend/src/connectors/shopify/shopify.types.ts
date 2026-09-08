/**
 * Shopify Admin REST API types for products, variants, and orders.
 * Reference: https://shopify.dev/docs/api/admin-rest/2024-01/resources/product
 */

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku: string | null;
  position: number;
  inventory_policy?: string;
  compare_at_price?: string | null;
  fulfillment_service?: string;
  inventory_management?: string | null;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  created_at?: string;
  updated_at?: string;
  taxable?: boolean;
  barcode?: string | null;
  grams?: number;
  image_id?: number | null;
  weight?: number;
  weight_unit?: string;
  inventory_item_id?: number;
  inventory_quantity: number;
  old_inventory_quantity?: number;
  requires_shipping?: boolean;
  admin_graphql_api_id?: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html?: string | null;
  vendor?: string;
  product_type?: string;
  created_at?: string;
  handle?: string;
  updated_at: string;
  published_at?: string | null;
  template_suffix?: string | null;
  status: string;
  published_scope?: string;
  tags?: string;
  admin_graphql_api_id?: string;
  variants: ShopifyVariant[];
  options?: Array<{
    id: number;
    product_id: number;
    name: string;
    position: number;
    values: string[];
  }>;
  images?: Array<{
    id: number;
    product_id: number;
    position: number;
    src: string;
  }>;
}

export interface ShopifyLineItem {
  id: number;
  variant_id: number | null;
  title: string;
  quantity: number;
  sku: string | null;
  variant_title?: string | null;
  vendor?: string | null;
  fulfillment_service?: string;
  product_id: number | null;
  requires_shipping?: boolean;
  taxable?: boolean;
  gift_card?: boolean;
  name?: string;
  variant_inventory_management?: string | null;
  properties?: Array<{ name: string; value: string }>;
  product_exists?: boolean;
  fulfillable_quantity?: number;
  grams?: number;
  price: string;
  total_discount?: string;
  fulfillment_status?: string | null;
  admin_graphql_api_id?: string;
}

export interface ShopifyOrder {
  id: number;
  admin_graphql_api_id?: string;
  browser_ip?: string | null;
  buyer_accepts_marketing?: boolean;
  cancel_reason?: string | null;
  cancelled_at?: string | null;
  cart_token?: string | null;
  checkout_id?: number | null;
  checkout_token?: string | null;
  closed_at?: string | null;
  confirmed?: boolean;
  contact_email?: string | null;
  created_at: string;
  currency?: string;
  current_subtotal_price?: string;
  current_total_discounts?: string;
  current_total_price?: string;
  current_total_tax?: string;
  email?: string;
  financial_status?: string;
  line_items: ShopifyLineItem[];
  order_number?: number;
  processed_at?: string;
  subtotal_price?: string;
  total_discounts?: string;
  total_line_items_price?: string;
  total_outstanding?: string;
  total_price?: string;
  total_tax?: string;
  updated_at?: string;
}

export interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

export interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}
