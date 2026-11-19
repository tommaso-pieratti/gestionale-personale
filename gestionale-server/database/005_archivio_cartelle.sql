
-- 005_archivio_cartelle.sql
-- Cartelle condivise tra dispositivi per l'Archivio Documenti.

CREATE TABLE IF NOT EXISTS archivio_cartelle (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(150) NOT NULL,
    categoria ENUM('pdf', 'foto', 'zip') NOT NULL,
    creato_il DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_archivio_cartelle_categoria (categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Non aggiungiamo ancora la colonna ai documenti:
-- prima dobbiamo verificare il nome esatto della tabella
-- definito nell'entity TypeORM esistente.
