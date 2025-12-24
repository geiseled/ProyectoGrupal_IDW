// Validación de fuerza de contraseña
const passwordInput = document.getElementById('contrasena');
const strengthIndicator = document.getElementById('passwordStrength');

passwordInput.addEventListener('input', (e) => {
    const password = e.target.value;
    strengthIndicator.classList.remove('weak', 'medium', 'strong');
    
    if (password.length === 0) {
        strengthIndicator.classList.remove('visible');
        return;
    }

    strengthIndicator.classList.add('visible');
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[!@#$%^&*]/.test(password)) strength++;

    if (strength <= 2) {
        strengthIndicator.classList.add('weak');
    } else if (strength <= 4) {
        strengthIndicator.classList.add('medium');
    } else {
        strengthIndicator.classList.add('strong');
    }
});

// Validación de DNI en tiempo real
document.getElementById('dni').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
});

// Formato de ID de profesor
document.getElementById('id').addEventListener('input', (e) => {
    let value = e.target.value.toUpperCase();
    if (!value.startsWith('PROF')) {
        e.target.value = 'PROF';
    }
});

// Mostrar alertas
function mostrarAlerta(mensaje, tipo) {
    const container = document.getElementById('alertContainer');
    container.innerHTML = `
        <div class="alert ${tipo}">
            ${tipo === 'success' ? '✅' : '❌'} ${mensaje}
        </div>
    `;
}