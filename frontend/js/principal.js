// Página Principal: navegación por carpetas, crear y renombrar carpetas.

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
                    <span class="icono-${el.tipo}">${icono(ICONOS[el.tipo])}</span>
                    ${el.tipo === 'carpeta'
                        ? `<button type="button" class="abrir-carpeta" title="${escaparHtml(el.nombre)}">${escaparHtml(el.nombre)}</button>`
                        : `<span title="${escaparHtml(el.nombre)}">${escaparHtml(el.nombre)}</span>`}
                </span>
                <span class="col-extra">${formatearFecha(el.actualizado_en)}</span>
                <span class="col-extra">${el.tipo === 'carpeta' ? '—' : formatearTamano(el.tamano)}</span>
                ${el.tipo === 'carpeta'
                    ? `<button type="button" class="boton-icono btn-opciones" aria-label="Opciones de ${escaparHtml(el.nombre)}" aria-haspopup="menu">${icono(ICONOS.opciones)}</button>`
                    : '<span></span>'}
            </li>
        `).join('');

        listaVacia.textContent = carpetaActual ? 'Esta carpeta está vacía.' : 'Aún no tienes archivos.';
        listaVacia.hidden = elementos.length > 0;
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

        if (e.target.closest('.abrir-carpeta')) {
            abrirCarpeta(fila.dataset.id);
        } else if (e.target.closest('.btn-opciones')) {
            abrirMenu(fila, e.target.closest('.btn-opciones'));
        } else if (e.target.matches('.seleccion')) {
            fila.classList.toggle('seleccionada', e.target.checked);
            actualizarSeleccionarTodo();
        }
    });

    // Doble clic en la fila de una carpeta también la abre (como en Drive)
    lista.addEventListener('dblclick', (e) => {
        const fila = e.target.closest('.fila');
        if (fila && fila.dataset.tipo === 'carpeta' && !e.target.closest('input, button')) {
            abrirCarpeta(fila.dataset.id);
        }
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

        if (opcion.dataset.accion === 'renombrar') {
            const carpeta = elementoMenu;

            abrirDialogo({
                titulo: 'Cambiar nombre',
                boton: 'Guardar',
                valor: carpeta.nombre,
                enviar: (nombre) => api('/carpetas/' + encodeURIComponent(carpeta.id), {
                    method: 'PATCH',
                    body: { nombre },
                }),
            });
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

    function abrirDialogo({ titulo, boton, valor, enviar }) {
        accionDialogo = enviar;
        dialogoTitulo.textContent = titulo;
        dialogoAceptar.textContent = boton;
        dialogoAceptar.disabled = false;
        dialogoError.hidden = true;
        campoNombre.value = valor;

        dialogo.showModal();
        campoNombre.select();
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

    cargar();
})();
