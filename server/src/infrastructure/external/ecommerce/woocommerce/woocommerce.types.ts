/**
 * WooCommerce REST API v3 Type Definitions
 *
 * TypeScript interfaces for WooCommerce API responses.
 * Follows WooCommerce REST API v3 schema.
 *
 * Reference: https://woocommerce.github.io/woocommerce-rest-api-docs/
 */

/**
 * WooCommerce Address
 * Used for billing and shipping addresses
 */
export interface WooCommerceAddress {
  first_name: string;
  last_name: string;
  company?: string;
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone?: string;
}

/**
 * WooCommerce Line Item
 * Represents a product in an order
 */
export interface WooCommerceLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  taxes: Array<{
    id: number;
    total: string;
    subtotal: string;
  }>;
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
    display_key?: string;
    display_value?: string;
  }>;
  sku: string;
  price: number;
  image?: {
    id: number;
    src: string;
  };
  parent_name?: string;
}

/**
 * WooCommerce Shipping Line
 * Represents shipping method and cost in an order
 */
export interface WooCommerceShippingLine {
  id: number;
  method_title: string;
  method_id: string;
  instance_id: string;
  total: string;
  total_tax: string;
  taxes: Array<{
    id: number;
    total: string;
  }>;
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
}

/**
 * WooCommerce Fee Line
 * Represents additional fees in an order
 */
export interface WooCommerceFeeLine {
  id: number;
  name: string;
  tax_class: string;
  tax_status: string;
  amount: string;
  total: string;
  total_tax: string;
  taxes: Array<{
    id: number;
    total: string;
    subtotal: string;
  }>;
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
}

/**
 * WooCommerce Coupon Line
 * Represents applied coupon in an order
 */
export interface WooCommerceCouponLine {
  id: number;
  code: string;
  discount: string;
  discount_tax: string;
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
}

/**
 * WooCommerce Refund Line
 * Represents a refund for an order
 */
export interface WooCommerceRefundLine {
  id: number;
  reason: string;
  total: string;
}

/**
 * WooCommerce Order
 * Main order object from WooCommerce API
 */
export interface WooCommerceOrder {
  id: number;
  parent_id: number;
  number: string;
  order_key: string;
  created_via: string;
  version: string;
  status: 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed' | 'trash';
  currency: string;
  date_created: string; // ISO 8601 format
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  prices_include_tax: boolean;
  customer_id: number;
  customer_ip_address: string;
  customer_user_agent: string;
  customer_note: string;
  billing: WooCommerceAddress;
  shipping: WooCommerceAddress;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  date_paid?: string;
  date_paid_gmt?: string;
  date_completed?: string;
  date_completed_gmt?: string;
  cart_hash: string;
  meta_data: Array<{
    id: number;
    key: string;
    value: any;
  }>;
  line_items: WooCommerceLineItem[];
  tax_lines: Array<{
    id: number;
    rate_code: string;
    rate_id: number;
    label: string;
    compound: boolean;
    tax_total: string;
    shipping_tax_total: string;
    rate_percent: number;
    meta_data: Array<{
      id: number;
      key: string;
      value: string;
    }>;
  }>;
  shipping_lines: WooCommerceShippingLine[];
  fee_lines: WooCommerceFeeLine[];
  coupon_lines: WooCommerceCouponLine[];
  refunds: WooCommerceRefundLine[];
  set_paid: boolean;
}

/**
 * WooCommerce Product Image
 */
export interface WooCommerceProductImage {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  src: string;
  name: string;
  alt: string;
}

/**
 * WooCommerce Product Category
 */
export interface WooCommerceProductCategory {
  id: number;
  name: string;
  slug: string;
}

/**
 * WooCommerce Product Tag
 */
export interface WooCommerceProductTag {
  id: number;
  name: string;
  slug: string;
}

/**
 * WooCommerce Product Attribute
 */
export interface WooCommerceProductAttribute {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
}

/**
 * WooCommerce Product Dimensions
 */
export interface WooCommerceProductDimensions {
  length: string;
  width: string;
  height: string;
}

/**
 * WooCommerce Product
 * Main product object from WooCommerce API
 */
export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  type: 'simple' | 'grouped' | 'external' | 'variable';
  status: 'draft' | 'pending' | 'private' | 'publish';
  featured: boolean;
  catalog_visibility: 'visible' | 'catalog' | 'search' | 'hidden';
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from?: string;
  date_on_sale_from_gmt?: string;
  date_on_sale_to?: string;
  date_on_sale_to_gmt?: string;
  price_html: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: Array<{
    id: string;
    name: string;
    file: string;
  }>;
  download_limit: number;
  download_expiry: number;
  external_url?: string;
  button_text?: string;
  tax_status: 'taxable' | 'shipping' | 'none';
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  backorders: 'no' | 'notify' | 'yes';
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: WooCommerceProductDimensions;
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: WooCommerceProductCategory[];
  tags: WooCommerceProductTag[];
  images: WooCommerceProductImage[];
  attributes: WooCommerceProductAttribute[];
  default_attributes: Array<{
    id: number;
    name: string;
    option: string;
  }>;
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  meta_data: Array<{
    id: number;
    key: string;
    value: any;
  }>;
}

/**
 * WooCommerce Product Variation
 * Represents a variant of a variable product
 */
export interface WooCommerceProductVariation {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  description: string;
  permalink: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from?: string;
  date_on_sale_from_gmt?: string;
  date_on_sale_to?: string;
  date_on_sale_to_gmt?: string;
  on_sale: boolean;
  status: 'draft' | 'pending' | 'private' | 'publish';
  purchasable: boolean;
  virtual: boolean;
  downloadable: boolean;
  downloads: Array<{
    id: string;
    name: string;
    file: string;
  }>;
  download_limit: number;
  download_expiry: number;
  tax_status: 'taxable' | 'shipping' | 'none';
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  backorders: 'no' | 'notify' | 'yes';
  backorders_allowed: boolean;
  backordered: boolean;
  weight: string;
  dimensions: WooCommerceProductDimensions;
  shipping_class: string;
  shipping_class_id: number;
  image: WooCommerceProductImage;
  attributes: Array<{
    id: number;
    name: string;
    option: string;
  }>;
  menu_order: number;
  meta_data: Array<{
    id: number;
    key: string;
    value: any;
  }>;
}

/**
 * WooCommerce Customer
 * Main customer object from WooCommerce API
 */
export interface WooCommerceCustomer {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  username: string;
  billing: WooCommerceAddress;
  shipping: WooCommerceAddress;
  is_paying_customer: boolean;
  avatar_url: string;
  meta_data: Array<{
    id: number;
    key: string;
    value: any;
  }>;
}

/**
 * WooCommerce Webhook
 * Webhook registration object
 */
export interface WooCommerceWebhook {
  id: number;
  name: string;
  status: 'active' | 'paused' | 'disabled';
  topic: string;
  resource: string;
  event: string;
  hooks: string[];
  delivery_url: string;
  secret: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
}

/**
 * WooCommerce System Status
 * System information from WooCommerce
 */
export interface WooCommerceSystemStatus {
  environment: {
    home_url: string;
    site_url: string;
    version: string;
    log_directory: string;
    log_directory_writable: boolean;
    wp_version: string;
    wp_multisite: boolean;
    wp_memory_limit: number;
    wp_debug_mode: boolean;
    wp_cron: boolean;
    language: string;
    external_object_cache: boolean;
    server_info: string;
    php_version: string;
    php_post_max_size: number;
    php_max_execution_time: number;
    php_max_input_vars: number;
    curl_version: string;
    suhosin_installed: boolean;
    max_upload_size: number;
    mysql_version: string;
    mysql_version_string: string;
    default_timezone: string;
    fsockopen_or_curl_enabled: boolean;
    soapclient_enabled: boolean;
    domdocument_enabled: boolean;
    gzip_enabled: boolean;
    mbstring_enabled: boolean;
    remote_post_successful: boolean;
    remote_post_response: string;
    remote_get_successful: boolean;
    remote_get_response: string;
  };
  database: {
    wc_database_version: string;
    database_prefix: string;
    maxmind_geoip_database: string;
    database_tables: Record<string, any>;
  };
  active_plugins: Array<{
    plugin: string;
    name: string;
    version: string;
    version_latest: string;
    url: string;
    author_name: string;
    author_url: string;
    network_activated: boolean;
  }>;
  theme: {
    name: string;
    version: string;
    version_latest: string;
    author_url: string;
    is_child_theme: boolean;
    has_woocommerce_support: boolean;
    has_woocommerce_file: boolean;
    has_outdated_templates: boolean;
    overrides: string[];
    parent_name: string;
    parent_version: string;
    parent_author_url: string;
  };
  settings: {
    api_enabled: boolean;
    force_ssl: boolean;
    currency: string;
    currency_symbol: string;
    currency_position: string;
    thousand_separator: string;
    decimal_separator: string;
    number_of_decimals: number;
    geolocation_enabled: boolean;
    taxonomies: Record<string, any>;
    product_visibility_terms: Record<string, any>;
  };
  security: {
    secure_connection: boolean;
    hide_errors: boolean;
  };
  pages: Array<{
    page_name: string;
    page_id: string;
    page_set: boolean;
    page_exists: boolean;
    page_visible: boolean;
    shortcode: string;
    shortcode_required: boolean;
    shortcode_present: boolean;
  }>;
}

/**
 * WooCommerce Batch Operation
 * For batch create/update/delete operations
 */
export interface WooCommerceBatchOperation<T> {
  create?: T[];
  update?: T[];
  delete?: number[];
}

/**
 * WooCommerce Batch Response
 * Response from batch operations
 */
export interface WooCommerceBatchResponse<T> {
  create?: T[];
  update?: T[];
  delete?: T[];
}

/**
 * WooCommerce API Error
 * Standard error response from WooCommerce API
 */
export interface WooCommerceError {
  code: string;
  message: string;
  data: {
    status: number;
    params?: Record<string, any>;
    details?: Record<string, any>;
  };
}

/**
 * WooCommerce Pagination Headers
 * Headers returned with paginated responses
 */
export interface WooCommercePaginationHeaders {
  'x-wp-total': string; // Total number of items
  'x-wp-totalpages': string; // Total number of pages
  link?: string; // Link header with next/prev URLs
}

// Note: All types are exported individually as named exports above
// No default export needed as this is a types-only file
