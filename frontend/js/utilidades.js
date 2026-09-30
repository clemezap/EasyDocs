// Funciones y constantes que usan varias páginas.

const ICONOS = {
    carpeta: '<path class="relleno" d="M3 6a2 2 0 0 1 2-2h4.2a2 2 0 0 1 1.4.6L12 6h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    archivo: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    nuevaCarpeta: '<path d="M3 6a2 2 0 0 1 2-2h4.2a2 2 0 0 1 1.4.6L12 6h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6M9 13h6"/>',
    opciones: '<circle class="relleno" cx="12" cy="5" r="1.6"/><circle class="relleno" cx="12" cy="12" r="1.6"/><circle class="relleno" cx="12" cy="19" r="1.6"/>',
    renombrar: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    separador: '<path d="M9 6l6 6-6 6"/>',
};

function icono(trazos) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${trazos}</svg>`;
}

// Para insertar texto del usuario dentro de HTML sin que se interprete
function escaparHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML;
}

// MySQL devuelve "2026-09-30 15:13:47" en UTC
function formatearFecha(valor) {
    if (!valor) return '—';

    const fecha = new Date(valor.replace(' ', 'T') + 'Z');

    return fecha.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function formatearTamano(bytes) {
    if (bytes === null || bytes === undefined) return '—';

    const unidades = ['B', 'KB', 'MB', 'GB'];
    let valor = Number(bytes);
    let i = 0;

    while (valor >= 1024 && i < unidades.length - 1) {
        valor /= 1024;
        i++;
    }

    return `${i === 0 ? valor : valor.toFixed(1)} ${unidades[i]}`;
}
