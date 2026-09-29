// Lee una cookie por nombre
function leerCookie(nombre) {
    const cookie = document.cookie
        .split('; ')
        .find((c) => c.startsWith(nombre + '='));

    return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}

// Petición a la API. Envía la cookie de sesión y el token CSRF (XSRF-TOKEN).
// Devuelve { ok, status, datos }.
async function api(ruta, opciones = {}) {
    const metodo = (opciones.method || 'GET').toUpperCase();

    // Laravel entrega la cookie XSRF-TOKEN en cualquier GET
    if (metodo !== 'GET' && !leerCookie('XSRF-TOKEN')) {
        await fetch(API_URL + '/sesion', { credentials: 'same-origin' });
    }

    const headers = {
        Accept: 'application/json',
        'X-XSRF-TOKEN': leerCookie('XSRF-TOKEN') || '',
        ...(opciones.headers || {}),
    };

    let body = opciones.body;
    if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }

    const respuesta = await fetch(API_URL + ruta, {
        method: metodo,
        headers,
        body,
        credentials: 'same-origin',
    });

    const datos = await respuesta.json().catch(() => null);

    return { ok: respuesta.ok, status: respuesta.status, datos };
}

// Devuelve el usuario con sesión iniciada, o null
async function obtenerUsuario() {
    const { datos } = await api('/sesion');
    return datos ? datos.usuario : null;
}

// Muestra el primer error de validación devuelto por Laravel
function mensajeDeError(datos) {
    if (datos && datos.errors) {
        return Object.values(datos.errors)[0][0];
    }
    return (datos && datos.message) || 'Ocurrió un error. Intenta de nuevo.';
}
