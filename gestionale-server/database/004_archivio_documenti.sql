-- Archivio Documenti: struttura database per file cifrati e sessioni di accesso.
-- Eseguire sul database gestionale_personale.
-- Il contenuto dei documenti deve essere cifrato nel backend PRIMA dell'inserimento.

CREATE TABLE IF NOT EXISTS archivio_documenti (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome_originale VARCHAR(255) NOT NULL,
  mime_type VARCHAR(150) NOT NULL,
  dimensione_originale BIGINT UNSIGNED NOT NULL,
  contenuto_cifrato LONGBLOB NOT NULL,
  iv VARBINARY(12) NOT NULL,
  auth_tag VARBINARY(16) NOT NULL,
  creato_il DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_archivio_documenti_creato_il (creato_il)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS archivio_sessioni (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash BINARY(32) NOT NULL,
  scade_il DATETIME(3) NOT NULL,
  ultimo_accesso_il DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  creato_il DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_archivio_sessioni_token_hash (token_hash),
  INDEX idx_archivio_sessioni_scade_il (scade_il)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
