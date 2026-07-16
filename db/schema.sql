-- Xolair MMP 填寫紀錄彙整網站 資料庫結構

CREATE TABLE IF NOT EXISTS psrs (
  code VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  team_group VARCHAR(10),
  is_team_lead BOOLEAN NOT NULL DEFAULT FALSE
);

-- 遷移既有資料庫：舊版 psrs 表沒有這兩欄
ALTER TABLE psrs ADD COLUMN IF NOT EXISTS team_group VARCHAR(10);
ALTER TABLE psrs ADD COLUMN IF NOT EXISTS is_team_lead BOOLEAN NOT NULL DEFAULT FALSE;

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

-- 每位業代針對每位 HCP、每個月各維護一筆紀錄（record_month 一律為當月第一天）
CREATE TABLE IF NOT EXISTS records (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  record_month DATE NOT NULL DEFAULT date_trunc('month', now())::date,
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
  UNIQUE (customer_id, record_month)
);

-- 遷移既有資料庫：舊版沒有 record_month 欄位、且是「每客戶一筆」
ALTER TABLE records ADD COLUMN IF NOT EXISTS record_month DATE NOT NULL DEFAULT date_trunc('month', now())::date;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'records' AND constraint_name = 'records_customer_id_key'
  ) THEN
    ALTER TABLE records DROP CONSTRAINT records_customer_id_key;
    ALTER TABLE records ADD CONSTRAINT records_customer_id_record_month_key UNIQUE (customer_id, record_month);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_records_psr_code ON records(psr_code);
CREATE INDEX IF NOT EXISTS idx_records_customer_month ON records(customer_id, record_month DESC);
CREATE INDEX IF NOT EXISTS idx_customers_psr_code ON customers(psr_code);

-- 醫院平均用量：每間醫院（依客戶代號去重）填寫 2026 年 1~6 月用量與平均用量
CREATE TABLE IF NOT EXISTS hospital_usage (
  id SERIAL PRIMARY KEY,
  psr_code VARCHAR(20) NOT NULL REFERENCES psrs(code),
  customer_code VARCHAR(30) NOT NULL,
  customer_name VARCHAR(200) NOT NULL,
  usage_2026_01 NUMERIC(10,2),
  usage_2026_02 NUMERIC(10,2),
  usage_2026_03 NUMERIC(10,2),
  usage_2026_04 NUMERIC(10,2),
  usage_2026_05 NUMERIC(10,2),
  usage_2026_06 NUMERIC(10,2),
  average_usage NUMERIC(10,2),
  created_by VARCHAR(50) REFERENCES users(username),
  updated_by VARCHAR(50) REFERENCES users(username),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (psr_code, customer_code)
);

CREATE INDEX IF NOT EXISTS idx_hospital_usage_psr_code ON hospital_usage(psr_code);
