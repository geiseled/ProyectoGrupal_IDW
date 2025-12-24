// Variables globales
let sesionActual = null;
let tareasData = [];
let filtroActual = 'todas';

document.addEventListener('DOMContentLoaded', async () => {
    authToken = sessionStorage.getItem('authToken');
    const usuario = JSON.parse(sessionStorage.getItem('usuario'));
    
    if (!authToken || !usuario || usuario.tipo !== 'estudiante') {
        alert('Debes iniciar sesión como estudiante');
        window.location.href = '../login.html';
        return;
    }

    cargarDatosEstudiante(usuario);
    await cargarTareas();
    await cargarEstadisticas();
});
// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarDatosEstudiante();
    cargarTareas();
    configurarEventos();
});
        
function verificarSesion() {
    // Simular sesión de estudiante
    sesionActual = {
        id: 'EST001',
        nombres: 'Ana',
        apellidos: 'García',
        grado: '5to',
        seccion: 'A',
        tipo: 'estudiante'
    };

    document.getElementById('nombreEstudiante').textContent = 
        `${sesionActual.nombres} ${sesionActual.apellidos}`;
    document.getElementById('infoEstudiante').textContent = 
        `${sesionActual.grado} ${sesionActual.seccion} - ${sesionActual.id}`;
    document.getElementById('userAvatar').textContent = 
        sesionActual.nombres.charAt(0) + sesionActual.apellidos.charAt(0);
}

async function cargarEstadisticas() {
    try {
        const resultado = await fetchAPI('/estadisticas/estudiante');
        
        if (resultado.exito) {
            const stats = resultado.estadisticas;
            document.getElementById('totalTareas').textContent = stats.total_tareas;
            document.getElementById('tareasPendientes').textContent = stats.pendientes;
            document.getElementById('tareasCalificadas').textContent = stats.calificadas;
            document.getElementById('promedioGeneral').textContent = stats.promedio;
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

function configurarEventos() {
    document.getElementById('btnCerrarSesion').addEventListener('click', () => {
        if (confirm('¿Deseas cerrar sesión?')) {
            window.location.href = '../index.html';
        }
    });
}

async function cargarTareas() {
    try {
        const resultado = await fetchAPI('/tareas/estudiante');
        
        if (resultado.exito) {
            tareasData = resultado.tareas;
            renderizarTareas();
        }
    } catch (error) {
        console.error('Error al cargar tareas:', error);
    }
}

function renderizarTareas() {
    const container = document.getElementById('tareasContainer');
    let tareasFiltradas = tareasData;

    // Aplicar filtro
    if (filtroActual === 'pendientes') {
        tareasFiltradas = tareasData.filter(t => t.estado === 'pendiente');
    } else if (filtroActual === 'calificadas') {
        tareasFiltradas = tareasData.filter(t => t.estado === 'calificada');
    }

    if (tareasFiltradas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h3>No hay tareas ${filtroActual === 'todas' ? '' : filtroActual}</h3>
                <p>¡Estás al día con tus actividades!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = tareasFiltradas.map(tarea => {
        const estadoClase = tarea.estado === 'calificada' ? 'graded' : 
                            tarea.diasRestantes < 0 ? 'expired' : 'pending';
        
        const notaColor = tarea.nota >= 17 ? '' : 
                            tarea.nota >= 14 ? 'medium' : 'low';

        return `
            <div class="task-card ${estadoClase}">
                <div class="task-header">
                    <div>
                        <div class="task-title">${tarea.titulo}</div>
                        <div class="task-meta">
                            <span class="meta-item">📚 ${tarea.curso}</span>
                            <span class="meta-item">👨‍🏫 ${tarea.profesor}</span>
                            <span class="meta-item">📅 ${formatearFecha(tarea.fechaEntrega)}</span>
                            ${tarea.diasRestantes > 0 ? 
                                `<span class="meta-item">⏰ ${tarea.diasRestantes} días restantes</span>` : 
                                tarea.diasRestantes < 0 ? 
                                `<span class="meta-item" style="color: #f5576c;">⚠️ Vencida</span>` : ''
                            }
                        </div>
                    </div>
                </div>
                
                <div class="task-description">${tarea.descripcion}</div>
                
                ${tarea.nota !== null ? `
                    <div class="comment-box">
                        <strong>💬 Comentario del profesor:</strong>
                        ${tarea.comentario || 'Sin comentarios'}
                    </div>
                ` : ''}
                
                <div class="task-footer">
                    <div class="task-status">
                        ${tarea.estado === 'calificada' ? `
                            <span class="badge graded">✅ Calificada</span>
                            <span class="grade-display ${notaColor}">
                                🏆 ${tarea.nota}/20
                            </span>
                        ` : tarea.diasRestantes < 0 ? `
                            <span class="badge expired">⚠️ Vencida</span>
                        ` : `
                            <span class="badge pending">⏳ Pendiente</span>
                        `}
                    </div>
                    <button class="btn btn-upload" disabled title="Funcionalidad en desarrollo">
                        📤 Subir Tarea
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function filtrarTareas(filtro) {
    filtroActual = filtro;
    
    // Actualizar tabs activos
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderizarTareas();
}

function formatearFecha(fecha) {
    const date = new Date(fecha);
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-ES', opciones);
}

function generarColor(texto) {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
        hash = texto.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colores = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    ];
    return colores[Math.abs(hash) % colores.length];
}