-- Xolair MMP 填寫紀錄彙整網站 資料庫結構

CREATE TABLE IF NOT EXISTS psrs (
  code VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(50) PRIMARY KEY,
  password_hash VARCHAR(255) NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'psr')),
  display_name VARCHAR(100) NOT NULL,
  psr_code VARCHAR(20) REFERENCES psrs(code),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  psr_code VARCHAR(20) NOT NULL REFERENCES psrs(code),
  specialty VARCHAR(100),
  tiering VARCHAR(20),
  customer_code VARCHAR(30) NOT NULL,
  customer_name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  title VARCHAR(100),
  UNIQUE (psr_code, customer_code, contact_name)
);

CREATE TABLE IF NOT EXISTS options (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  value VARCHAR(100) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (category, value)
);

-- 每位業代針對每位 HCP 維護一筆持續更新的紀錄（非逐次拜訪日誌）
CREATE TABLE IF NOT EXISTS records (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  psr_code VARCHAR(20) NOT NULL REFERENCES psrs(code),
  team VARCHAR(100),
  customer_tier VARCHAR(20),
  hcp_tier VARCHAR(20),
  customer_relationship VARCHAR(50),
  adoption_ladder VARCHAR(50),
  monthly_patient_volume INTEGER,
  current_status VARCHAR(50),
  severe_asthma_pct NUMERIC(5,2),
  severe_asthma_no INTEGER,
  xolair_pct NUMERIC(5,2),
  xolair_no INTEGER,
  dupixent_no INTEGER DEFAULT 0,
  fasenra_no INTEGER DEFAULT 0,
  nucala_no INTEGER DEFAULT 0,
  tezspire_no INTEGER DEFAULT 0,
  competitor_activity TEXT,
  nurse_support TEXT,
  key_barriers TEXT,
  objectives TEXT,
  monthly_call_no INTEGER DEFAULT 0,
  action_plan TEXT,
  created_by VARCHAR(50) REFERENCES users(username),
  updated_by VARCHAR(50) REFERENCES users(username),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id)
);

CREATE INDEX IF NOT EXISTS idx_records_psr_code ON records(psr_code);
CREATE INDEX IF NOT EXISTS idx_customers_psr_code ON customers(psr_code);
