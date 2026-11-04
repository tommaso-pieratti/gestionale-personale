
USE gestionale_personale;

-- =====================================================
-- GESTIONALE PERSONALE
-- Migrazione 002: conto personale e movimenti
-- =====================================================

-- Il saldo iniziale viene confermato una sola volta.
-- NULL significa che il conto non è ancora configurato.
-- Una data valorizzata significa che è stato confermato.

ALTER TABLE conti
  ADD COLUMN saldo_iniziale_confermato_il DATETIME(6) NULL
  AFTER saldo_iniziale;

-- =====================================================
-- TABELLA MOVIMENTI
-- =====================================================

CREATE TABLE movimenti (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,

  conto_id INT UNSIGNED NOT NULL,

  tipo ENUM('ENTRATA', 'USCITA') NOT NULL,

  importo DECIMAL(15,2) NOT NULL,

  descrizione VARCHAR(255) NOT NULL,

  categoria VARCHAR(100) NULL,

  data_movimento DATE NOT NULL,

  note TEXT NULL,

  annullato_il DATETIME(6) NULL,

  creato_il DATETIME(6)
    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  aggiornato_il DATETIME(6)
    NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),

  PRIMARY KEY (id),

  INDEX idx_movimenti_conto_data (
    conto_id,
    data_movimento
  ),

  INDEX idx_movimenti_annullati (
    annullato_il
  ),

  CONSTRAINT fk_movimenti_conto
    FOREIGN KEY (conto_id)
    REFERENCES conti(id)
    ON DELETE RESTRICT,

  CONSTRAINT chk_movimenti_importo
    CHECK (importo > 0)

) ENGINE=InnoDB;
