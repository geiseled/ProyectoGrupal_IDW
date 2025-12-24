# Servidor HTTP para el Sistema de Gestion Educativa
# Implementado con Python puro sin frameworks externos

from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
from urllib.parse import urlparse, parse_qs
import app

# Configuracion del servidor
HOST = 'localhost'
PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Manejador de peticiones HTTP
class RequestHandler(SimpleHTTPRequestHandler):
    
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/':
            path = '/index.html'
        
        if path == '/api/usuarios':
            self.handle_get_usuarios()
            return
        
        if path == '/api/health':
            self.send_json_response({'status': 'OK', 'mensaje': 'Servidor funcionando'}, 200)
            return
        
        self.serve_static_file(path)
    
    def do_POST(self):
        path = urlparse(self.path).path
        
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            datos = json.loads(body.decode('utf-8'))
        except json.JSONDecodeError:
            self.send_json_response({'exito': False, 'mensaje': 'JSON invalido'}, 400)
            return
        
        if path == '/api/registro/profesor':
            self.handle_registro_profesor(datos)
            return
        
        if path == '/api/registro/estudiante':
            self.handle_registro_estudiante(datos)
            return
        
        if path == '/api/login':
            self.handle_login(datos)
            return
        
        if path == '/api/tareas':
            self.handle_crear_tarea(datos)
            return
        
        if path == '/api/calificaciones':
            self.handle_asignar_calificacion(datos)
            return
        
        self.send_json_response({'exito': False, 'mensaje': 'Ruta no encontrada'}, 404)
    
    def do_DELETE(self):
        path = urlparse(self.path).path
        
        if path.startswith('/api/tareas/'):
            tarea_id = path.split('/')[-1]
            self.handle_eliminar_tarea(tarea_id)
            return
        
        self.send_json_response({'exito': False, 'mensaje': 'Ruta no encontrada'}, 404)
    
    # Manejadores de endpoints API
    
    def handle_registro_profesor(self, datos):
        datos['tipo'] = 'profesor'
        resultado = app.registrar_usuario(datos)
        
        if resultado['exito']:
            self.send_json_response(resultado, 201)
        else:
            self.send_json_response(resultado, 400)
    
    def handle_registro_estudiante(self, datos):
        datos['tipo'] = 'estudiante'
        resultado = app.registrar_usuario(datos)
        
        if resultado['exito']:
            self.send_json_response(resultado, 201)
        else:
            self.send_json_response(resultado, 400)
    
    def handle_login(self, datos):
        if 'id' not in datos or 'contrasena' not in datos:
            self.send_json_response({'exito': False, 'mensaje': 'Faltan datos'}, 400)
            return
        
        resultado = app.iniciar_sesion(datos['id'], datos['contrasena'])
        
        if resultado['exito']:
            self.send_json_response(resultado, 200)
        else:
            self.send_json_response(resultado, 401)
    
    def handle_crear_tarea(self, datos):
        profesor_id = datos.get('profesor_id')
        
        if not profesor_id:
            self.send_json_response({'exito': False, 'mensaje': 'profesor_id requerido'}, 400)
            return
        
        resultado = app.crear_tarea(datos, profesor_id)
        
        if resultado['exito']:
            self.send_json_response(resultado, 201)
        else:
            self.send_json_response(resultado, 400)
    
    def handle_eliminar_tarea(self, tarea_id):
        try:
            tarea_id = int(tarea_id)
        except ValueError:
            self.send_json_response({'exito': False, 'mensaje': 'ID invalido'}, 400)
            return
        
        profesor_id = self.headers.get('X-Profesor-ID')
        
        if not profesor_id:
            self.send_json_response({'exito': False, 'mensaje': 'profesor_id requerido'}, 400)
            return
        
        resultado = app.eliminar_tarea(tarea_id, profesor_id)
        
        if resultado['exito']:
            self.send_json_response(resultado, 200)
        else:
            self.send_json_response(resultado, 400)
    
    def handle_asignar_calificacion(self, datos):
        profesor_id = datos.get('profesor_id')
        
        if not profesor_id:
            self.send_json_response({'exito': False, 'mensaje': 'profesor_id requerido'}, 400)
            return
        
        resultado = app.asignar_calificacion(datos, profesor_id)
        
        if resultado['exito']:
            self.send_json_response(resultado, 200)
        else:
            self.send_json_response(resultado, 400)
    
    def handle_get_usuarios(self):
        usuarios = app.obtener_usuarios()
        usuarios_publicos = []
        
        for u in usuarios:
            usuario_pub = {k: v for k, v in u.items() if k != 'contrasena'}
            usuarios_publicos.append(usuario_pub)
        
        self.send_json_response({'exito': True, 'usuarios': usuarios_publicos}, 200)
    
    # Funciones auxiliares para servir archivos
    
    def serve_static_file(self, path):
        if path.startswith('/'):
            path = path[1:]
        
        full_path = os.path.join(BASE_DIR, path)
        
        if not os.path.exists(full_path):
            self.send_error(404, 'Archivo no encontrado')
            return
        
        if not os.path.isfile(full_path):
            self.send_error(404, 'No es un archivo')
            return
        
        content_type = self.guess_type(full_path)
        
        try:
            with open(full_path, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', len(content))
            self.end_headers()
            self.wfile.write(content)
        
        except Exception as e:
            self.send_error(500, f'Error al leer el archivo: {e}')
    
    def send_json_response(self, data, status_code=200):
        response = json.dumps(data, ensure_ascii=False).encode('utf-8')
        
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', len(response))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(response)
    
    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")

# Inicializacion del servidor

def run_server():
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, RequestHandler)
    
    print("=" * 60)
    print("SERVIDOR HTTP INICIADO")
    print("=" * 60)
    print(f"Direccion: http://{HOST}:{PORT}/")
    print(f"Presiona Ctrl+C para detener el servidor")
    print("=" * 60)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServidor detenido")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
