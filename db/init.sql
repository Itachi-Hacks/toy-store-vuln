-- ============================================================
-- ToyStore VulnLab – PostgreSQL Database Schema
-- Intentionally Vulnerable for Security Testing
-- ============================================================

-- ──────────────────────────────────
-- 1. Users Table
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL      PRIMARY KEY,
    username    VARCHAR(64) UNIQUE  NOT NULL,
    email       VARCHAR(128) UNIQUE NOT NULL,
    password_md5 VARCHAR(32)        NOT NULL,   -- MD5 (intentionally weak)
    full_name   VARCHAR(128),
    address     TEXT,
    phone       VARCHAR(20),
    role        VARCHAR(16)        NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
    created_at  TIMESTAMP          NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────
-- 2. Sessions Table
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id          SERIAL      PRIMARY KEY,
    user_id     INT         REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(128) UNIQUE NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMP   NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

-- ──────────────────────────────────
-- 3. Products (Toys)
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id          SERIAL      PRIMARY KEY,
    name        VARCHAR(128) NOT NULL,
    description TEXT,
    price       NUMERIC(10,2) NOT NULL DEFAULT 0,
    category    VARCHAR(64),
    age_range   VARCHAR(32),
    brand       VARCHAR(64),
    stock       INT         NOT NULL DEFAULT 100,
    image_url   VARCHAR(256),
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────
-- 4. Shopping Cart
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
    id          SERIAL      PRIMARY KEY,
    user_id     INT         REFERENCES users(id) ON DELETE CASCADE,
    product_id  INT         REFERENCES products(id) ON DELETE CASCADE,
    quantity    INT         NOT NULL DEFAULT 1,
    added_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- ──────────────────────────────────
-- 5. Orders
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id          SERIAL      PRIMARY KEY,
    user_id     INT         REFERENCES users(id) ON DELETE CASCADE,
    total       NUMERIC(10,2) NOT NULL DEFAULT 0,
    status      VARCHAR(32) NOT NULL DEFAULT 'pending',  -- pending | processing | shipped | delivered
    shipping_address TEXT,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────
-- 6. Order Items
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
    id          SERIAL      PRIMARY KEY,
    order_id    INT         REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INT         REFERENCES products(id),
    quantity    INT         NOT NULL DEFAULT 1,
    price       NUMERIC(10,2) NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────
-- 7. Payments
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id          SERIAL      PRIMARY KEY,
    order_id    INT         REFERENCES orders(id) ON DELETE CASCADE,
    amount      NUMERIC(10,2) NOT NULL,
    card_number VARCHAR(16),    -- stored in plain text (vulnerability)
    card_holder VARCHAR(128),
    cvv         VARCHAR(4),     -- stored in plain text (vulnerability)
    expiry_date VARCHAR(5),     -- stored in plain text (vulnerability)
    billing_zip VARCHAR(10),    -- stored in plain text
    method      VARCHAR(32) NOT NULL DEFAULT 'card',     -- card | paypal | crypto
    status      VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────
-- 8. Reviews (XSS target)
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id          SERIAL      PRIMARY KEY,
    user_id     INT         REFERENCES users(id) ON DELETE CASCADE,
    product_id  INT         REFERENCES products(id),
    rating      INT         CHECK (rating BETWEEN 1 AND 5),
    title       VARCHAR(128),
    comment     TEXT,       -- stored WITHOUT sanitization
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────
-- 9. Audit Logs (incomplete logging)
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id          SERIAL      PRIMARY KEY,
    event_type  VARCHAR(64),
    user_id     INT,
    details     TEXT,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────
-- 10. Wishlist
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist (
    id          SERIAL      PRIMARY KEY,
    user_id     INT         REFERENCES users(id) ON DELETE CASCADE,
    product_id  INT         REFERENCES products(id) ON DELETE CASCADE,
    added_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- ── Default Users ──
-- Password: user12 → MD5: d781eaae8248db6ce1a7b82e58e60435
-- Password: admin1 → MD5: e00cf25ad42683b3df678c61f42c6bda
-- Password: test12 → MD5: 60474c9c10d7142b7508ce7a50acf414
-- Password: buyer1 → MD5: 6512bd43d9caa6e02c990b0a82652dca (11)

INSERT INTO users (username, email, password_md5, full_name, address, phone, role)
VALUES
    ('user',  'user@toystore.local',  'd781eaae8248db6ce1a7b82e58e60435', 'John Doe', '123 Main St, New York, NY 10001', '555-0100', 'user'),
    ('admin', 'admin@toystore.local', 'e00cf25ad42683b3df678c61f42c6bda', 'Admin User', '456 Admin Ave, Los Angeles, CA 90001', '555-0200', 'admin'),
    ('test',  'test@toystore.local',  '60474c9c10d7142b7508ce7a50acf414', 'Test User', '789 Test Blvd, Chicago, IL 60601', '555-0300', 'user'),
    ('buyer', 'buyer@toystore.local', '6512bd43d9caa6e02c990b0a82652dca', 'Jane Smith', '321 Buyer Rd, Houston, TX 77001', '555-0400', 'user')
ON CONFLICT (username) DO NOTHING;

-- ── Toy Products (20 items with images) ──
INSERT INTO products (name, description, price, category, age_range, brand, stock, image_url)
VALUES
    ('LEGO Star Wars Millennium Falcon', 'Build the iconic Millennium Falcon with 1351 pieces. Perfect for Star Wars fans!', 159.99, 'Building Toys', '9-14 years', 'LEGO', 50, 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400'),
    ('Barbie Dreamhouse', 'Three-story dreamhouse with pool, slide, and elevator. Includes furniture and accessories.', 199.99, 'Dolls', '3-10 years', 'Barbie', 35, 'https://images.unsplash.com/photo-1559294735-90f939b5f7db?w=400'),
    ('Hot Wheels Ultimate Garage', 'Multi-level garage with a menacing gorilla and space for over 140 cars!', 129.99, 'Vehicles', '5-12 years', 'Hot Wheels', 45, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'),
    ('Nerf Elite 2.0 Commander Blaster', 'Motorized blaster with 6-dart rotating drum. Includes 12 Official Nerf darts.', 39.99, 'Action Toys', '8+ years', 'Nerf', 80, 'https://images.unsplash.com/photo-1572297794397-1e0b5c6e1fc3?w=400'),
    ('Nintendo Switch OLED', 'Gaming console with vibrant 7-inch OLED screen. Play at home or on the go!', 349.99, 'Electronics', '6+ years', 'Nintendo', 25, 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400'),
    ('Melissa & Doug Wooden Building Blocks', '100-piece set of colorful wooden blocks in various shapes and sizes.', 24.99, 'Building Toys', '3-8 years', 'Melissa & Doug', 100, 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400'),
    ('Play-Doh Super Color Pack', '20-pack of non-toxic modeling compound in vibrant colors. Endless creative fun!', 14.99, 'Arts & Crafts', '2+ years', 'Play-Doh', 150, 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=400'),
    ('Fisher-Price Laugh & Learn Smart Stages Chair', 'Interactive learning chair with 50+ songs, tunes, and phrases.', 44.99, 'Educational', '1-3 years', 'Fisher-Price', 60, 'https://images.unsplash.com/photo-1567696153798-96f9d75a4c d3?w=400'),
    ('Monopoly Classic Board Game', 'The classic real estate trading game. Buy, sell, dream, and scheme your way to riches!', 29.99, 'Board Games', '8+ years', 'Hasbro', 70, 'https://images.unsplash.com/photo-1611891487603-3c5e1be43715?w=400'),
    ('Rubiks Cube 3x3', 'The original 3x3 cube puzzle. Over 43 quintillion possible combinations!', 12.99, 'Puzzles', '8+ years', 'Rubiks', 120, 'https://images.unsplash.com/photo-1591991731833-b1a8b8c8f9a9?w=400'),
    ('Baby Einstein Octoplush Plush Toy', 'Soft plush octopus that plays classical melodies. Perfect for babies!', 19.99, 'Plush Toys', '0-3 years', 'Baby Einstein', 90, 'https://images.unsplash.com/photo-1555228894-e0e3e0f4e690?w=400'),
    ('Razor A Kick Scooter', 'Original aluminum scooter with lightweight frame and foldable design.', 59.99, 'Outdoor Toys', '5+ years', 'Razor', 40, 'https://images.unsplash.com/photo-1598300188706-344e9d20f847?w=400'),
    ('Crayola Ultimate Crayon Collection', '152 crayons in a storage case with built-in sharpener. Every color imaginable!', 24.99, 'Arts & Crafts', '4+ years', 'Crayola', 85, 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400'),
    ('Pokémon Trading Card Game Booster Pack', 'Collect, trade, and battle with 10 random cards per pack!', 4.99, 'Collectibles', '6+ years', 'Pokémon', 200, 'https://images.unsplash.com/photo-1606660265514-358ebbadc80d?w=400'),
    ('VTech KidiZoom Camera Pix', 'Digital camera for kids with fun photo effects, games, and 4x zoom.', 49.99, 'Electronics', '4-12 years', 'VTech', 55, 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400'),
    ('Magic: The Gathering Starter Kit', 'Learn to play the worlds best strategy card game. Includes 2 decks.', 19.99, 'Collectibles', '13+ years', 'Wizards of the Coast', 75, 'https://images.unsplash.com/photo-1612404730960-5c71577fca11?w=400'),
    ('Little Tikes Cozy Coupe', 'Classic ride-on car with working door, ignition switch, and gas cap.', 79.99, 'Ride-Ons', '18m-5 years', 'Little Tikes', 30, 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400'),
    ('Jenga Classic Game', 'The original wood block stacking game. How high can you stack before it tumbles?', 16.99, 'Board Games', '6+ years', 'Hasbro', 95, 'https://images.unsplash.com/photo-1606503153255-59d440e1b4c2?w=400'),
    ('Hatchimals Mystery Egg', 'Nurture and hatch your own Hatchimal! Who will you hatch?', 59.99, 'Electronic Toys', '5-10 years', 'Hatchimals', 42, 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=400'),
    ('LEGO Classic Medium Creative Brick Box', '484 pieces in 35 vibrant colors. Build anything you can imagine!', 34.99, 'Building Toys', '4-99 years', 'LEGO', 65, 'https://images.unsplash.com/photo-1558618047-8f3eb8a9d2e9?w=400')
ON CONFLICT DO NOTHING;

-- ── Sample Reviews (including XSS payloads) ──
INSERT INTO reviews (user_id, product_id, rating, title, comment)
VALUES
    (1, 1, 5, 'Amazing LEGO Set!', 'My son absolutely loves this Millennium Falcon set. The details are incredible and it was fun to build together.'),
    (3, 2, 5, 'Dream come true!', 'My daughter plays with this every day. The elevator actually works and it has so many rooms to explore!'),
    (4, 5, 4, 'Great console', 'The OLED screen is beautiful. Battery life could be better but overall amazing gaming experience.'),
    (1, 9, 5, 'Classic fun', 'Monopoly never gets old. Great family game night entertainment!'),
    (3, 12, 4, 'Sturdy scooter', 'My kid rides this every day. Very durable and folds up nicely for storage.')
ON CONFLICT DO NOTHING;

-- ── Sample Orders ──
INSERT INTO orders (user_id, total, status, shipping_address)
VALUES
    (1, 159.99, 'delivered', '123 Main St, New York, NY 10001'),
    (4, 229.98, 'shipped', '321 Buyer Rd, Houston, TX 77001'),
    (3, 44.99, 'processing', '789 Test Blvd, Chicago, IL 60601')
ON CONFLICT DO NOTHING;

-- ── Sample Order Items ──
INSERT INTO order_items (order_id, product_id, quantity, price)
VALUES
    (1, 1, 1, 159.99),
    (2, 2, 1, 199.99),
    (2, 6, 1, 29.99),
    (3, 8, 1, 44.99)
ON CONFLICT DO NOTHING;

-- ── Sample Payments (with vulnerable data storage) ──
INSERT INTO payments (order_id, amount, card_number, card_holder, cvv, expiry_date, billing_zip, method, status)
VALUES
    (1, 159.99, '4532123456789012', 'John Doe', '123', '12/25', '10001', 'card', 'completed'),
    (2, 229.98, '5425233430109903', 'Jane Smith', '456', '06/26', '77001', 'card', 'completed')
ON CONFLICT DO NOTHING;

-- ── Sample Cart Items ──
INSERT INTO cart_items (user_id, product_id, quantity)
VALUES
    (1, 5, 1),
    (1, 10, 2),
    (4, 3, 1)
ON CONFLICT DO NOTHING;

-- ── Sample Wishlist ──
INSERT INTO wishlist (user_id, product_id)
VALUES
    (1, 4),
    (1, 7),
    (4, 1),
    (4, 5)
ON CONFLICT DO NOTHING;

-- ── Audit Logs (intentionally sparse) ──
INSERT INTO audit_logs (event_type, user_id, details, ip_address)
VALUES
    ('login', 1, 'User logged in successfully', '192.168.1.100'),
    ('login', 2, 'Admin logged in successfully', '192.168.1.101'),
    ('purchase', 1, 'Order #1 placed', '192.168.1.100')
ON CONFLICT DO NOTHING;
