const formularioRegistro = document.getElementById("formularioRegistro");
const mensajeRegistro = document.getElementById("mensaje");

formularioRegistro.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    mensajeRegistro.textContent = "";
    try {
        const csrfRespuesta = await fetch("/api/auth/csrf");
        if (!csrfRespuesta.ok) {
            throw new Error("No se pudo iniciar la sesión segura");
        }
        const csrf = await csrfRespuesta.json();
        const respuesta = await fetch("/api/auth/registro", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-XSRF-TOKEN": csrf.token
            },
            body: JSON.stringify({
                nombre: document.getElementById("nombre").value,
                correo: document.getElementById("correo").value,
                clave: document.getElementById("clave").value
            })
        });

        let datos;
        const texto = await respuesta.text();

        // Evitamos el error si el backend no devuelve nada
        try {
            datos = texto ? JSON.parse(texto) : {};
        } catch (e) {
            console.error("Respuesta no es JSON válido:", texto);
            throw new Error("Error inesperado en el servidor (Código " + respuesta.status + ")");
        }

        if (!respuesta.ok) {
            mensajeRegistro.textContent = datos.error || "No fue posible crear la cuenta";
            return;
        }
        window.location.assign("/login.html?registro=ok");
    } catch (error) {
        mensajeRegistro.textContent = error.message || "No se pudo conectar con el servidor";
    }
});