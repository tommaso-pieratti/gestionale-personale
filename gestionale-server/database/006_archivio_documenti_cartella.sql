
-- 006_archivio_documenti_cartella.sql
-- Associa i documenti alle cartelle dell'archivio.

ALTER TABLE archivio_documenti
    ADD COLUMN cartella_id BIGINT UNSIGNED NULL DEFAULT NULL;

ALTER TABLE archivio_documenti
    ADD INDEX idx_archivio_documenti_cartella (cartella_id);

ALTER TABLE archivio_documenti
    ADD CONSTRAINT fk_archivio_documenti_cartella
    FOREIGN KEY (cartella_id)
    REFERENCES archivio_cartelle(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
