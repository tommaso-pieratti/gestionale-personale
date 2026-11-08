
-- ============================================================
-- 003_carburante.sql
-- Modulo Carburante - Gestionale Personale
--
-- Tabelle:
--   carburante_auto
--   carburante_rifornimenti
--
-- Indipendente dal modulo Finanze.
-- ============================================================

CREATE TABLE IF NOT EXISTS carburante_auto (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    nome VARCHAR(100) NOT NULL,
    marca VARCHAR(100) NULL,
    modello VARCHAR(100) NULL,
    targa VARCHAR(20) NULL,
    alimentazione VARCHAR(50) NULL,
    note TEXT NULL,

    creato_il DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    aggiornato_il DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS carburante_rifornimenti (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    auto_id INT UNSIGNED NOT NULL,

    data_rifornimento DATE NOT NULL,

    importo DECIMAL(12,2) NOT NULL,

    litri DECIMAL(12,3) NOT NULL,

    tipo_rifornimento ENUM('PIENO', 'PARZIALE') NULL,

    km_attuali INT UNSIGNED NULL,

    distributore VARCHAR(150) NULL,

    creato_il DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    aggiornato_il DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),

    INDEX idx_carburante_auto (auto_id),
    INDEX idx_carburante_data (data_rifornimento),

    CONSTRAINT fk_carburante_rifornimenti_auto
        FOREIGN KEY (auto_id)
        REFERENCES carburante_auto(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT chk_carburante_importo
        CHECK (importo > 0),

    CONSTRAINT chk_carburante_litri
        CHECK (litri > 0)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
