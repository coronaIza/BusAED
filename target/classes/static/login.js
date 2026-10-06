const formularioLogin = document.getElementById("formularioLogin");
const mensajeLogin = document.getElementById("mensaje");

async function tokenCsrf() {
    const respuesta = await fetch("/api/auth/csrf");
    if (!respuesta.ok) {
        throw new Error("No se pudo iniciar la sesión segura");
    }
    return (await respuesta.json()).token;
}

formularioLogin.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    mensajeLogin.textContent = "";
    try {
        const respuesta = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-XSRF-TOKEN": await tokenCsrf()
            },
            body: JSON.stringify({
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
            mensajeLogin.textContent = datos.error || "No fue posible iniciar sesión";
            return;
        }

        // Redirección condicional según el rol
        const destinos = { ADMIN: "/index.html", CHOFER: "/chofer.html" };
        const rolNormalizado = datos.rol ? datos.rol.toUpperCase() : "";
        window.location.assign(destinos[rolNormalizado] || "/pasajero.html");
    } catch (error) {
        mensajeLogin.textContent = error.message || "No se pudo conectar con el servidor";
    }
});

if (new URLSearchParams(window.location.search).get("registro") === "ok") {
    mensajeLogin.style.color = "#24713b";
    mensajeLogin.textContent = "Cuenta creada. Inicia sesión con tus datos.";
}