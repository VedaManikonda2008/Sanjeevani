CREATE DATABASE IF NOT EXISTS sanjeevani_db;
USE sanjeevani_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(10) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diet_profiles (
  user_key VARCHAR(255) PRIMARY KEY,
  profile_json JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diet_plans (
  plan_id CHAR(36) PRIMARY KEY,
  user_key VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  plan_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_diet_plans_user_created (user_key, created_at)
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  image VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  uses TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, image, price, original_price, category, uses) VALUES
  ('Triphala', 'Triphala.jpg', 200.00, 200.00, 'general', 'Supports healthy digestion and gentle cleansing.'),
  ('Ashwagandha', 'Ashwaghandha.webp', 150.00, 150.00, 'general', 'Traditionally used for stress management, energy, and restful sleep.'),
  ('Athimadhuram', 'Athimadhuram.jfif', 200.00, 200.00, 'general', 'Traditionally used to soothe the throat and support digestion.'),
  ('Manjista', 'Manjistha.webp', 250.00, 250.00, 'face', 'Traditionally used to support healthy-looking skin.'),
  ('Jaiphal / Nutmeg', 'Jaiphal.png', 700.00, 700.00, 'general', 'Traditionally used for comfortable digestion and relaxation.'),
  ('Inknut', 'karakkaya.jpg', 200.00, 200.00, 'general', 'Traditionally used to support healthy digestion.'),
  ('Turmeric', 'Turmeric.webp', 280.00, 280.00, 'face', 'Provides antioxidant support and is used in wellness drinks.'),
  ('Tinospora', 'Tinospora.webp', 260.00, 260.00, 'general', 'Traditionally used to support immune wellness and vitality.'),
  ('Neem', 'neem.webp', 150.00, 150.00, 'general', 'Traditionally used in personal care to support healthy skin.'),
  ('Saffron', 'saffron.jpg', 300000.00, 300000.00, 'pregnancy', 'Adds natural flavor and color and is traditionally used for relaxation.'),
  ('Kasturi And Gorojan', 'kasturi and gorojanam.jfif', 40.00, 40.00, 'pregnancy', 'Used in aromatic wellness preparations and personal care blends.'),
  ('Ajwan', 'vamu.jfif', 200.00, 200.00, 'pregnancy', 'Traditionally used to support digestion.'),
  ('Vacha', 'vacha.webp', 800.00, 800.00, 'pregnancy', 'Traditionally used for throat and voice wellness.'),
  ('Pippallu', 'pippallu.jfif', 2300.00, 2300.00, 'pregnancy', 'Traditionally used to support respiratory wellness.'),
  ('Modi', 'modi.png', 200.00, 200.00, 'pregnancy', 'Used in traditional herbal preparations.'),
  ('Shunti', 'shunti.webp', 200.00, 200.00, 'pregnancy', 'Traditionally used to support digestion and provide warming comfort.'),
  ('Pepper', 'pepper.jfif', 1000.00, 1000.00, 'pregnancy', 'Supports comfortable digestion and adds natural warmth.'),
  ('Hing', 'hing.jfif', 40.00, 40.00, 'pregnancy', 'Traditionally used to support digestion and add savory flavor.'),
  ('Karunalu/Halim Seeds', 'adiyalu.jpeg', 1000.00, 1000.00, 'pains', 'Traditionally used in nourishing recipes and everyday wellness preparations.'),
  ('Badam Goondh', 'badam goondh.png', 1000.00, 1000.00, 'sugar', 'Traditionally used in nourishing preparations and drinks.'),
  ('Chia', 'chia.jpg', 1000.00, 1000.00, 'general', 'Can be added to drinks and breakfast recipes.'),
  ('Dhoomraasmi/Thai Ginger', 'dumparastram.jpg', 1000.00, 1000.00, 'general', 'Provides warming comfort and supports comfortable digestion.'),
  ('Flex Seeds', 'flexseeds.jpg', 1000.00, 1000.00, 'cancer', 'Can be added to breakfast recipes and provides plant-based fiber.'),
  ('Rosary pea,Gulaganji', 'guriginja.jpg', 1000.00, 1000.00, 'pains', 'Used in traditional preparations; store and handle with care.'),
  ('Kadwa Badam', 'kadwa badam.jpg', 1000.00, 1000.00, 'sugar', 'Used in traditional herbal preparations.'),
  ('Kadwa Jau', 'kadwa jau.png', 1000.00, 1000.00, 'sugar', 'Used in traditional grain preparations and nourishing recipes.'),
  ('Kalonji', 'kalonji.jpg', 1000.00, 1000.00, 'general', 'Adds a peppery flavor to recipes and wellness preparations.'),
  ('Kasturi Turmeric Kombu', 'kasthuri.webp', 1000.00, 1000.00, 'face', 'Traditionally used in personal care and herbal preparations.'),
  ('Fenugreek', 'menthi.webp', 1000.00, 1000.00, 'general', 'Traditionally used to support digestion and in nourishing preparations.'),
  ('Black Cumin Seeds/Kari Jeerige', 'nalla jeera.webp', 1000.00, 1000.00, 'sugar', 'Adds a warm, earthy flavor and is used in wellness preparations.'),
  ('Pacha Karpura', 'pacha karpuram.jpg', 1000.00, 1000.00, 'pains', 'Used in aromatic preparations and traditional personal care.'),
  ('Himlayna Pink Salt', 'pink salt.webp', 1000.00, 1000.00, 'general', 'Adds natural flavor to meals and wellness recipes.'),
  ('Menthol', 'pudina puvu.jfif', 1000.00, 1000.00, 'pains', 'Provides a cooling aroma and freshness to aromatic blends.'),
  ('Sabja Seeds', 'sabja.avif', 1000.00, 1000.00, 'general', 'Can be soaked for drinks and provides plant-based fiber.'),
  ('Ajwain Flower/Oma Hoovu', 'vamu puvvu.jpg', 1000.00, 1000.00, 'pains', 'Adds a warm herbal aroma to traditional recipes.'),
  ('Dry Amla', 'Dry amla.jfif', 1000.00, 1000.00, 'general', 'Traditionally used to support digestion and herbal drinks.');
