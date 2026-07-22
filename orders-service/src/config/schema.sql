CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(64) NOT NULL UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  items JSON NOT NULL,
  total_cents BIGINT NOT NULL,
  status ENUM('confirmed', 'failed') NOT NULL,
  failure_reason VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
