// Clase que representa a un estudiante dentro del sistema
class Estudiante {
    constructor(nombres, apellidos, dni, correo, id, contrasena) {
        this.nombres = nombres;
        this.apellidos = apellidos;
        this.dni = dni;
        this.correo = correo;
        this.id = id;
        this.contrasena = contrasena;
    }

    // Getters
    getNombres() {
        return this.nombres;
    }

    getApellidos() {
        return this.apellidos;
    }

    getDni() {
        return this.dni;
    }

    getCorreo() {
        return this.correo;
    }

    getId() {
        return this.id;
    }

    getContrasena() {
        return this.contrasena;
    }

    // Setters
    setNombres(nombres) {
        this.nombres = nombres;
    }

    setApellidos(apellidos) {
        this.apellidos = apellidos;
    }

    setDni(dni) {
        this.dni = dni;
    }

    setCorreo(correo) {
        this.correo = correo;
    }

    setId(id) {
        this.id = id;
    }

    setContrasena(contrasena) {
        this.contrasena = contrasena;
    }
}

// Validar que el DNI tenga exactamente 8 digitos numericos
function validarDni(dni) {
    const dniRegex = /^\d{8}$/;
    return dniRegex.test(dni);
}

// Validar que el correo pertenezca a Gmail
function validarCorreo(correo) {
    const correoRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    return correoRegex.test(correo);
}

// Validar que la contraseña tenga al menos 6 caracteres
function validarContrasena(contrasena) {
    return contrasena.length >= 6;
}

// Escuchar el evento de envio del formulario
document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("formEstudiante");

    form.addEventListener("submit", function(event) {
        event.preventDefault();

        // Obtener los valores del formulario
        const nombres = document.getElementById("nombres").value.trim();
        const apellidos = document.getElementById("apellidos").value.trim();
        const dni = document.getElementById("dni").value.trim();
        const correo = document.getElementById("correo").value.trim();
        const id = document.getElementById("id").value.trim();
        const contrasena = document.getElementById("contrasena").value.trim();

        // Validaciones
        if (!validarDni(dni)) {
            alert("El DNI debe tener exactamente 8 dígitos numéricos.");
            return;
        }

        if (!validarCorreo(correo)) {
            alert("El correo debe ser una cuenta de Gmail válida.");
            return;
        }

        if (!validarContrasena(contrasena)) {
            alert("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        // Crear un nuevo objeto Estudiante
        const estudiante = new Estudiante(nombres, apellidos, dni, correo, id, contrasena);
        console.log("Estudiante registrado:", estudiante);

        alert("Registro de estudiante completado correctamente.");
        form.reset();
    });
});