    /* Link do formulário de solicitação de acesso de administrador */
    (function () {
        var a = document.getElementById('authAdminReq'); if (!a) return;
        var url = a.getAttribute('data-forms-admin');
        if (url) { a.href = url; return; }
        a.addEventListener('click', function (e) {
            e.preventDefault();
            var m = document.getElementById('authMsg'); if (m) { m.textContent = 'O link do formulário ainda não foi configurado.'; m.hidden = false; }
        });
    })();
    