(async function () {
    const usuario = await obtenerUsuario();

    if (!usuario) {
        window.location.href = '/paginas/login.html';
        return;
    }

    document.getElementById('nombre-usuario').textContent = usuario.nombre;
    document.querySelector('.inicio').hidden = false;

    document.getElementById('btn-logout').addEventListener('click', async () => {
        await api('/logout', { method: 'POST' });
        window.location.href = '/paginas/login.html';
    });
})();
