-- YEAR INFO AI: Production Relational PostgreSQL Database Schema
-- Version: 1.0.0
-- Dialect: PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & PROFILES
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'agent', 'superadmin')),
    is_superadmin BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. WORKSPACES (Multi-Tenant Isolation)
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_type VARCHAR(100) DEFAULT 'retail',
    phone VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'BDT',
    timezone VARCHAR(50) DEFAULT 'Asia/Dhaka',
    language VARCHAR(10) DEFAULT 'both' CHECK (language IN ('bn', 'en', 'both')),
    address TEXT,
    website VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'agent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workspace_id, user_id)
);

-- 3. CONNECTED CHANNELS
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('facebook', 'messenger', 'instagram', 'whatsapp', 'livechat')),
    name VARCHAR(255) NOT NULL,
    account_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending_setup' CHECK (status IN ('connected', 'disconnected', 'needs_reauth', 'pending_setup')),
    credentials_encrypted JSONB,
    metadata JSONB DEFAULT '{}',
    connected_at TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_channels_workspace ON channels(workspace_id);

-- 4. CUSTOMERS & CHANNEL IDENTITIES
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    primary_channel VARCHAR(50) NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC(12, 2) DEFAULT 0.00,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_workspace ON customers(workspace_id);

CREATE TABLE IF NOT EXISTS customer_channel_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_type VARCHAR(50) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workspace_id, channel_type, external_id)
);

-- 5. CONVERSATIONS & MESSAGING (Central Unified Inbox)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    channel_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'unread' CHECK (status IN ('open', 'unread', 'assigned', 'ai_handled', 'human_handled', 'resolved')),
    unread_count INTEGER DEFAULT 0,
    last_message_text TEXT DEFAULT '',
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    ai_active BOOLEAN DEFAULT TRUE,
    ai_handoff_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_workspace_status ON conversations(workspace_id, status);
CREATE INDEX idx_conversations_last_message ON conversations(workspace_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('customer', 'agent', 'ai')),
    sender_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    delivery_status VARCHAR(50) DEFAULT 'delivered' CHECK (delivery_status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
    ai_assisted BOOLEAN DEFAULT FALSE,
    external_message_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS internal_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. PRODUCTS & INVENTORY
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_bengali VARCHAR(255),
    sku VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    discount_price NUMERIC(10, 2) CHECK (discount_price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    images TEXT[] DEFAULT '{}',
    variants JSONB DEFAULT '[]',
    available BOOLEAN DEFAULT TRUE,
    shipping_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_workspace ON products(workspace_id);

-- 7. ORDERS & CHECKOUT
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    delivery_address TEXT NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    delivery_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method VARCHAR(50) DEFAULT 'cash_on_delivery',
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    ai_assisted BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_workspace ON orders(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    variant_id VARCHAR(100),
    variant_name VARCHAR(255),
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(10, 2) NOT NULL
);

-- 8. AI SALES AGENT CONFIGURATION & KNOWLEDGE BASE
CREATE TABLE IF NOT EXISTS ai_settings (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    model VARCHAR(100) DEFAULT 'gemini-3.8-flash',
    brand_voice VARCHAR(50) DEFAULT 'friendly',
    language_mode VARCHAR(50) DEFAULT 'auto_detect',
    auto_reply_channels TEXT[] DEFAULT ARRAY['messenger', 'instagram', 'livechat'],
    business_hours_only BOOLEAN DEFAULT FALSE,
    business_hours_start VARCHAR(10) DEFAULT '09:00',
    business_hours_end VARCHAR(10) DEFAULT '22:00',
    human_takeover_keywords TEXT[] DEFAULT ARRAY['human', 'agent', 'support', 'manush', 'kotha bolbo'],
    confidence_threshold NUMERIC(3, 2) DEFAULT 0.75,
    enable_direct_order_creation BOOLEAN DEFAULT TRUE,
    custom_greeting_bn TEXT DEFAULT 'আসসালামু আলাইকুম! YEAR INFO AI অ্যাসিস্ট্যান্ট আপনাকে কিভাবে সাহায্য করতে পারে?',
    custom_greeting_en TEXT DEFAULT 'Hello! How can I help you today?',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('policy', 'faq', 'delivery', 'payment', 'general')),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'both',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_knowledge_workspace ON knowledge_items(workspace_id);

CREATE TABLE IF NOT EXISTS ai_usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    model VARCHAR(100) NOT NULL,
    tokens_used INTEGER NOT NULL,
    estimated_cost_usd NUMERIC(8, 6) NOT NULL,
    success BOOLEAN DEFAULT TRUE,
    query_snippet TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_usage_workspace ON ai_usage_records(workspace_id, created_at DESC);

-- 9. SOCIAL MEDIA POST SCHEDULER & WHATSAPP
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platforms TEXT[] NOT NULL,
    caption TEXT NOT NULL,
    hashtags TEXT[] DEFAULT '{}',
    media_urls TEXT[] DEFAULT '{}',
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Asia/Dhaka',
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
    external_post_ids JSONB DEFAULT '[]',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scheduled_posts_queue ON scheduled_posts(status, scheduled_at ASC);

CREATE TABLE IF NOT EXISTS scheduled_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    channel VARCHAR(50) DEFAULT 'whatsapp',
    recipient_phone VARCHAR(50) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    template_name VARCHAR(100),
    message_content TEXT NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sending', 'sent', 'failed', 'cancelled')),
    consent_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. SUBSCRIPTIONS & OWNER BILLING
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_bdt NUMERIC(10, 2) NOT NULL,
    price_usd NUMERIC(10, 2) NOT NULL,
    interval VARCHAR(20) DEFAULT 'monthly',
    max_channels INTEGER DEFAULT 3,
    max_conversations_monthly INTEGER DEFAULT 1000,
    ai_replies_monthly INTEGER DEFAULT 500,
    max_scheduled_posts INTEGER DEFAULT 50,
    features TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'expired', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. AI PROVIDERS CONFIGURATION
CREATE TABLE IF NOT EXISTS ai_providers (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider_type VARCHAR(50) NOT NULL,
    api_endpoint TEXT,
    model VARCHAR(100) NOT NULL,
    api_key_masked VARCHAR(50),
    is_configured BOOLEAN DEFAULT FALSE,
    is_enabled BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    is_fallback BOOLEAN DEFAULT FALSE,
    last_test_status VARCHAR(50) DEFAULT 'untested',
    last_tested_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    total_requests INTEGER DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. GLOBAL INTEGRATIONS
CREATE TABLE IF NOT EXISTS global_integrations (
    id VARCHAR(100) PRIMARY KEY,
    service_key VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'unconfigured',
    is_enabled BOOLEAN DEFAULT TRUE,
    masked_fingerprint VARCHAR(100),
    last_tested_at TIMESTAMP WITH TIME ZONE,
    last_test_status VARCHAR(50) DEFAULT 'untested',
    last_error TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. WEBSITE BRANDING SETTINGS
CREATE TABLE IF NOT EXISTS website_branding (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'global_branding',
    site_name VARCHAR(255) NOT NULL DEFAULT 'YEAR INFO AI',
    tagline TEXT,
    logo_url TEXT,
    favicon_url TEXT,
    landing_headline TEXT,
    landing_description TEXT,
    support_email VARCHAR(255),
    support_phone VARCHAR(50),
    company_name VARCHAR(255),
    company_address TEXT,
    trade_license_number VARCHAR(100),
    footer_text TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    default_language VARCHAR(20) DEFAULT 'both',
    default_timezone VARCHAR(50) DEFAULT 'Asia/Dhaka',
    default_theme VARCHAR(20) DEFAULT 'dark',
    show_public_pricing BOOLEAN DEFAULT TRUE,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    maintenance_notice TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. DOMAIN & DEPLOYMENT CONFIGURATION
CREATE TABLE IF NOT EXISTS domain_deployment (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'global_domain',
    canonical_url TEXT NOT NULL,
    desired_custom_domain VARCHAR(255),
    preferred_host VARCHAR(20) DEFAULT 'apex',
    verification_token VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    ssl_status VARCHAR(50) DEFAULT 'pending',
    allowed_origins JSONB DEFAULT '[]'::jsonb,
    dns_records_required JSONB DEFAULT '[]'::jsonb,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    last_check_error TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. PLATFORM FEATURE FLAGS
CREATE TABLE IF NOT EXISTS platform_feature_flags (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'global_features',
    ai_sales_agent BOOLEAN DEFAULT TRUE,
    ai_model_selection BOOLEAN DEFAULT TRUE,
    facebook_connection BOOLEAN DEFAULT TRUE,
    messenger_messaging BOOLEAN DEFAULT TRUE,
    instagram_messaging BOOLEAN DEFAULT TRUE,
    facebook_publishing BOOLEAN DEFAULT TRUE,
    instagram_publishing BOOLEAN DEFAULT TRUE,
    whatsapp_messaging BOOLEAN DEFAULT TRUE,
    website_live_chat BOOLEAN DEFAULT TRUE,
    product_catalog BOOLEAN DEFAULT TRUE,
    order_management BOOLEAN DEFAULT TRUE,
    post_scheduler BOOLEAN DEFAULT TRUE,
    subscription_billing BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. PAYMENT RECORDS
CREATE TABLE IF NOT EXISTS payment_records (
    id VARCHAR(100) PRIMARY KEY,
    subscription_id VARCHAR(100),
    workspace_id VARCHAR(100),
    workspace_name VARCHAR(255),
    amount_bdt NUMERIC(12, 2) NOT NULL,
    amount_usd NUMERIC(10, 2),
    method VARCHAR(50) NOT NULL,
    transaction_reference VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'verified',
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. ADMIN NOTIFICATIONS
CREATE TABLE IF NOT EXISTS admin_notifications (
    id VARCHAR(100) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    target_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
