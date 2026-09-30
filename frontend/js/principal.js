// Página Principal: navegación por carpetas, crear y renombrar; subir, abrir y descargar archivos.

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

    // Elemento sobre el que se abrió el menú ⋮
    let elementoMenu = null;

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

        lista.innerHTML = elementos.map((el) => `
            <li class="fila" data-id="${el.id}" data-tipo="${el.tipo}">
                <input type="checkbox" class="seleccion" aria-label="Seleccionar ${escaparHtml(el.nombre)}">
                <span class="nombre-elemento">
                    <span class="icono-${el.tipo} ${el.tipo === 'archivo' ? 'tipo-' + categoriaArchivo(el.tipo_mime, el.nombre) : ''}">${icono(ICONOS[el.tipo])}</span>
                    <button type="button" class="abrir-elemento" title="${escaparHtml(el.nombre)}">${escaparHtml(el.nombre)}</button>
                </span>
                <span class="col-extra">${formatearFecha(el.actualizado_en)}</span>
                <span class="col-extra">${el.tipo === 'carpeta' ? '—' : formatearTamano(el.tamano)}</span>
                <button type="button" class="boton-icono btn-opciones" aria-label="Opciones de ${escaparHtml(el.nombre)}" aria-haspopup="menu">${icono(ICONOS.opciones)}</button>
            </li>
        `).join('');

        listaVacia.textContent = carpetaActual ? 'Esta carpeta está vacía.' : 'Aún no tienes archivos.';
        listaVacia.hidden = elementos.length > 0;
    }

    function abrirElemento(fila) {
        if (fila.dataset.tipo === 'carpeta') {
            abrirCarpeta(fila.dataset.id);
        } else {
            abrirArchivo(fila.dataset.id);
        }
    }

    // El navegador muestra PDF, imágenes, video, etc.; el resto se descarga
    function abrirArchivo(id) {
        window.open(urlDescarga(id) + '?modo=ver', '_blank', 'noopener');
    }

    function descargarArchivo(id) {
        window.location.href = urlDescarga(id);
    }

    function urlDescarga(id) {
        return API_URL + '/archivos/' + encodeURIComponent(id) + '/descargar';
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

    lista.addEventListener('click', (e) => {
        const fila = e.target.closest('.fila');
        if (!fila) return;

        if (e.target.closest('.abrir-elemento')) {
            abrirElemento(fila);
        } else if (e.target.closest('.btn-opciones')) {
            abrirMenu(fila, e.target.closest('.btn-opciones'));
        } else if (e.target.matches('.seleccion')) {
            fila.classList.toggle('seleccionada', e.target.checked);
            actualizarSeleccionarTodo();
        }
    });

    // Doble clic en cualquier parte de la fila también la abre (como en Drive)
    lista.addEventListener('dblclick', (e) => {
        const fila = e.target.closest('.fila');
        if (fila && !e.target.closest('input, button')) abrirElemento(fila);
    });

    seleccionarTodo.addEventListener('change', () => {
        lista.querySelectorAll('.fila').forEach((fila) => {
            fila.querySelector('.seleccion').checked = seleccionarTodo.checked;
            fila.classList.toggle('seleccionada', seleccionarTodo.checked);
        });
    });

    function actualizarSeleccionarTodo() {
        const casillas = [...lista.querySelectorAll('.seleccion')];
        seleccionarTodo.checked = casillas.length > 0 && casillas.every((c) => c.checked);
    }

    // ---------------------------------------------------------------------
    // Menú de opciones (⋮)
    // ---------------------------------------------------------------------

    function abrirMenu(fila, boton) {
        elementoMenu = elementos.find((el) => el.id === fila.dataset.id);

        menu.querySelectorAll('[data-tipos]').forEach((opcion) => {
            opcion.hidden = !opcion.dataset.tipos.split(' ').includes(elementoMenu.tipo);
        });

        const caja = boton.getBoundingClientRect();
        menu.hidden = false;

        const izquierda = Math.min(caja.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 8);
        menu.style.left = Math.max(8, izquierda) + window.scrollX + 'px';
        menu.style.top = caja.bottom + 4 + window.scrollY + 'px';
    }

    function cerrarMenu() {
        menu.hidden = true;
    }

    document.addEventListener('click', (e) => {
        if (!menu.hidden && !e.target.closest('#menu-opciones, .btn-opciones')) cerrarMenu();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarMenu();
    });

    menu.addEventListener('click', (e) => {
        const opcion = e.target.closest('[data-accion]');
        if (!opcion) return;

        cerrarMenu();
        const elemento = elementoMenu;

        switch (opcion.dataset.accion) {
            case 'abrir':
                abrirArchivo(elemento.id);
                break;

            case 'descargar':
                descargarArchivo(elemento.id);
                break;

            case 'renombrar': {
                const ruta = elemento.tipo === 'carpeta' ? '/carpetas/' : '/archivos/';

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
        }
    });

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
