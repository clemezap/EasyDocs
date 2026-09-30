// Página Principal: navegación por carpetas; crear, renombrar y enviar a la papelera;
// subir y descargar archivos.

(async function () {
    const usuario = await sesion;
    if (!usuario) return;

    const ruta = document.getElementById('ruta');
    const lista = document.getElementById('lista-elementos');
    const listaVacia = document.getElementById('lista-vacia');
    const seleccionarTodo = document.getElementById('seleccionar-todo');
    const menu = document.getElementById('menu-opciones');

    const dialogo = document.getElementById('dialogo-nombre');
    const formNombre = document.getElementById('form-nombre');
    const campoNombre = document.getElementById('campo-nombre');
    const dialogoTitulo = document.getElementById('dialogo-titulo');
    const dialogoError = document.getElementById('dialogo-error');
    const dialogoAceptar = document.getElementById('dialogo-aceptar');

    // null = raíz. Se guarda en la URL (?carpeta=<id>) para poder recargar y usar "atrás".
    let carpetaActual = new URLSearchParams(location.search).get('carpeta');
    let elementos = [];

    // Qué hace el diálogo al aceptar: crear una carpeta o renombrar una existente
    let accionDialogo = null;

    // ---------------------------------------------------------------------
    // Carga y dibujo
    // ---------------------------------------------------------------------

    async function cargar() {
        const consulta = carpetaActual ? '?carpeta=' + encodeURIComponent(carpetaActual) : '';
        const { ok, status, datos } = await api('/carpetas/contenido' + consulta);

        if (!ok) {
            elementos = [];
            dibujarRuta([]);
            lista.innerHTML = '';
            listaVacia.innerHTML = status === 404
                ? 'La carpeta no existe o fue eliminada. <a href="/index.html">Volver a Principal</a>'
                : escaparHtml(mensajeDeError(datos));
            listaVacia.hidden = false;
            return;
        }

        elementos = [
            ...datos.carpetas.map((c) => ({ ...c, tipo: 'carpeta' })),
            ...datos.archivos.map((a) => ({ ...a, tipo: 'archivo' })),
        ];

        dibujarRuta(datos.ruta);
        dibujarLista();
    }

    function dibujarRuta(carpetas) {
        const partes = [{ id: null, nombre: 'Principal' }, ...carpetas];

        ruta.innerHTML = partes.map((parte, i) => {
            const esUltima = i === partes.length - 1;
            const separador = i > 0 ? icono(ICONOS.separador) : '';

            return esUltima
                ? `${separador}<span class="ruta-actual" aria-current="page">${escaparHtml(parte.nombre)}</span>`
                : `${separador}<button type="button" class="ruta-enlace" data-id="${parte.id ?? ''}">${escaparHtml(parte.nombre)}</button>`;
        }).join('');

        const actual = partes[partes.length - 1];
        document.title = actual.id ? `${actual.nombre} · EasyDocs` : 'EasyDocs';
    }

    function dibujarLista() {
        seleccionarTodo.checked = false;

        lista.innerHTML = elementos
            .map((el) => filaElemento(el, { fecha: 'actualizado_en', carpetaAbrible: true }))
            .join('');

        listaVacia.textContent = carpetaActual ? 'Esta carpeta está vacía.' : 'Aún no tienes archivos.';
        listaVacia.hidden = elementos.length > 0;
    }

    // Los archivos no se visualizan, solo se descargan. La descarga pasa por la API
    // (que valida la sesión), así que no se genera ningún enlace público.
    function descargarArchivo(id) {
        window.location.href = API_URL + '/archivos/' + encodeURIComponent(id) + '/descargar';
    }

    function abrirCarpeta(id) {
        carpetaActual = id || null;
        history.pushState(null, '', carpetaActual ? '?carpeta=' + encodeURIComponent(carpetaActual) : '/index.html');
        cargar();
    }

    // Botones atrás / adelante del navegador
    window.addEventListener('popstate', () => {
        carpetaActual = new URLSearchParams(location.search).get('carpeta');
        cargar();
    });

    // ---------------------------------------------------------------------
    // Navegación y selección
    // ---------------------------------------------------------------------

    ruta.addEventListener('click', (e) => {
        const enlace = e.target.closest('.ruta-enlace');
        if (enlace) abrirCarpeta(enlace.dataset.id);
    });

    prepararLista({
        lista,
        seleccionarTodo,
        menu,
        buscar: (id) => elementos.find((el) => el.id === id),
        alAbrirCarpeta: abrirCarpeta,
        alElegir: elegirOpcion,
    });

    // ---------------------------------------------------------------------
    // Opciones del menú (⋮)
    // ---------------------------------------------------------------------

    function elegirOpcion(accion, elemento) {
        const ruta = elemento.tipo === 'carpeta' ? '/carpetas/' : '/archivos/';

        switch (accion) {
            case 'descargar':
                descargarArchivo(elemento.id);
                break;

            case 'renombrar': {
                // En archivos se selecciona el nombre sin la extensión, como en Drive
                const punto = elemento.nombre.lastIndexOf('.');

                abrirDialogo({
                    titulo: 'Cambiar nombre',
                    boton: 'Guardar',
                    valor: elemento.nombre,
                    finSeleccion: elemento.tipo === 'archivo' && punto > 0 ? punto : undefined,
                    enviar: (nombre) => api(ruta + encodeURIComponent(elemento.id), {
                        method: 'PATCH',
                        body: { nombre },
                    }),
                });
                break;
            }

            case 'papelera':
                enviarAPapelera(elemento);
                break;
        }
    }

    // No se pide confirmación: se puede deshacer desde el aviso o desde la Papelera
    async function enviarAPapelera(elemento) {
        const tipo = elemento.tipo === 'carpeta' ? 'carpetas' : 'archivos';
        const { ok, datos } = await api(`/${tipo}/${encodeURIComponent(elemento.id)}/papelera`, { method: 'POST' });

        if (!ok) {
            mostrarAviso(mensajeDeError(datos));
            return;
        }

        cargar();

        mostrarAviso(`"${elemento.nombre}" se envió a la papelera.`, {
            textoAccion: 'Deshacer',
            alAccionar: async () => {
                await api(`/papelera/${tipo}/${encodeURIComponent(elemento.id)}/restaurar`, { method: 'POST' });
                cargar();
            },
        });
    }

    // ---------------------------------------------------------------------
    // Diálogo crear / renombrar
    // ---------------------------------------------------------------------

    document.getElementById('btn-nueva-carpeta').addEventListener('click', () => {
        abrirDialogo({
            titulo: 'Nueva carpeta',
            boton: 'Crear',
            valor: 'Carpeta sin título',
            enviar: (nombre) => api('/carpetas', {
                method: 'POST',
                body: { nombre, carpeta_padre: carpetaActual },
            }),
        });
    });

    function abrirDialogo({ titulo, boton, valor, finSeleccion, enviar }) {
        accionDialogo = enviar;
        dialogoTitulo.textContent = titulo;
        dialogoAceptar.textContent = boton;
        dialogoAceptar.disabled = false;
        dialogoError.hidden = true;
        campoNombre.value = valor;

        dialogo.showModal();
        campoNombre.setSelectionRange(0, finSeleccion ?? valor.length);
    }

    document.getElementById('dialogo-cancelar').addEventListener('click', () => dialogo.close());

    formNombre.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = campoNombre.value.trim();
        if (!nombre) {
            dialogoError.textContent = 'El nombre es obligatorio.';
            dialogoError.hidden = false;
            return;
        }

        dialogoAceptar.disabled = true;
        const { ok, datos } = await accionDialogo(nombre);
        dialogoAceptar.disabled = false;

        if (!ok) {
            dialogoError.textContent = mensajeDeError(datos);
            dialogoError.hidden = false;
            return;
        }

        dialogo.close();
        cargar();
    });

    // ---------------------------------------------------------------------
    // Subir archivos
    // ---------------------------------------------------------------------

    const inputArchivos = document.getElementById('input-archivos');
    const zonaLista = document.getElementById('zona-lista');
    const zonaSoltar = document.getElementById('zona-soltar');
    const panel = document.getElementById('panel-subidas');
    const panelTitulo = document.getElementById('panel-subidas-titulo');
    const panelLista = document.getElementById('panel-subidas-lista');

    let subiendo = 0;

    document.getElementById('btn-subir').addEventListener('click', () => inputArchivos.click());

    inputArchivos.addEventListener('change', () => {
        subirArchivos([...inputArchivos.files]);
        inputArchivos.value = '';
    });

    document.getElementById('panel-subidas-cerrar').addEventListener('click', () => {
        panel.hidden = true;
        panelLista.innerHTML = '';
    });

    // Se suben uno por uno: cada petición respeta el límite de tamaño por archivo
    // y no satura una instancia pequeña.
    async function subirArchivos(archivos) {
        if (archivos.length === 0) return;

        // Se guarda el destino por si el usuario cambia de carpeta mientras sube
        const destino = carpetaActual;

        const filas = archivos.map((archivo) => {
            const li = document.createElement('li');
            li.className = 'subida';
            li.innerHTML = `
                <span class="subida-nombre" title="${escaparHtml(archivo.name)}">${escaparHtml(archivo.name)}</span>
                <span class="subida-estado"><progress max="1" value="0"></progress></span>
                <span class="subida-error" hidden></span>
            `;
            panelLista.append(li);
            return li;
        });

        subiendo += archivos.length;
        panel.hidden = false;
        actualizarTituloPanel();

        for (let i = 0; i < archivos.length; i++) {
            const fila = filas[i];
            const barra = fila.querySelector('progress');

            const { ok, datos } = await subirArchivo(archivos[i], destino, (avance) => {
                barra.value = avance;
            });

            subiendo--;
            actualizarTituloPanel();

            const estado = fila.querySelector('.subida-estado');

            if (ok) {
                fila.classList.add('subida-lista');
                estado.innerHTML = icono(ICONOS.listo);
                if (destino === carpetaActual) cargar();
            } else {
                fila.classList.add('subida-fallida');
                estado.innerHTML = icono(ICONOS.error);
                const error = fila.querySelector('.subida-error');
                error.textContent = mensajeDeError(datos);
                error.hidden = false;
            }
        }
    }

    function actualizarTituloPanel() {
        panelTitulo.textContent = subiendo > 0
            ? `Subiendo ${subiendo} ${subiendo === 1 ? 'archivo' : 'archivos'}…`
            : 'Subidas completadas';
    }

    // Arrastrar y soltar archivos sobre la lista
    let arrastres = 0;

    function traeArchivos(e) {
        return e.dataTransfer && [...e.dataTransfer.types].includes('Files');
    }

    zonaLista.addEventListener('dragenter', (e) => {
        if (!traeArchivos(e)) return;
        e.preventDefault();
        arrastres++;
        zonaSoltar.hidden = false;
    });

    zonaLista.addEventListener('dragover', (e) => {
        if (traeArchivos(e)) e.preventDefault();
    });

    zonaLista.addEventListener('dragleave', () => {
        arrastres = Math.max(0, arrastres - 1);
        if (arrastres === 0) zonaSoltar.hidden = true;
    });

    zonaLista.addEventListener('drop', (e) => {
        if (!traeArchivos(e)) return;
        e.preventDefault();
        arrastres = 0;
        zonaSoltar.hidden = true;

        // Solo archivos: las carpetas arrastradas se ignoran
        const archivos = [...e.dataTransfer.items]
            .filter((item) => item.kind === 'file' && !item.webkitGetAsEntry?.()?.isDirectory)
            .map((item) => item.getAsFile());

        subirArchivos(archivos);
    });

    // Avisar antes de cerrar la pestaña si hay subidas en curso
    window.addEventListener('beforeunload', (e) => {
        if (subiendo > 0) e.preventDefault();
    });

    cargar();
})();
