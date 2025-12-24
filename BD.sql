-- ============================================
-- BASE DE DATOS: COLEGIO MIGUEL GRAU
-- Sistema de Gestión Educativa
-- ============================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS colegio_miguel_grau 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE colegio_miguel_grau;

-- ============================================
-- TABLA: USUARIOS
-- ============================================
CREATE TABLE usuarios (
    id VARCHAR(20) PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    dni CHAR(8) UNIQUE NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    tipo ENUM('profesor', 'estudiante') NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP NULL,
    activo BOOLEAN DEFAULT TRUE,
    INDEX idx_tipo (tipo),
    INDEX idx_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: PROFESORES
-- ============================================
CREATE TABLE profesores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id VARCHAR(20) UNIQUE NOT NULL,
    especialidad VARCHAR(100),
    total_tareas_creadas INT DEFAULT 0,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: ESTUDIANTES
-- ============================================
CREATE TABLE estudiantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id VARCHAR(20) UNIQUE NOT NULL,
    grado VARCHAR(10),
    seccion VARCHAR(5),
    promedio_general DECIMAL(4,2) DEFAULT 0.00,
    tareas_completadas INT DEFAULT 0,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: TAREAS
-- ============================================
CREATE TABLE tareas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    curso VARCHAR(100) NOT NULL,
    tipo ENUM('tarea', 'examen', 'proyecto') DEFAULT 'tarea',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega DATE NOT NULL,
    puntos INT DEFAULT 20,
    profesor_id VARCHAR(20) NOT NULL,
    estado ENUM('activa', 'cerrada', 'archivada') DEFAULT 'activa',
    FOREIGN KEY (profesor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_profesor (profesor_id),
    INDEX idx_fecha_entrega (fecha_entrega),
    INDEX idx_curso (curso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: ENTREGAS
-- ============================================
CREATE TABLE entregas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tarea_id INT NOT NULL,
    estudiante_id VARCHAR(20) NOT NULL,
    fecha_entrega TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nota DECIMAL(4,2) NULL,
    comentario TEXT,
    estado ENUM('pendiente', 'entregada', 'calificada') DEFAULT 'pendiente',
    fecha_calificacion TIMESTAMP NULL,
    intentos INT DEFAULT 1,
    FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
    FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_entrega (tarea_id, estudiante_id),
    INDEX idx_tarea (tarea_id),
    INDEX idx_estudiante (estudiante_id),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: NOTIFICACIONES
-- ============================================
CREATE TABLE notificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id VARCHAR(20) NOT NULL,
    tipo ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id),
    INDEX idx_leida (leida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: CURSOS
-- ============================================
CREATE TABLE cursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    color VARCHAR(7) DEFAULT '#667eea',
    icono VARCHAR(10) DEFAULT '📚'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: ASIGNACIONES (Profesor-Curso)
-- ============================================
CREATE TABLE asignaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profesor_id VARCHAR(20) NOT NULL,
    curso_id INT NOT NULL,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profesor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_asignacion (profesor_id, curso_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Actualizar contador de tareas del profesor
DELIMITER $$
CREATE TRIGGER after_tarea_insert
AFTER INSERT ON tareas
FOR EACH ROW
BEGIN
    UPDATE profesores 
    SET total_tareas_creadas = total_tareas_creadas + 1
    WHERE usuario_id = NEW.profesor_id;
END$$
DELIMITER ;

-- Trigger: Actualizar promedio del estudiante
DELIMITER $$
CREATE TRIGGER after_calificacion_update
AFTER UPDATE ON entregas
FOR EACH ROW
BEGIN
    IF NEW.nota IS NOT NULL THEN
        UPDATE estudiantes
        SET promedio_general = (
            SELECT AVG(nota)
            FROM entregas
            WHERE estudiante_id = NEW.estudiante_id
            AND nota IS NOT NULL
        ),
        tareas_completadas = (
            SELECT COUNT(*)
            FROM entregas
            WHERE estudiante_id = NEW.estudiante_id
            AND nota IS NOT NULL
        )
        WHERE usuario_id = NEW.estudiante_id;
    END IF;
END$$
DELIMITER ;

-- Trigger: Crear notificación al calificar
DELIMITER $$
CREATE TRIGGER after_calificacion_insert
AFTER INSERT ON entregas
FOR EACH ROW
BEGIN
    IF NEW.nota IS NOT NULL THEN
        INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje)
        SELECT 
            NEW.estudiante_id,
            'success',
            'Tarea Calificada',
            CONCAT('Tu tarea "', t.titulo, '" ha sido calificada: ', NEW.nota, '/20')
        FROM tareas t
        WHERE t.id = NEW.tarea_id;
    END IF;
END$$
DELIMITER ;

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Insertar cursos predefinidos
INSERT INTO cursos (nombre, descripcion, color, icono) VALUES
('Matemática', 'Álgebra, Geometría, Trigonometría', '#3498db', '🔢'),
('Comunicación', 'Lenguaje, Literatura, Redacción', '#e74c3c', '📖'),
('Ciencia y Tecnología', 'Física, Química, Biología', '#2ecc71', '🔬'),
('Ciencias Sociales', 'Historia, Geografía, Economía', '#f39c12', '🌍'),
('Inglés', 'Idioma inglés - Gramática y conversación', '#9b59b6', '🇬🇧'),
('Arte y Cultura', 'Artes plásticas, música, danza', '#e67e22', '🎨'),
('Educación Física', 'Deportes y actividad física', '#16a085', '⚽'),
('Educación Religiosa', 'Formación en valores', '#95a5a6', '✝️'),
('Tutoría', 'Orientación y desarrollo personal', '#34495e', '🎯');

-- Insertar usuarios de prueba (contraseñas hasheadas con bcrypt)
-- Nota: Estas son contraseñas de ejemplo. En producción usar hashes reales.

-- Profesor de prueba (contraseña: 123456)
INSERT INTO usuarios (id, nombres, apellidos, dni, correo, contrasena, tipo) VALUES
('PROF001', 'Carlos', 'Mendoza Ruiz', '12345678', 'carlos.mendoza@gmail.com', 
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSe8nP.W', 'profesor'),
('PROF002', 'María', 'García López', '87654321', 'maria.garcia@gmail.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSe8nP.W', 'profesor');

-- Estudiantes de prueba (contraseña: 123456)
INSERT INTO usuarios (id, nombres, apellidos, dni, correo, contrasena, tipo) VALUES
('EST001', 'Ana', 'Martínez Silva', '45678912', 'ana.martinez@gmail.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSe8nP.W', 'estudiante'),
('EST002', 'Luis', 'Rodríguez Pérez', '78945612', 'luis.rodriguez@gmail.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSe8nP.W', 'estudiante'),
('EST003', 'Carmen', 'Torres Vega', '32165498', 'carmen.torres@gmail.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSe8nP.W', 'estudiante');

-- Insertar datos en tabla profesores
INSERT INTO profesores (usuario_id, especialidad) VALUES
('PROF001', 'Matemática'),
('PROF002', 'Comunicación');

-- Insertar datos en tabla estudiantes
INSERT INTO estudiantes (usuario_id, grado, seccion) VALUES
('EST001', '5to', 'A'),
('EST002', '5to', 'A'),
('EST003', '5to', 'B');

-- Asignar cursos a profesores
INSERT INTO asignaciones (profesor_id, curso_id) VALUES
('PROF001', 1), -- Carlos enseña Matemática
('PROF002', 2); -- María enseña Comunicación

-- Insertar tareas de ejemplo
INSERT INTO tareas (titulo, descripcion, curso, tipo, fecha_entrega, profesor_id) VALUES
('Resolver Ecuaciones Cuadráticas', 
 'Resolver los ejercicios del 1 al 15 de la página 45 del libro de texto. Mostrar todo el procedimiento.',
 'Matemática', 'tarea', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'PROF001'),
('Análisis Literario - Cien Años de Soledad',
 'Realizar un análisis de los primeros 3 capítulos enfocándose en los personajes principales.',
 'Comunicación', 'tarea', DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'PROF002');

-- Insertar calificaciones de ejemplo
INSERT INTO entregas (tarea_id, estudiante_id, nota, comentario, estado, fecha_calificacion) VALUES
(1, 'EST001', 18, 'Excelente trabajo. Procedimiento claro y ordenado.', 'calificada', NOW()),
(2, 'EST001', 15, 'Buen análisis pero faltaron algunos detalles.', 'calificada', NOW());

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Ranking de estudiantes
CREATE VIEW ranking_estudiantes AS
SELECT 
    e.usuario_id,
    u.nombres,
    u.apellidos,
    e.grado,
    e.seccion,
    e.promedio_general,
    e.tareas_completadas,
    RANK() OVER (ORDER BY e.promedio_general DESC) as ranking
FROM estudiantes e
JOIN usuarios u ON e.usuario_id = u.id
WHERE e.promedio_general > 0
ORDER BY e.promedio_general DESC;

-- Vista: Estadísticas de profesores
CREATE VIEW estadisticas_profesores AS
SELECT 
    p.usuario_id,
    u.nombres,
    u.apellidos,
    p.especialidad,
    p.total_tareas_creadas,
    COUNT(DISTINCT t.id) as tareas_activas,
    COUNT(DISTINCT en.id) as total_calificaciones,
    AVG(en.nota) as promedio_calificaciones
FROM profesores p
JOIN usuarios u ON p.usuario_id = u.id
LEFT JOIN tareas t ON p.usuario_id = t.profesor_id AND t.estado = 'activa'
LEFT JOIN entregas en ON t.id = en.tarea_id AND en.nota IS NOT NULL
GROUP BY p.usuario_id;

-- ============================================
-- PROCEDIMIENTOS ALMACENADOS
-- ============================================

-- Procedimiento: Obtener reporte del estudiante
DELIMITER $$
CREATE PROCEDURE sp_reporte_estudiante(IN p_estudiante_id VARCHAR(20))
BEGIN
    SELECT 
        t.titulo,
        t.curso,
        t.fecha_entrega,
        e.nota,
        e.comentario,
        e.estado,
        CONCAT(u.nombres, ' ', u.apellidos) as profesor
    FROM tareas t
    LEFT JOIN entregas e ON t.id = e.tarea_id AND e.estudiante_id = p_estudiante_id
    LEFT JOIN usuarios u ON t.profesor_id = u.id
    ORDER BY t.fecha_entrega DESC;
END$$
DELIMITER ;

-- Procedimiento: Estadísticas generales
DELIMITER $$
CREATE PROCEDURE sp_estadisticas_generales()
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM usuarios WHERE tipo = 'profesor') as total_profesores,
        (SELECT COUNT(*) FROM usuarios WHERE tipo = 'estudiante') as total_estudiantes,
        (SELECT COUNT(*) FROM tareas WHERE estado = 'activa') as tareas_activas,
        (SELECT COUNT(*) FROM entregas WHERE nota IS NOT NULL) as calificaciones_asignadas,
        (SELECT AVG(nota) FROM entregas WHERE nota IS NOT NULL) as promedio_general;
END$$
DELIMITER ;

-- ============================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ============================================

CREATE INDEX idx_tareas_estado_fecha ON tareas(estado, fecha_entrega);
CREATE INDEX idx_entregas_calificacion ON entregas(estudiante_id, nota);
CREATE INDEX idx_usuarios_activo ON usuarios(activo, tipo);

-- ============================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

ALTER TABLE usuarios 
    COMMENT = 'Tabla principal de usuarios del sistema (profesores y estudiantes)';

ALTER TABLE tareas 
    COMMENT = 'Tabla de tareas asignadas por los profesores';

ALTER TABLE entregas 
    COMMENT = 'Tabla de entregas y calificaciones de tareas';

ALTER TABLE notificaciones 
    COMMENT = 'Sistema de notificaciones para usuarios';