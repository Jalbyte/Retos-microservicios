CREATE TABLE IF NOT EXISTS "Departamento" (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- Seed data for E2E tests
INSERT INTO "Departamento" (id, nombre, descripcion)
VALUES ('1', 'Talento Humano', 'Departamento de recursos humanos')
ON CONFLICT (id) DO NOTHING;