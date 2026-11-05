document.addEventListener("DOMContentLoaded", () => {
    const formularioPersonal = document.getElementById("formularioPersonal");
    const tablaPersonal = document.getElementById("tablaPersonal");
    const mensajeAlerta = document.getElementById("mensajeAlerta");

    // Tu sistema usa CSRF nativo, obtenemos el token para poder enviar datos
    async function tokenCsrf() {
        const respuesta = await fetch("/api/auth/csrf");
        if (!respuesta.ok) throw new Error("No se pudo obtener el token de seguridad");
        return (await respuesta.json()).token;
    }

    // 1. Cargar el personal existente
    cargarPersonal();

    // 2. Registrar empleado
    formularioPersonal.addEventListener("submit", async (e) => {
        e.preventDefault();

        // OJO: Tu backend actual (AuthControlador) espera "nombre", "correo" y "clave"
        const empleado = {
            nombre: document.getElementById("nombre").value,
            correo: document.getElementById("email").value, 
            clave: document.getElementById("password").value,
            rol: document.getElementById("rol").value 
        };

        try {
            const respuesta = await fetch("/api/auth/registro", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-XSRF-TOKEN": await tokenCsrf() // Enviamos el CSRF en lugar del Bearer
                },
                body: JSON.stringify(empleado)
            });

            if (respuesta.ok) {
                mostrarAlerta("Empleado registrado con éxito", "success");
                formularioPersonal.reset();
                cargarPersonal(); 
            } else {
                const datos = await respuesta.json();
                mostrarAlerta("Error al registrar: " + (datos.error || "Datos inválidos"), "danger");
            }
        } catch (error) {
            mostrarAlerta("Error de conexión con el servidor", "danger");
        }
    });

    // 3. Obtener usuarios
    async function cargarPersonal() {
        try {
            const respuesta = await fetch("/api/auth/usuarios"); // RUTA que devuelve todos los usuarios
            if (respuesta.ok) {
                const usuarios = await respuesta.json();
                tablaPersonal.innerHTML = "";
                
                // Excluimos a los PASAJEROS de esta vista
                const empleados = usuarios.filter(u => (u.rol || "").toUpperCase() !== "CLIENTE");

                empleados.forEach(emp => {
                    let rolMayus = (emp.rol || "").toUpperCase();
                    let colorRol = rolMayus === 'ADMIN' ? 'bg-danger' : 
                                   rolMayus === 'CHOFER' ? 'bg-primary' : 'bg-success';

                    tablaPersonal.innerHTML += `
                        <tr>
                            <td>${emp.id || '-'}</td>
                            <td class="fw-bold">${emp.nombre}</td>
                            <td>${emp.correo || emp.email}</td>
                            <td><span class="badge ${colorRol}">${rolMayus}</span></td>
                            <td>
                                <button class="btn btn-sm btn-outline-danger" onclick="alert('En construcción')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
        } catch (error) {
            console.log("Tabla de personal pendiente de conexión con backend.");
        }
    }

    // 4. Cerrar sesión
    document.getElementById("btnCerrarSesion").addEventListener("click", async () => {
        // Para cerrar sesión con cookies, normalmente se hace un POST a /logout o se limpia la cookie
        window.location.assign("/login.html");
    });

    function mostrarAlerta(mensaje, tipo) {
        mensajeAlerta.innerHTML = `<div class="alert alert-${tipo} py-2 text-center">${mensaje}</div>`;
        setTimeout(() => mensajeAlerta.innerHTML = "", 3000);
    }
});