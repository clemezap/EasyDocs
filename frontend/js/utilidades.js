// Funciones y constantes que usan varias páginas.

const ICONOS = {
    carpeta: '<path class="relleno" d="M3 6a2 2 0 0 1 2-2h4.2a2 2 0 0 1 1.4.6L12 6h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    archivo: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    nuevaCarpeta: '<path d="M3 6a2 2 0 0 1 2-2h4.2a2 2 0 0 1 1.4.6L12 6h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6M9 13h6"/>',
    opciones: '<circle class="relleno" cx="12" cy="5" r="1.6"/><circle class="relleno" cx="12" cy="12" r="1.6"/><circle class="relleno" cx="12" cy="19" r="1.6"/>',
    renombrar: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    separador: '<path d="M9 6l6 6-6 6"/>',
    subir: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    descargar: '<path d="M12 4v12M7 11l5 5 5-5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    abrir: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
    listo: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    error: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
};

// Categoría de un archivo según su extensión o su tipo MIME (para el color de su icono)
const CATEGORIAS_POR_EXTENSION = {
    pdf: 'pdf',
    csv: 'hoja', xls: 'hoja', xlsx: 'hoja', ods: 'hoja',
    doc: 'documento', docx: 'documento', odt: 'documento', txt: 'documento', md: 'documento',
    ppt: 'presentacion', pptx: 'presentacion', odp: 'presentacion',
    zip: 'comprimido', rar: 'comprimido', '7z': 'comprimido', gz: 'comprimido', tar: 'comprimido',
};

function categoriaArchivo(tipoMime, nombre = '') {
    const extension = nombre.includes('.') ? nombre.split('.').pop().toLowerCase() : '';
    if (CATEGORIAS_POR_EXTENSION[extension]) return CATEGORIAS_POR_EXTENSION[extension];

    const tipo = tipoMime || '';

    if (tipo === 'application/pdf') return 'pdf';
    if (tipo.startsWith('image/')) return 'imagen';
    if (tipo.startsWith('video/') || tipo.startsWith('audio/')) return 'multimedia';
    if (/zip|rar|7z|tar|gzip/.test(tipo)) return 'comprimido';
    if (/sheet|excel|csv/.test(tipo)) return 'hoja';
    // Antes que "documento": los .pptx también contienen "officedocument"
    if (/presentation|powerpoint/.test(tipo)) return 'presentacion';
    if (/word|document|text\//.test(tipo)) return 'documento';

    return 'otro';
}

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
