// ============================================
// SISTEMA DE GESTIÓN EDUCATIVA AVANZADO
// control_sistema.js
// ============================================

// ============================================
// ALMACENAMIENTO EN MEMORIA
// ============================================
const DB = {
    usuarios: new Map(),
    sesionActual: null,
    tareas: new Map(),
    entregas: new Map(),
    notificaciones: new Map(),
    configuracion: {
        cursosPredefinidos: [
            'Matemática', 'Comunicación', 'Ciencia y Tecnología',
            'Ciencias Sociales', 'Inglés', 'Arte y Cultura',
            'Educación Física', 'Educación Religiosa', 'Tutoría'
        ],
        notaMaxima: 20,
        notaMinima: 0,
        notaAprobatoria: 11
    }
};

// Configuración de la API
const API_URL = 'http://localhost:5000/api';

// Token de autenticación
let authToken = null;
// ============================================
// CLASES DEL SISTEMA
// ============================================

class Usuario {
    constructor(datos) {
        this.id = datos.id;
        this.nombres = datos.nombres;
        this.apellidos = datos.apellidos;
        this.dni = datos.dni;
        this.correo = datos.correo;
        this.contrasena = datos.contrasena;
        this.tipo = datos.tipo;
        this.fechaRegistro = new Date();
        this.ultimoAcceso = null;
        this.avatar = this.generarAvatar();
    }

    getNombreCompleto() {
        return `${this.nombres} ${this.apellidos}`;
    }

    getIniciales() {
        return `${this.nombres.charAt(0)}${this.apellidos.charAt(0)}`.toUpperCase();
    }

    generarAvatar() {
        const colores = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
        return colores[Math.floor(Math.random() * colores.length)];
    }

    actualizarAcceso() {
        this.ultimoAcceso = new Date();
    }
}

class Profesor extends Usuario {
    constructor(datos) {
        super({ ...datos, tipo: 'profesor' });
        this.especialidad = datos.especialidad || '';
        this.cursos = [];
        this.tareasCreadas = [];
        this.estadisticas = {
            totalTareas: 0,
            tareasActivas: 0,
            estudiantesCalificados: 0
        };
    }

    agregarCurso(curso) {
        if (!this.cursos.includes(curso)) {
            this.cursos.push(curso);
        }
    }

    actualizarEstadisticas() {
        this.estadisticas.totalTareas = this.tareasCreadas.length;
        this.estadisticas.tareasActivas = this.tareasCreadas.filter(id => {
            const tarea = DB.tareas.get(id);
            return tarea && new Date(tarea.fechaEntrega) >= new Date();
        }).length;
    }
}

class Estudiante extends Usuario {
    constructor(datos) {
        super({ ...datos, tipo: 'estudiante' });
        this.grado = datos.grado || '';
        this.seccion = datos.seccion || '';
        this.cursosInscritos = [];
        this.estadisticas = {
            tareasCompletadas: 0,
            tareasPendientes: 0,
            promedioGeneral: 0,
            mejorNota: 0
        };
    }

    inscribirCurso(curso) {
        if (!this.cursosInscritos.includes(curso)) {
            this.cursosInscritos.push(curso);
        }
    }

    calcularEstadisticas() {
        const entregas = Array.from(DB.entregas.values()).filter(e => 
            e.estudianteId === this.id && e.nota !== null
        );
        
        if (entregas.length > 0) {
            const notas = entregas.map(e => e.nota);
            this.estadisticas.tareasCompletadas = entregas.length;
            this.estadisticas.promedioGeneral = (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2);
            this.estadisticas.mejorNota = Math.max(...notas);
        }

        this.estadisticas.tareasPendientes = Array.from(DB.tareas.values()).length - 
            Array.from(DB.entregas.values()).filter(e => e.estudianteId === this.id).length;
    }
}

class Tarea {
    constructor(datos) {
        this.id = datos.id || `TAR${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
        this.titulo = datos.titulo;
        this.descripcion = datos.descripcion;
        this.curso = datos.curso;
        this.profesorId = datos.profesorId;
        this.fechaCreacion = new Date();
        this.fechaEntrega = new Date(datos.fechaEntrega);
        this.puntos = datos.puntos || 20;
        this.tipo = datos.tipo || 'tarea'; // tarea, examen, proyecto
        this.estado = 'activa'; // activa, cerrada, archivada
        this.archivos = datos.archivos || [];
        this.instrucciones = datos.instrucciones || '';
    }

    estaVencida() {
        return new Date() > this.fechaEntrega;
    }

    getDiasRestantes() {
        const diff = this.fechaEntrega - new Date();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    getEstadoColor() {
        const dias = this.getDiasRestantes();
        if (dias < 0) return '#F44336';
        if (dias <= 2) return '#FF9800';
        return '#4CAF50';
    }
}

class Entrega {
    constructor(datos) {
        this.id = `ENT${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
        this.tareaId = datos.tareaId;
        this.estudianteId = datos.estudianteId;
        this.nota = datos.nota || null;
        this.comentario = datos.comentario || '';
        this.fechaEntrega = datos.fechaEntrega || new Date();
        this.estado = datos.nota !== null ? 'calificada' : 'entregada';
        this.intentos = datos.intentos || 1;
        this.archivos = datos.archivos || [];
    }

    calificar(nota, comentario = '') {
        this.nota = nota;
        this.comentario = comentario;
        this.estado = 'calificada';
        this.fechaCalificacion = new Date();
    }

    esAprobada() {
        return this.nota >= DB.configuracion.notaAprobatoria;
    }
}

// ============================================
// UTILIDADES Y VALIDACIONES
// ============================================

const Validador = {
    dni: (dni) => /^\d{8}$/.test(dni),
    
    correo: (correo) => /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(correo),
    
    contrasena: (password) => {
        if (password.length < 6) return { valido: false, mensaje: 'Mínimo 6 caracteres' };
        if (!/[0-9]/.test(password)) return { valido: false, mensaje: 'Debe contener al menos un número' };
        return { valido: true };
    },
    
    idProfesor: (id) => /^PROF\d{3,}$/.test(id),
    
    idEstudiante: (id) => /^EST\d{3,}$/.test(id),
    
    nota: (nota) => {
        const n = parseFloat(nota);
        return !isNaN(n) && n >= DB.configuracion.notaMinima && n <= DB.configuracion.notaMaxima;
    },

    camposRequeridos: (datos, campos) => {
        for (const campo of campos) {
            if (!datos[campo] || datos[campo].trim() === '') {
                return { valido: false, campo };
            }
        }
        return { valido: true };
    }
};

const Utils = {
    formatearFecha: (fecha) => {
        return new Date(fecha).toLocaleDateString('es-PE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    formatearFechaCorta: (fecha) => {
        return new Date(fecha).toLocaleDateString('es-PE');
    },

    formatearHora: (fecha) => {
        return new Date(fecha).toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    calcularTiempoTranscurrido: (fecha) => {
        const ahora = new Date();
        const diff = ahora - new Date(fecha);
        const minutos = Math.floor(diff / 60000);
        const horas = Math.floor(diff / 3600000);
        const dias = Math.floor(diff / 86400000);

        if (minutos < 60) return `Hace ${minutos} minutos`;
        if (horas < 24) return `Hace ${horas} horas`;
        return `Hace ${dias} días`;
    },

    generarColor: (texto) => {
        let hash = 0;
        for (let i = 0; i < texto.length; i++) {
            hash = texto.charCodeAt(i) + ((hash << 5) - hash);
        }
        const color = Math.abs(hash).toString(16).substring(0, 6);
        return '#' + '000000'.substring(0, 6 - color.length) + color;
    },

    sanitizar: (texto) => {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            "/": '&#x2F;',
        };
        return texto.replace(/[&<>"'/]/g, (char) => map[char]);
    }
};

// ============================================
// SISTEMA DE NOTIFICACIONES
// ============================================

const Notificaciones = {
    crear: (usuarioId, datos) => {
        const notif = {
            id: `NOT${Date.now()}`,
            usuarioId,
            tipo: datos.tipo, // info, success, warning, error
            titulo: datos.titulo,
            mensaje: datos.mensaje,
            leida: false,
            fecha: new Date(),
            accion: datos.accion || null
        };
        
        if (!DB.notificaciones.has(usuarioId)) {
            DB.notificaciones.set(usuarioId, []);
        }
        DB.notificaciones.get(usuarioId).push(notif);
        return notif;
    },

    obtener: (usuarioId) => {
        return DB.notificaciones.get(usuarioId) || [];
    },

    marcarLeida: (usuarioId, notifId) => {
        const notifs = DB.notificaciones.get(usuarioId);
        if (notifs) {
            const notif = notifs.find(n => n.id === notifId);
            if (notif) notif.leida = true;
        }
    },

    contarNoLeidas: (usuarioId) => {
        const notifs = DB.notificaciones.get(usuarioId) || [];
        return notifs.filter(n => !n.leida).length;
    }
};

// ============================================
// GESTIÓN DE USUARIOS
// ============================================

const GestionUsuarios = {
    registrar: (datos, tipo) => {
        try {
            // Validar campos requeridos
            const camposRequeridos = ['nombres', 'apellidos', 'dni', 'correo', 'id', 'contrasena'];
            const validacionCampos = Validador.camposRequeridos(datos, camposRequeridos);
            if (!validacionCampos.valido) {
                return { 
                    exito: false, 
                    mensaje: `El campo ${validacionCampos.campo} es requerido.` 
                };
            }

            // Validar DNI
            if (!Validador.dni(datos.dni)) {
                return { exito: false, mensaje: 'El DNI debe tener exactamente 8 dígitos numéricos.' };
            }

            // Validar correo
            if (!Validador.correo(datos.correo)) {
                return { exito: false, mensaje: 'El correo debe ser una cuenta de Gmail válida (@gmail.com).' };
            }

            // Validar contraseña
            const validacionPass = Validador.contrasena(datos.contrasena);
            if (!validacionPass.valido) {
                return { exito: false, mensaje: validacionPass.mensaje };
            }

            // Validar ID según tipo
            if (tipo === 'profesor' && !Validador.idProfesor(datos.id)) {
                return { exito: false, mensaje: 'El ID debe tener el formato PROF### (ej: PROF001)' };
            }
            if (tipo === 'estudiante' && !Validador.idEstudiante(datos.id)) {
                return { exito: false, mensaje: 'El ID debe tener el formato EST### (ej: EST001)' };
            }

            // Verificar existencia
            if (DB.usuarios.has(datos.id)) {
                return { exito: false, mensaje: 'Este ID ya está registrado.' };
            }

            const correoExiste = Array.from(DB.usuarios.values()).some(u => u.correo === datos.correo);
            if (correoExiste) {
                return { exito: false, mensaje: 'Este correo ya está registrado.' };
            }

            // Crear usuario
            let nuevoUsuario;
            if (tipo === 'profesor') {
                nuevoUsuario = new Profesor(datos);
            } else {
                nuevoUsuario = new Estudiante(datos);
            }

            DB.usuarios.set(datos.id, nuevoUsuario);
            
            // Notificación de bienvenida
            Notificaciones.crear(nuevoUsuario.id, {
                tipo: 'success',
                titulo: '¡Bienvenido!',
                mensaje: `Tu cuenta ha sido creada exitosamente. ¡Comienza a explorar!`
            });

            return { 
                exito: true, 
                mensaje: 'Registro exitoso. Serás redirigido al login.',
                usuario: nuevoUsuario
            };

        } catch (error) {
            console.error('Error en registro:', error);
            return { exito: false, mensaje: 'Error al procesar el registro. Intenta nuevamente.' };
        }
    },

    iniciarSesion: (id, contrasena) => {
        try {
            if (!id || !contrasena) {
                return { exito: false, mensaje: 'Debes completar todos los campos.' };
            }

            const usuario = DB.usuarios.get(id);
            
            if (!usuario) {
                return { exito: false, mensaje: 'Usuario no encontrado.' };
            }

            if (usuario.contrasena !== contrasena) {
                return { exito: false, mensaje: 'Contraseña incorrecta.' };
            }

            usuario.actualizarAcceso();
            DB.sesionActual = usuario;

            Notificaciones.crear(usuario.id, {
                tipo: 'info',
                titulo: 'Sesión iniciada',
                mensaje: `Bienvenido de vuelta, ${usuario.nombres}!`
            });

            return { 
                exito: true, 
                usuario: usuario,
                mensaje: `Bienvenido, ${usuario.getNombreCompleto()}!`
            };

        } catch (error) {
            console.error('Error en login:', error);
            return { exito: false, mensaje: 'Error al iniciar sesión.' };
        }
    },

    cerrarSesion: () => {
        DB.sesionActual = null;
        return { exito: true };
    },

    obtenerSesion: () => {
        return DB.sesionActual;
    },

    verificarSesion: (tipoRequerido = null) => {
        if (!DB.sesionActual) {
            return { valido: false, mensaje: 'Debes iniciar sesión.' };
        }
        
        if (tipoRequerido && DB.sesionActual.tipo !== tipoRequerido) {
            return { 
                valido: false, 
                mensaje: `Esta página es solo para ${tipoRequerido}es.` 
            };
        }

        return { valido: true, usuario: DB.sesionActual };
    }
};

// ============================================
// GESTIÓN DE TAREAS (PROFESORES)
// ============================================

const GestionTareas = {
    crear: (datos) => {
        try {
            const sesion = GestionUsuarios.verificarSesion('profesor');
            if (!sesion.valido) return { exito: false, mensaje: sesion.mensaje };

            // Validar campos
            const camposRequeridos = ['titulo', 'descripcion', 'curso', 'fechaEntrega'];
            const validacion = Validador.camposRequeridos(datos, camposRequeridos);
            if (!validacion.valido) {
                return { exito: false, mensaje: `El campo ${validacion.campo} es requerido.` };
            }

            // Validar fecha
            const fechaEntrega = new Date(datos.fechaEntrega);
            if (fechaEntrega <= new Date()) {
                return { exito: false, mensaje: 'La fecha de entrega debe ser futura.' };
            }

            const nuevaTarea = new Tarea({
                ...datos,
                profesorId: sesion.usuario.id
            });

            DB.tareas.set(nuevaTarea.id, nuevaTarea);
            sesion.usuario.tareasCreadas.push(nuevaTarea.id);
            sesion.usuario.actualizarEstadisticas();

            // Notificar a estudiantes
            Array.from(DB.usuarios.values())
                .filter(u => u.tipo === 'estudiante')
                .forEach(est => {
                    Notificaciones.crear(est.id, {
                        tipo: 'info',
                        titulo: 'Nueva tarea disponible',
                        mensaje: `${nuevaTarea.titulo} - ${nuevaTarea.curso}`,
                        accion: { tipo: 'ver_tarea', tareaId: nuevaTarea.id }
                    });
                });

            return { 
                exito: true, 
                tarea: nuevaTarea,
                mensaje: 'Tarea creada exitosamente!'
            };

        } catch (error) {
            console.error('Error al crear tarea:', error);
            return { exito: false, mensaje: 'Error al crear la tarea.' };
        }
    },

    obtener: (tareaId) => {
        return DB.tareas.get(tareaId);
    },

    obtenerPorProfesor: (profesorId) => {
        return Array.from(DB.tareas.values())
            .filter(t => t.profesorId === profesorId)
            .sort((a, b) => b.fechaCreacion - a.fechaCreacion);
    },

    obtenerTodas: () => {
        return Array.from(DB.tareas.values())
            .sort((a, b) => b.fechaCreacion - a.fechaCreacion);
    },

    actualizar: (tareaId, datos) => {
        const tarea = DB.tareas.get(tareaId);
        if (!tarea) return { exito: false, mensaje: 'Tarea no encontrada.' };

        Object.assign(tarea, datos);
        return { exito: true, tarea };
    },

    eliminar: (tareaId) => {
        const sesion = GestionUsuarios.verificarSesion('profesor');
        if (!sesion.valido) return { exito: false, mensaje: sesion.mensaje };

        const tarea = DB.tareas.get(tareaId);
        if (!tarea || tarea.profesorId !== sesion.usuario.id) {
            return { exito: false, mensaje: 'No autorizado.' };
        }

        DB.tareas.delete(tareaId);
        return { exito: true, mensaje: 'Tarea eliminada.' };
    }
};

// ============================================
// GESTIÓN DE CALIFICACIONES (PROFESORES)
// ============================================

const GestionCalificaciones = {
    asignarNota: (tareaId, estudianteId, nota, comentario = '') => {
        try {
            const sesion = GestionUsuarios.verificarSesion('profesor');
            if (!sesion.valido) return { exito: false, mensaje: sesion.mensaje };

            const tarea = DB.tareas.get(tareaId);
            if (!tarea || tarea.profesorId !== sesion.usuario.id) {
                return { exito: false, mensaje: 'Tarea no encontrada o no autorizado.' };
            }

            if (!Validador.nota(nota)) {
                return { 
                    exito: false, 
                    mensaje: `La nota debe estar entre ${DB.configuracion.notaMinima} y ${DB.configuracion.notaMaxima}.` 
                };
            }

            const claveEntrega = `${tareaId}_${estudianteId}`;
            let entrega = DB.entregas.get(claveEntrega);

            if (!entrega) {
                entrega = new Entrega({
                    tareaId,
                    estudianteId,
                    nota: parseFloat(nota),
                    comentario
                });
                DB.entregas.set(claveEntrega, entrega);
            } else {
                entrega.calificar(parseFloat(nota), comentario);
            }

            // Notificar al estudiante
            const estudiante = DB.usuarios.get(estudianteId);
            if (estudiante) {
                estudiante.calcularEstadisticas();
                Notificaciones.crear(estudianteId, {
                    tipo: entrega.esAprobada() ? 'success' : 'warning',
                    titulo: 'Tarea calificada',
                    mensaje: `${tarea.titulo}: ${nota}/${DB.configuracion.notaMaxima}`,
                    accion: { tipo: 'ver_nota', tareaId }
                });
            }

            return { 
                exito: true, 
                entrega,
                mensaje: 'Nota asignada correctamente!'
            };

        } catch (error) {
            console.error('Error al asignar nota:', error);
            return { exito: false, mensaje: 'Error al asignar la nota.' };
        }
    },

    obtenerEntregasPorTarea: (tareaId) => {
        const entregas = [];
        DB.entregas.forEach((entrega, clave) => {
            if (entrega.tareaId === tareaId) {
                const estudiante = DB.usuarios.get(entrega.estudianteId);
                entregas.push({
                    ...entrega,
                    estudiante: estudiante ? {
                        id: estudiante.id,
                        nombre: estudiante.getNombreCompleto(),
                        avatar: estudiante.avatar
                    } : null
                });
            }
        });
        return entregas;
    },

    obtenerEstadisticasTarea: (tareaId) => {
        const entregas = GestionCalificaciones.obtenerEntregasPorTarea(tareaId);
        const calificadas = entregas.filter(e => e.nota !== null);
        
        if (calificadas.length === 0) {
            return {
                total: entregas.length,
                calificadas: 0,
                promedio: 0,
                aprobados: 0,
                desaprobados: 0
            };
        }

        const notas = calificadas.map(e => e.nota);
        const promedio = notas.reduce((a, b) => a + b, 0) / notas.length;
        const aprobados = calificadas.filter(e => e.esAprobada()).length;

        return {
            total: entregas.length,
            calificadas: calificadas.length,
            promedio: promedio.toFixed(2),
            aprobados,
            desaprobados: calificadas.length - aprobados,
            notaMasAlta: Math.max(...notas),
            notaMasBaja: Math.min(...notas)
        };
    }
};

// ============================================
// GESTIÓN PARA ESTUDIANTES
// ============================================

const GestionEstudiante = {
    obtenerTareas: () => {
        const sesion = GestionUsuarios.verificarSesion('estudiante');
        if (!sesion.valido) return [];

        const todasLasTareas = Array.from(DB.tareas.values());
        
        return todasLasTareas.map(tarea => {
            const claveEntrega = `${tarea.id}_${sesion.usuario.id}`;
            const entrega = DB.entregas.get(claveEntrega);
            const profesor = DB.usuarios.get(tarea.profesorId);

            return {
                ...tarea,
                profesor: profesor ? profesor.getNombreCompleto() : 'Desconocido',
                entrega: entrega || null,
                nota: entrega ? entrega.nota : null,
                comentario: entrega ? entrega.comentario : '',
                estado: entrega ? 
                    (entrega.nota !== null ? 'calificada' : 'entregada') : 
                    (tarea.estaVencida() ? 'vencida' : 'pendiente'),
                diasRestantes: tarea.getDiasRestantes()
            };
        }).sort((a, b) => {
            // Ordenar: pendientes primero, luego por fecha
            if (a.estado === 'pendiente' && b.estado !== 'pendiente') return -1;
            if (a.estado !== 'pendiente' && b.estado === 'pendiente') return 1;
            return new Date(a.fechaEntrega) - new Date(b.fechaEntrega);
        });
    },

    obtenerEstadisticas: () => {
        const sesion = GestionUsuarios.verificarSesion('estudiante');
        if (!sesion.valido) return null;

        sesion.usuario.calcularEstadisticas();
        return sesion.usuario.estadisticas;
    },

    obtenerCalificaciones: () => {
        const sesion = GestionUsuarios.verificarSesion('estudiante');
        if (!sesion.valido) return [];

        const calificaciones = [];
        DB.entregas.forEach(entrega => {
            if (entrega.estudianteId === sesion.usuario.id && entrega.nota !== null) {
                const tarea = DB.tareas.get(entrega.tareaId);
                if (tarea) {
                    calificaciones.push({
                        tarea: tarea.titulo,
                        curso: tarea.curso,
                        nota: entrega.nota,
                        comentario: entrega.comentario,
                        fecha: entrega.fechaCalificacion,
                        aprobado: entrega.esAprobada()
                    });
                }
            }
        });

        return calificaciones.sort((a, b) => b.fecha - a.fecha);
    }
};

// ============================================
// INICIALIZACIÓN Y DATOS DE PRUEBA
// ============================================

function inicializarDatosPrueba() {
    // Profesores de prueba
    const profesores = [
        {
            id: 'PROF001',
            nombres: 'Carlos',
            apellidos: 'Mendoza Ruiz',
            dni: '12345678',
            correo: 'carlos.mendoza@gmail.com',
            contrasena: '123456',
            especialidad: 'Matemáticas'
        },
        {
            id: 'PROF002',
            nombres: 'María',
            apellidos: 'García López',
            dni: '87654321',
            correo: 'maria.garcia@gmail.com',
            contrasena: '123456',
            especialidad: 'Comunicación'
        }
    ];

    profesores.forEach(p => {
        const profesor = new Profesor(p);
        profesor.agregarCurso(p.especialidad);
        DB.usuarios.set(p.id, profesor);
    });

    // Estudiantes de prueba
    const estudiantes = [
        {
            id: 'EST001',
            nombres: 'Ana',
            apellidos: 'Martínez Silva',
            dni: '45678912',
            correo: 'ana.martinez@gmail.com',
            contrasena: '123456',
            grado: '5to',
            seccion: 'A'
        },
        {
            id: 'EST002',
            nombres: 'Luis',
            apellidos: 'Rodríguez Pérez',
            dni: '78945612',
            correo: 'luis.rodriguez@gmail.com',
            contrasena: '123456',
            grado: '5to',
            seccion: 'A'
        },
        {
            id: 'EST003',
            nombres: 'Carmen',
            apellidos: 'Torres Vega',
            dni: '32165498',
            correo: 'carmen.torres@gmail.com',
            contrasena: '123456',
            grado: '5to',
            seccion: 'B'
        }
    ];

    estudiantes.forEach(e => {
        const estudiante = new Estudiante(e);
        DB.usuarios.set(e.id, estudiante);
    });

    // Tareas de prueba
    const tareasPrueba = [
        {
            titulo: 'Resolver Ecuaciones Cuadráticas',
            descripcion: 'Resolver los ejercicios del 1 al 15 de la página 45 del libro de texto. Mostrar todo el procedimiento.',
            curso: 'Matemática',
            profesorId: 'PROF001',
            fechaEntrega: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            tipo: 'tarea',
            puntos: 20
        },
        {
            titulo: 'Análisis de "Cien Años de Soledad"',
            descripcion: 'Realizar un análisis literario de los primeros 3 capítulos, enfocándose en los personajes principales y el realismo mágico.',
            curso: 'Comunicación',
            profesorId: 'PROF002',
            fechaEntrega: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            tipo: 'tarea',
            puntos: 20
        }
    ];
    tareasPrueba.forEach(t => {
        const nuevaTarea = new Tarea(t);
        DB.tareas.set(nuevaTarea.id, nuevaTarea);
        const profesor = DB.usuarios.get(t.profesorId); 
        if (profesor) {
            profesor.tareasCreadas.push(nuevaTarea.id);
            profesor.actualizarEstadisticas();
        }
    });
}
// Función para hacer peticiones a la API
async function fetchAPI(endpoint, options = {}) {
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };

    if (authToken) {
        config.headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error en la petición:', error);
        throw error;
    }
}