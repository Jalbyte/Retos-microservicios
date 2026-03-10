-- =========================================================
-- auth-service – Inicialización de base de datos
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(100) UNIQUE NOT NULL,
    password   VARCHAR(255),
    role       VARCHAR(20)  NOT NULL DEFAULT 'USER',
    enabled    BOOLEAN      NOT NULL DEFAULT true,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Semilla: admin@empresa.com / password (bcrypt hash de "password")
INSERT INTO users (email, password, role, enabled)
VALUES (
    'admin@empresa.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'ADMIN',
    true
)
ON CONFLICT (email) DO NOTHING;
