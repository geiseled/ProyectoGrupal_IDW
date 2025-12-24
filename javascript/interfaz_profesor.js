// Variables globales
let sesionActual = null;

// Verificar token al cargar
document.addEventListener('DOMContentLoaded', async () => {
    authToken = sessionStorage.getItem('authToken');
    const usuario = JSON.parse(sessionStorage.getItem('usuario'));
    
    if (!authToken || !usuario || usuario.tipo !== 'profesor') {
        alert('Debes iniciar sesión como profesor');
        window.location.href = '../login.html';
        return;
    }

    cargarDatosProfesor(usuario);
    await cargarTareas();
});

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarEstadisticas();
    cargarTareas();
    configurarEventos();
});

function verificarSesion() {
    // Simular verificación de sesión
    sesionActual = {
        id: 'PROF001',
        nombres: 'Carlos',
        apellidos: 'Mendoza',
        tipo: 'profesor'
    };

    document.getElementById('nombreProfesor').textContent = 
        `${sesionActual.nombres} ${sesionActual.apellidos}`;
    document.getElementById('userAvatar').textContent = 
        sesionActual.nombres.charAt(0) + sesionActual.apellidos.charAt(0);
}

function cargarEstadisticas() {
    document.getElementById('totalTareas').textContent = '8';
    document.getElementById('tareasActivas').textContent = '5';
    document.getElementById('totalEstudiantes').textContent = '24';
    document.getElementById('calificaciones').textContent = '18';
}

function configurarEventos() {
    // Formulario crear tarea
    document.getElementById('formCrearTarea').addEventListener('submit', (e) => {
        e.preventDefault();
        crearTarea();
    });

    // Cerrar sesión
    document.getElementById('btnCerrarSesion').addEventListener('click', () => {
        if (confirm('¿Deseas cerrar sesión?')) {
            window.location.href = '../index.html';
        }
    });

    // Establecer fecha mínima
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fechaEntrega').setAttribute('min', today);
}

function cambiarTab(tab) {
    // Cambiar tabs activos
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(`seccion${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');

    if (tab === 'tareas') {
        cargarTareas();
    }
}

document.getElementById('formCrearTarea').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const datos = {
        titulo: document.getElementById('tituloTarea').value,
        descripcion: document.getElementById('descripcionTarea').value,
        curso: document.getElementById('cursoTarea').value,
        tipo: document.getElementById('tipoTarea').value,
        fechaEntrega: document.getElementById('fechaEntrega').value
    };

    try {
        const resultado = await fetchAPI('/tareas', {
            method: 'POST',
            body: JSON.stringify(datos)
        });

        if (resultado.exito) {
            alert('✅ ¡Tarea creada exitosamente!');
            document.getElementById('formCrearTarea').reset();
            await cargarTareas();
        } else {
            alert(resultado.mensaje);
        }
    } catch (error) {
        alert('Error al crear la tarea');
    }
});

async function cargarTareas() {
    try {
        const resultado = await fetchAPI('/tareas/profesor');
        
        if (resultado.exito) {
            renderizarTareas(resultado.tareas);
        }
    } catch (error) {
        console.error('Error al cargar tareas:', error);
    }
}

function abrirModalCalificar(tareaId) {
    const modal = document.getElementById('modalCalificar');
    const contenido = document.getElementById('contenidoCalificacion');

    const estudiantes = [
        { id: 'EST001', nombre: 'Ana Martínez Silva', nota: 18, comentario: 'Excelente trabajo' },
        { id: 'EST002', nombre: 'Luis Rodríguez Pérez', nota: null, comentario: '' },
        { id: 'EST003', nombre: 'Carmen Torres Vega', nota: 16, comentario: 'Buen esfuerzo' }
    ];

    contenido.innerHTML = `
        <div class="students-grid">
            ${estudiantes.map(est => `
                <div class="student-card">
                    <div class="student-header">
                        <div class="student-avatar" style="background: ${generarColor(est.nombre)}">
                            ${est.nombre.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div class="student-info">
                            <h4>${est.nombre}</h4>
                            <p>${est.id}</p>
                        </div>
                    </div>
                    <div class="grade-form">
                        <div class="grade-input-group">
                            <div class="form-group">
                                <label>Nota (0-20)</label>
                                <input 
                                    type="number" 
                                    id="nota_${est.id}" 
                                    min="0" 
                                    max="20" 
                                    step="0.5"
                                    value="${est.nota || ''}"
                                    placeholder="0-20"
                                >
                            </div>
                            <div class="form-group">
                                <label>Comentario</label>
                                <input 
                                    type="text" 
                                    id="comentario_${est.id}" 
                                    value="${est.comentario}"
                                    placeholder="Comentario opcional"
                                >
                            </div>
                            <button class="btn btn-primary" onclick="guardarNota('${tareaId}', '${est.id}')">
                                💾 Guardar
                            </button>
                        </div>
                        ${est.nota !== null ? `
                            <span class="grade-status graded">
                                ✅ Calificado: ${est.nota}/20
                            </span>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    modal.classList.add('active');
}

function cerrarModal() {
    document.getElementById('modalCalificar').classList.remove('active');
}

async function guardarNota(tareaId, estudianteId) {
    const nota = document.getElementById(`nota_${estudianteId}`).value;
    const comentario = document.getElementById(`comentario_${estudianteId}`).value;

    try {
        const resultado = await fetchAPI('/calificaciones', {
            method: 'POST',
            body: JSON.stringify({
                tarea_id: tareaId,
                estudiante_id: estudianteId,
                nota: parseFloat(nota),
                comentario: comentario
            })
        });

        if (resultado.exito) {
            alert('✅ Nota guardada exitosamente!');
            await abrirModalCalificar(tareaId);
        } else {
            alert(resultado.mensaje);
        }
    } catch (error) {
        alert('Error al guardar la nota');
    }
}

function formatearFecha(fechaStr) {
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(fechaStr).toLocaleDateString('es-ES', opciones);
}

function generarColor(nombre) {
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
        hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = `hsl(${hash % 360}, 70%, 60%)`;
    return color;
}