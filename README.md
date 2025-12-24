# Sistema Educativo Colegio Miguel Grau

## Descripcion General

Sistema web academico completo para la gestion de tareas, calificaciones y comunicacion entre profesores y estudiantes del Colegio Miguel Grau. Desarrollado con tecnologias web aprendidas durante el curso de IDWEB

## Tecnologias Utilizadas

### Frontend
- HTML5: Estructura semantica de las paginas
- CSS3: Estilos modernos y responsive design
- JavaScript: Logica del cliente e interaccion con API

### Backend
- Python 3.7+: Lenguaje de programacion del servidor
- http.server: Servidor HTTP nativo de Python
- JSON: Base de datos simulada para almacenamiento

### Control de Versiones
- Git: Sistema de control de versiones
- GitHub: Repositorio remoto y colaboracion

## Estructura del Proyecto

```t
ProyectoGrupal_IDW/
│
├── index.html                          # Pagina principal de bienvenida
├── login.html                          # Sistema de autenticacion
│
├── pages/                              # Paginas del sistema
│   ├── acercade.html                  # Informacion del colegio
│   ├── header.html                    # Componente de encabezado
│   ├── footer.html                    # Componente de pie de pagina
│   ├── registro_profesor.html         # Registro para docentes
│   ├── registro_estudiante.html       # Registro para alumnos
│   ├── interfaz_profesor.html         # Panel de control docente
│   └── interfaz_estudiante.html       # Panel de control alumno
│
├── styles/                             # Hojas de estilo CSS
│   ├── style.css                      # Estilos globales
│   ├── header.css                     # Estilos del header
│   ├── footer.css                     # Estilos del footer
│   ├── index.css                      # Estilos de la landing
│   ├── acercade.css                   # Estilos de acerca de
│   ├── registro_profesor.css          # Estilos registro docente
│   ├── registro_estudiante.css        # Estilos registro alumno
│   ├── interfaz_profesor.css          # Estilos panel docente
│   └── interfaz_estudiante.css        # Estilos panel alumno
│
├── javascript/                         # Scripts del cliente
│   ├── control_sistema.js             # Logica principal y API
│   ├── registro_profesor.js           # Formulario registro docente
│   ├── registro_estudiante.js         # Formulario registro alumno
│   ├── interfaz_profesor.js           # Funcionalidad panel docente
│   └── interfaz_estudiante.js         # Funcionalidad panel alumno
│
├── images/                             # Recursos graficos
│   ├── landingimage.png               # Imagen principal
│   ├── miguelgrau.png                 # Logo del colegio
│   ├── juanCadillo.png                # Foto profesor ejemplo
│   ├── julioVelarde.png               # Foto profesor ejemplo
│   └── profesor2.png                  # Foto profesor ejemplo
│
├── data/                               # Base de datos JSON
│   ├── usuarios.json                  # Registro de usuarios
│   ├── tareas.json                    # Listado de tareas
│   └── calificaciones.json            # Notas asignadas
│
├── server.py                           # Servidor HTTP backend
├── app.py                             # Logica del sistema
├── README.md                          # Documentacion
└── .gitignore                         # Archivos excluidos de Git

```

## Funcionalidades Implementadas

### Sistema de Autenticacion
- Registro diferenciado para profesores y estudiantes
- Validacion de credenciales (ID y contrasena)
- Sesiones persistentes con datos en JSON
- Sistema de permisos por tipo de usuario

### Panel de Profesores
- Crear y gestionar tareas
- Asignar calificaciones a estudiantes
- Ver lista completa de estudiantes
- Consultar entregas por tarea
- Estadisticas de rendimiento del curso
- Eliminar tareas creadas

### Panel de Estudiantes
- Ver tareas asignadas
- Consultar calificaciones recibidas
- Estado de entregas (pendiente/calificada/vencida)
- Estadisticas personales (promedio, tareas completadas)
- Notificaciones de nuevas tareas

### Validaciones del Sistema
- DNI de 8 digitos numericos
- Correo electronico formato valido
- Contrasena minimo 6 caracteres con numero
- IDs unicos por usuario
- Notas entre 0 y 20 puntos
- Fechas de entrega futuras

## Instalacion y Configuracion

### Requisitos Previos de sistema

- Python 3.7 o superior instalado
- Navegador web moderno (Chrome, Firefox, Edge)

### Pasos de Instalacion

#### 1. Clonar el Repositorio

```bash
git clone https://github.com/Nyzer2/ProyectoGrupal_IDW.git
cd ProyectoGrupal_IDW
```
#### 2. Iniciar el Servidor Backend

```bash
python server.py
```

Deberas ver un mensaje similar a:

```
============================================================
SERVIDOR HTTP INICIADO
============================================================
Direccion: http://localhost:8000/
Presiona Ctrl+C para detener el servidor
============================================================
```

#### 3. Acceder a la Aplicacion

Abrir el navegador y visitar:

```
http://localhost:8000/
```

## Uso del Sistema

### Para Profesores

1. Registro o Login
   - Accede a la pagina de registro de profesores
   - Completa todos los campos requeridos
   - Usa un ID con formato PROF### (ejemplo: PROF001)
   - Inicia sesion con tus credenciales

2. Crear Tareas
   - Desde el panel de profesor, haz clic en "Crear Nueva Tarea"
   - Completa: titulo, descripcion, curso, fecha de entrega
   - La tarea estara disponible para todos los estudiantes

3. Calificar
   - Selecciona una tarea de tu lista
   - Haz clic en "Ver Entregas"
   - Asigna notas entre 0 y 20 puntos
   - Agrega comentarios opcionales

### Para Estudiantes

1. Registro o Login
   - Accede a la pagina de registro de estudiantes
   - Completa todos los campos requeridos
   - Usa un ID con formato EST### (ejemplo: EST001)
   - Inicia sesion con tus credenciales

2. Ver Tareas
   - El panel principal muestra todas las tareas disponibles

3. Consultar Notas
   - Accede a la seccion "Mis Calificaciones"
   - Ve tus notas, comentarios y estadisticas
   - Revisa tu promedio general

## API del Sistema

El servidor expone los siguientes endpoints:

### Autenticacion

POST /api/registro/profesor
POST /api/registro/estudiante
POST /api/login
GET /api/usuarios
GET /api/health

### Gestion de Tareas

POST /api/tareas
DELETE /api/tareas/<id>

### Calificaciones

POST /api/calificaciones

## Arquitectura del Sistema

### Modularizacion de servidor y aplicacion en python

- Modelo (app.py): Logica de negocio y acceso a datos
- Vista (HTML/CSS): Presentacion e interfaz de usuario
- Controlador (server.py + JS): Manejo de peticiones y respuestas

### Flujo de Datos

```
[Cliente Browser]
     |
[HTML + CSS + JS] -> Interfaz de usuario
     |
[server.py] -> Maneja peticiones HTTP
     |
[app.py] -> Procesa logica
     |
[data/*.json] -> Persiste datos
```

## Proximas Mejoras

### Fase 2 (Corto Plazo)
- Sistema de subida de archivos para tareas
- Mensajeria interna entre usuarios
- Exportar calificaciones a PDF/Excel/Word

### Fase 3 (Mediano Plazo)
- Migracion a base de datos MySQL
- Panel administrativo completo
- Reportes estadisticos mejorados

## Autores y Colaboradores

### Equipo de Desarrollo

Condori Choccata Anthony Moises (Lider de Proyecto, primera etapa)
- Rol: Desarrollador Frontend 
- Responsabilidades: Diseño de interfaces, logica del servidor

Chipayo Paco Santos Christian (Lider de Proyecto, etapa final)
- Rol: Desarrollador Backend y Frontend 
- Responsabilidades: API REST, gestion de datos, integracion, seguridad

Pacheco Medina Geisel Reymar
- Rol: Desarrollador Backend y Servidor
- Responsabilidades: Arquitectura, documentacion

## Licencia y Uso Academico

Este proyecto fue desarrollado como parte del curso de Desarrollo Web en la Universidad Nacional de San Agustin de Arequipa.

### Terminos de Uso

- Proyecto de codigo abierto para fines educativo

## Agradecimientos

- Al Ingeniero Aedo López Marco Wilfredo, quien nos enseño y guio durante el trascurso del curso
- A los compañeros de clase por el feedback

## Estado del Proyecto
Estado: Desarrollo Activo
Ultima Actualizacion: Diciembre 2025
Universidad Nacional de San Agustin de Arequipa
