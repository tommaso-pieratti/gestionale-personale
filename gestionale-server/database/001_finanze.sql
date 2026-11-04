
CREATE DATABASE IF NOT EXISTS gestionale_personale
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gestionale_personale;

CREATE TABLE IF NOT EXISTS conti (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  valuta CHAR(3) NOT NULL DEFAULT 'EUR',
  saldo_iniziale DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  creato_il DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS salvadanai (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  conto_id INT UNSIGNED NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descrizione VARCHAR(500) NULL,
  obiettivo DECIMAL(15,2) NOT NULL,
  saldo DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  data_obiettivo DATE NULL,
  attivo BOOLEAN NOT NULL DEFAULT TRUE,
  creato_il DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (id),

  CONSTRAINT fk_salvadanai_conto
    FOREIGN KEY (conto_id)
    REFERENCES conti(id)
    ON DELETE RESTRICT,

  CONSTRAINT chk_salvadanai_obiettivo
    CHECK (obiettivo > 0),

  CONSTRAINT chk_salvadanai_saldo
    CHECK (saldo >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS operazioni_salvadanai (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  salvadanaio_id INT UNSIGNED NOT NULL,
  tipo ENUM('ACCANTONAMENTO', 'PRELIEVO') NOT NULL,
  importo DECIMAL(15,2) NOT NULL,
  nota VARCHAR(500) NULL,
  creato_il DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (id),

  INDEX idx_operazioni_salvadanaio_data
    (salvadanaio_id, creato_il),

  CONSTRAINT fk_operazioni_salvadanaio
    FOREIGN KEY (salvadanaio_id)
    REFERENCES salvadanai(id)
    ON DELETE RESTRICT,

  CONSTRAINT chk_operazioni_importo
    CHECK (importo > 0)
) ENGINE=InnoDB;

INSERT INTO conti (
  nome,
  valuta,
  saldo_iniziale
)
SELECT
  'Conto personale',
  'EUR',
  0.00
WHERE NOT EXISTS (
  SELECT 1 FROM conti
);
