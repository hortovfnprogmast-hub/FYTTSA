// fyttsa-backup.js — Helper de descarga de respaldo (nota E4)
// Permite descargar un backup JSON de los datos locales de la página actual.
// Se incluye con: <script src="fyttsa-backup.js"></script>
// Agrega automáticamente un botón flotante "Descargar respaldo" en cada reporte.
(function () {
    function downloadBackup() {
        // Recopila todas las claves fyttsa_* de localStorage
        var data = {};
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key && key.indexOf('fyttsa_') === 0) {
                    data[key] = localStorage.getItem(key);
                }
            }
        } catch (e) { /* ignore */ }
        data['_meta'] = {
            pagina: location.pathname.split('/').pop(),
            fecha: new Date().toISOString(),
            usuario: (localStorage.getItem('nombre') || localStorage.getItem('usuario') || '—')
        };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        var ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        a.href = url;
        a.download = 'fyttsa_respaldo_' + ts + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function injectButton() {
        if (document.getElementById('fyttsa-backup-fab')) return;
        var btn = document.createElement('button');
        btn.id = 'fyttsa-backup-fab';
        btn.title = 'Descargar respaldo de este reporte (E4)';
        btn.innerHTML = '<i data-lucide="download"></i>';
        btn.style.cssText = 'position:fixed;bottom:20px;left:20px;width:48px;height:48px;border-radius:50%;' +
            'background:#000000;color:#fff;border:none;cursor:pointer;z-index:9999;' +
            'box-shadow:0 6px 18px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;';
        btn.addEventListener('click', downloadBackup);
        document.body.appendChild(btn);
        if (window.lucide) { try { lucide.createIcons(); } catch (e) {} }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectButton);
    } else {
        injectButton();
    }
})();
