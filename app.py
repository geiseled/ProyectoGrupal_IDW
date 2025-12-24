# ============================================
# BACKEND FLASK + MYSQL
# Sistema de Gestión Educativa
# ============================================

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import jwt
import re

app = Flask(__name__)
CORS(app)  # Permitir peticiones desde el frontend

# ============================================
# CONFIGURACIÓN
# ============================================

app.config['SECRET_KEY'] = 'tu_clave_secreta_super_segura_123'
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = ''  # Cambiar por tu contraseña de MySQL
app.config['MYSQL_DB'] = 'colegio_miguel_grau'
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'

mysql = MySQL(app)

# ============================================
# FUNCIONES AUXILIARES
# ============================================

def validar_dni(dni):
    """Valida que el DNI tenga 8 dígitos"""
    return bool(re.match(r'^\d{8}$', dni))

def validar_correo(correo):
    """Valida que sea un correo de Gmail"""
    return bool(re.match(r'^[a-zA-Z0-9._%+-]+@gmail\.com$', correo))

def validar_contrasena(contrasena):
    """Valida que la contraseña tenga al menos 6 caracteres y un número"""
    if len(contrasena) < 6:
        return False, "La contraseña debe tener al menos 6 caracteres"
    if not any(char.isdigit() for char in contrasena):
        return False, "La contraseña debe contener al menos un número"
    return True, "OK"

def generar_token(usuario_id, tipo):
    """Genera un JWT token"""
    payload = {
        'usuario_id': usuario_id,
        'tipo': tipo,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def verificar_token(token):
    """Verifica y decodifica el token"""
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# ============================================
# RUTAS DE AUTENTICACIÓN
# ============================================

@app.route('/api/registro/profesor', methods=['POST'])
def registro_profesor():
    """Registra un nuevo profesor"""
    try:
        datos = request.get_json()
        
        # Validaciones
        if not validar_dni(datos['dni']):
            return jsonify({'exito': False, 'mensaje': 'DNI inválido'}), 400
        
        if not validar_correo(datos['correo']):
            return jsonify({'exito': False, 'mensaje': 'Correo debe ser de Gmail'}), 400
        
        valido, mensaje = validar_contrasena(datos['contrasena'])
        if not valido:
            return jsonify({'exito': False, 'mensaje': mensaje}), 400
        
        # Verificar ID único
        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM usuarios WHERE id = %s", (datos['id'],))
        if cur.fetchone():
            return jsonify({'exito': False, 'mensaje': 'Este ID ya está registrado'}), 400
        
        # Verificar correo único
        cur.execute("SELECT correo FROM usuarios WHERE correo = %s", (datos['correo'],))
        if cur.fetchone():
            return jsonify({'exito': False, 'mensaje': 'Este correo ya está registrado'}), 400
        
        # Hash de la contraseña
        hash_contrasena = generate_password_hash(datos['contrasena'])
        
        # Insertar usuario
        cur.execute("""
            INSERT INTO usuarios (id, nombres, apellidos, dni, correo, contrasena, tipo)
            VALUES (%s, %s, %s, %s, %s, %s, 'profesor')
        """, (datos['id'], datos['nombres'], datos['apellidos'], 
              datos['dni'], datos['correo'], hash_contrasena))
        
        # Insertar en tabla profesores
        cur.execute("""
            INSERT INTO profesores (usuario_id, especialidad)
            VALUES (%s, %s)
        """, (datos['id'], datos.get('especialidad', '')))
        
        mysql.connection.commit()
        cur.close()
        
        return jsonify({
            'exito': True,
            'mensaje': 'Registro exitoso. Ahora puedes iniciar sesión.'
        }), 201
        
    except Exception as e:
        print(f"Error en registro_profesor: {e}")
        return jsonify({'exito': False, 'mensaje': 'Error en el servidor'}), 500

@app.route('/api/registro/estudiante', methods=['POST'])
def registro_estudiante():
    """Registra un nuevo estudiante"""
    try:
        datos = request.get_json()
        
        # Validaciones
        if not validar_dni(datos['dni']):
            return jsonify({'exito': False, 'mensaje': 'DNI inválido'}), 400
        
        if not validar_correo(datos['correo']):
            return jsonify({'exito': False, 'mensaje': 'Correo debe ser de Gmail'}), 400
        
        valido, mensaje = validar_contrasena(datos['contrasena'])
        if not valido:
            return jsonify({'exito': False, 'mensaje': mensaje}), 400
        
        # Verificar ID y correo únicos
        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM usuarios WHERE id = %s OR correo = %s", 
                   (datos['id'], datos['correo']))
        if cur.fetchone():
            return jsonify({'exito': False, 'mensaje': 'ID o correo ya registrado'}), 400
        
        # Hash de la contraseña
        hash_contrasena = generate_password_hash(datos['contrasena'])
        
        # Insertar usuario
        cur.execute("""
            INSERT INTO usuarios (id, nombres, apellidos, dni, correo, contrasena, tipo)
            VALUES (%s, %s, %s, %s, %s, %s, 'estudiante')
        """, (datos['id'], datos['nombres'], datos['apellidos'], 
              datos['dni'], datos['correo'], hash_contrasena))
        
        # Insertar en tabla estudiantes
        cur.execute("""
            INSERT INTO estudiantes (usuario_id, grado, seccion)
            VALUES (%s, %s, %s)
        """, (datos['id'], datos.get('grado', ''), datos.get('seccion', '')))
        
        mysql.connection.commit()
        cur.close()
        
        return jsonify({
            'exito': True,
            'mensaje': 'Registro exitoso. Ahora puedes iniciar sesión.'
        }), 201
        
    except Exception as e:
        print(f"Error en registro_estudiante: {e}")
        return jsonify({'exito': False, 'mensaje': 'Error en el servidor'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """Inicia sesión y devuelve un token"""
    try:
        datos = request.get_json()
        
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT id, nombres, apellidos, correo, contrasena, tipo, fecha_registro
            FROM usuarios WHERE id = %s
        """, (datos['id'],))
        
        usuario = cur.fetchone()
        cur.close()
        
        if not usuario:
            return jsonify({'exito': False, 'mensaje': 'Usuario no encontrado'}), 404
        
        # Verificar contraseña
        if not check_password_hash(usuario['contrasena'], datos['contrasena']):
            return jsonify({'exito': False, 'mensaje': 'Contraseña incorrecta'}), 401
        
        # Generar token
        token = generar_token(usuario['id'], usuario['tipo'])
        
        # Actualizar último acceso
        cur = mysql.connection.cursor()
        cur.execute("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = %s", (usuario['id'],))
        mysql.connection.commit()
        cur.close()
        
        return jsonify({
            'exito': True,
            'token': token,
            'usuario': {
                'id': usuario['id'],
                'nombres': usuario['nombres'],
                'apellidos': usuario['apellidos'],
                'correo': usuario['correo'],
                'tipo': usuario['tipo']
            },
            'mensaje': f"Bienvenido, {usuario['nombres']}!"
        }), 200
        
    except Exception as e:
        print(f"Error en login: {e}")
        return jsonify({'exito': False, 'mensaje': 'Error en el servidor'}), 500

# ============================================
# RUTAS DE TAREAS (PROFESORES)
# ============================================

@app.route('/api/tareas', methods=['POST'])
def crear_tarea():
    """Crea una nueva tarea"""
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'exito': False, 'mensaje': 'Token requerido'}), 401
        
        payload = verificar_token(token.replace('Bearer ', ''))
        if not payload or payload['tipo'] != 'profesor':
            return jsonify({'exito': False, 'mensaje': 'No autorizado'}), 403
        
        datos = request.get_json()
        
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO tareas (titulo, descripcion, curso, tipo, fecha_entrega, 
                              puntos, profesor_id, estado)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'activa')
        """, (datos['titulo'], datos['descripcion'], datos['curso'],
              datos.get('tipo', 'tarea'), datos['fechaEntrega'], 
              datos.get('puntos', 20), payload['usuario_id']))
        
        mysql.connection.commit()
        tarea_id = cur.lastrowid
        cur.close()
        
        return jsonify({
            'exito': True,
            'tarea_id': tarea_id,
            'mensaje': 'Tarea creada exitosamente'
        }), 201
        
    except Exception as e:
        print(f"Error en crear_tarea: {e}")
        return jsonify({'exito': False, 'mensaje': 'Error en el servidor'}), 500

@app.route('/api/tareas/profesor', methods=['GET'])
def obtener_tareas_profesor():
    """Obtiene todas las tareas de un profesor"""
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'exito': False, 'mensaje': 'Token requerido'}), 401
        
        payload = verificar_token(token.replace('Bearer ', ''))
        if not payload:
            return jsonify({'exito': False, 'mensaje': 'Token inválido'}), 401
        
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT t.*, 
                   COUNT(e.id) as total_entregas,
                   COUNT(CASE WHEN e.nota IS NOT NULL THEN 1 END) as calificadas
            FROM tareas t
            LEFT JOIN entregas e ON t.id = e.tarea_id
            WHERE t.profesor_id = %s
            GROUP BY t.id
            ORDER BY t.fecha_creacion DESC
        """, (payload['usuario_id'],))
        
        tareas = cur.fetchall()
        cur.close()
        
        return jsonify({'exito': True, 'tareas': tareas}), 200
        
    except Exception as e:
        print(f"Error en obtener_tareas_profesor: {e}")
        return jsonify({'exito': False, 'mensaje': 'Error en el servidor'}), 500

@app.route('/api/tareas/<int:tarea_id>', methods=['DELETE'])
def eliminar_tarea(tarea_id):
    """Elimina una tarea"""
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'exito': False, 'mensaje': 'Token requerido'}), 401
        
        payload = verificar_token(token.replace('Bearer ', ''))
        if not payload or payload['tipo'] != 'profesor':
            return jsonify({'exito': False, 'mensaje': 'No autorizado'}), 403
        
        cur = mysql.connection.cursor()
        
        # Verificar que la tarea pertenece al profesor
        cur.execute("SELECT profesor_id FROM tareas WHERE id = %s", (tarea_id,))
        tarea = cur.fetchone()
        
        if not tarea or tarea['profesor_id'] != payload['usuario_id']:
            return jsonify({'exito': False, 'mensaje': 'Tarea no encontrada'}), 404
        
        # Eliminar tarea
        cur.execute("DELETE FROM tareas WHERE id = %s", (tarea_id,))
        mysql.connection.commit()
        cur.close()
        
        return jsonify({'exito': True, 'mensaje': 'Tarea eliminada'}), 200
        
    except Exception as e:
        print(f"Error en eliminar_tarea: {e}")
        return jsonify({'exito': False, 'mensaje': 'Error en el servidor'}), 500

# ============================================
# RUTAS DE CALIFICACIONES (PROFESORES)
# ============================================

@app.route('/api/calificaciones', methods=['POST'])
def asignar_calificacion():
    """Asigna o actualiza una calificación"""
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'exito': False, 'mensaje': 'Token requerido'}), 401
        
        payload = verificar_token(token.replace('Bearer ', ''))
        if not payload or payload['tipo'] != 'profesor':
            return jsonify({'exito': False, 'mensaje': 'No autorizado'}), 403
        
        datos = request.get_json()
        
        # Validar nota
        nota = float(datos['nota'])
        if nota < 0 or nota > 20:
            return jsonify({'exito': False, 'mensaje': 'Nota debe estar entre 0 y 20'}), 400
        
        cur = mysql.connection.cursor()
        
        # Verificar si ya existe una entrega
        cur.execute("""
            SELECT id FROM entregas 
            WHERE tarea_id = %s AND estudiante_id = %s
        """, (datos['tarea_id'], datos['estudiante_id']))
        
        entrega = cur.fetchone()
        
        if entrega:
            # Actualizar entrega existente
            cur.execute("""
                UPDATE entregas 
                SET nota = %s, comentario = %s, estado = 'calificada',
                    fecha_calificacion = NOW()
                WHERE id = %s
            """, (nota, datos.get('comentario', ''), entrega['id']))
        else:
            # Crear nueva entrega
            cur.execute("""
                INSERT INTO entregas (tarea_id, estudiante_id, nota, comentario, 
                                     estado, fecha_calificacion)
                VALUES (%s, %s, %s, %s, 'calificada', NOW())
            """, (datos['tarea_id'], datos['estudiante_id'], 
                  nota, datos.get('comentario', '')))
        
        mysql.connection.commit()
        cur.close()
        
        return jsonify({
            'exito': True,
            'mensaje': 'Calificación asignada exitosamente'
        }), 200
        
    except Exception as e:
        print(f"Error en asignar_calificacion: {e}")
        return jsonify({'exito': False, 'mensaje': 'Error en el servidor'}), 500

@app.route('/api/tareas/<int:tarea_id>/entregas', methods=['GET'])
def obtener_entregas(tarea_id):
    """Obtiene todas las entregas de una tarea"""
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'exito': False, 'mensaje': 'Token requerido'}), 401
        
        payload = verificar_token(token.replace('Bearer ', ''))
        if not payload:
            return jsonify({'exito': False, 'mensaje': 'Token inválido'}), 401
        
        cur = mysql.connection.cursor()
        
        # Obtener todos los estudiantes y sus entregas
        cur.execute("""
            SELECT u.id, u.nombres, u.apellidos,
                   e.nota, e.comentario, e.fecha_calificacion, e.estado
            FROM usuarios u
            LEFT JOIN entregas e ON u.id = e.estudiante_id AND e.tarea_id = %s
            WHERE u.tipo = 'estudiante'
            ORDER BY u.apellidos, u.nombres
        """, (tarea_id,))
        
        entregas = cur.fetchall()
        cur.close()
        
        return jsonify({'exito': True, 'entregas': entregas}), 200
        
    except Exception as e:
        print(f"Error en obtener_entregas: {e}")
        return jsonify({'exito': False, 'mensaje': 'Error en el servidor'}), 500

# ============================================
# RUTAS PARA ESTUDIANTES
# ============================================

@app.route('/api/tareas/estudiante', methods=['GET'])
def obtener_tareas_estudiante():
    """Obtiene todas las tareas para un estudiante"""
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'exito': False, 'mensaje': 'Token requerido'}), 401
        
        payload = verificar_token(token.replace('Bearer ', ''))
        if not payload:
            return jsonify({'exito': False, 'mensaje': 'Token inválido'}), 401
        
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT t.*, 
                   u.nombres as profesor_nombres, 
                   u.apellidos as profesor_apellidos,
                   e.nota, e.comentario, e.estado as estado_entrega,
                   DATEDIFF(t.fecha_entrega, CURDATE()) as dias_restantes
            FROM tareas t
            LEFT JOIN usuarios u ON t.profesor_id = u.id
            LEFT JOIN entregas e ON t.id = e.tarea_id AND e.estudiante_id = %s
            ORDER BY t.fecha_entrega ASC
        """, (payload['usuario_id'],))
        
        tareas = cur.fetchall()
        cur.close()
        
        return jsonify({'exito': True, 'tareas': tareas}), 200
        
    except Exception as e:
        print(f"Error en obtener_tareas_estudiante: {e}")
        return jsonify({'exito': False, 'mensaje': 'Error en el servidor'}), 500

@app.route('/api/estadisticas/estudiante', methods=['GET'])
def obtener_estadisticas_estudiante():
    """Obtiene estadísticas del estudiante"""
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'exito': False, 'mensaje': 'Token requerido'}), 401
        
        payload = verificar_token(token.replace('Bearer ', ''))
        if not payload:
            return jsonify({'exito': False, 'mensaje': 'Token inválido'}), 401
        
        cur = mysql.connection.cursor()
        
        # Total de tareas
        cur.execute("SELECT COUNT(*) as total FROM tareas")
        total_tareas = cur.fetchone()['total']
        
        # Tareas calificadas
        cur.execute("""
            SELECT COUNT(*) as calificadas, AVG(nota) as promedio
            FROM entregas 
            WHERE estudiante_id = %s AND nota IS NOT NULL
        """, (payload['usuario_id'],))
        stats = cur.fetchone()
        
        # Tareas pendientes
        pendientes = total_tareas - stats['calificadas']
        
        cur.close()
        
        return jsonify({
            'exito': True,
            'estadisticas': {
                'total_tareas': total_tareas,
                'calificadas': stats['calificadas'],
                'pendientes': pendientes,
                'promedio': round(stats['promedio'], 2) if stats['promedio'] else 0
            }
        }), 200
        
    except Exception as e:
        print(f"Error en obtener_estadisticas_estudiante: {e}")
        return jsonify({'exito': False, 'mensaje': 'Error en el servidor'}), 500

# ============================================
# RUTA DE SALUD
# ============================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Verifica que el servidor esté funcionando"""
    return jsonify({
        'status': 'OK',
        'mensaje': 'Servidor funcionando correctamente',
        'timestamp': datetime.now().isoformat()
    }), 200

# ============================================
# INICIAR SERVIDOR
# ============================================

if __name__ == '__main__':
    app.run(debug=True, port=5000)