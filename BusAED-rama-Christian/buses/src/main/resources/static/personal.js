document.addEventListener("DOMContentLoaded", () => {
    const formularioPersonal = document.getElementById("formularioPersonal");
    const tablaPersonal = document.getElementById("tablaPersonal");
    const mensajeAlerta = document.getElementById("mensajeAlerta");
    //LÃ³gica para mostrar/ocultar los campos extra si es chofer
    const selectRol = document.getElementById("rol");
    const divCamposChofer = document.getElementById("camposChofer");


    // Tu sistema usa CSRF nativo, obtenemos el token para poder enviar datos
    async function tokenCsrf() {
        const respuesta = await fetch("/api/auth/csrf");
        if (!respuesta.ok) throw new Error("No se pudo obtener el token de seguridad");
        return (await respuesta.json()).token;
    }

    // 1. Cargar el personal existente
    cargarPersonal();

    // LÃ³gica para mostrar/ocultar los campos extra si es chofer
    selectRol.addEventListener("change", function() {
        if (this.value === "CHOFER") {
            divCamposChofer.style.display = "block";
        } else {
            divCamposChofer.style.display = "none";
            // Limpiamos los campos si cambia de opiniÃ³n
            document.getElementById("apellidos").value = "";
            document.getElementById("licencia").value = "";
            document.getElementById("telefono").value = "";
        }
    });

    // 2. Registrar empleado
    formularioPersonal.addEventListener("submit", async (e) => {
        e.preventDefault();

        // OJO: Tu backend actual (AuthControlador) espera "nombre", "correo" y "clave"
        const empleado = {
            nombre: document.getElementById("nombre").value,
            correo: document.getElementById("email").value,
            clave: document.getElementById("password").value,
            rol: document.getElementById("rol").value,
            // Nuevos campos (si estÃ¡n vacÃ­os, se enviarÃ¡n en blanco)
            apellidos: document.getElementById("apellidos").value,
            licencia: document.getElementById("licencia").value,
            telefono: document.getElementById("telefono").value
        };

        try {
            const respuesta = await fetch("/api/auth/registro", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-XSRF-TOKEN": await tokenCsrf()
                },
                body: JSON.stringify(empleado)
            });

            if (respuesta.ok) {
                mostrarAlerta("Empleado registrado con Ã©xito", "success");
                formularioPersonal.reset();
                cargarPersonal(); 
            } else {
                const datos = await respuesta.json();
                mostrarAlerta("Error al registrar: " + (datos.error || "Datos invÃ¡lidos"), "danger");
            }
        } catch (error) {
            mostrarAlerta("Error de conexiÃ³n con el servidor", "danger");
        }
    });

    // 3. Obtener usuarios
    // 3. Obtener usuarios y dibujarlos
    async function cargarPersonal() {
        try {
            const respuesta = await fetch("/api/auth/usuarios");
            if (respuesta.ok) {
                const usuarios = await respuesta.json();
                tablaPersonal.innerHTML = "";

                const empleados = usuarios.filter(u => (u.rol || "").toUpperCase() !== "CLIENTE");

                empleados.forEach(emp => {
                    let rolMayus = (emp.rol || "").toUpperCase();
                    let colorRol = rolMayus === 'ADMIN' ? 'bg-danger' : 
                                   rolMayus === 'CHOFER' ? 'bg-primary' : 'bg-success';

                    let estadoActual = emp.estado || 'ACTIVO';
                    let colorEstado = estadoActual === 'ACTIVO' ? 'bg-success' : 'bg-secondary';
                    let iconoBoton = estadoActual === 'ACTIVO' ? 'bi-slash-circle' : 'bi-check-circle';
                    let claseBoton = estadoActual === 'ACTIVO' ? 'btn-outline-warning' : 'btn-outline-success';
                    let titleBoton = estadoActual === 'ACTIVO' ? 'Desactivar Empleado' : 'Reactivar Empleado';

                    tablaPersonal.innerHTML += `
                        <tr class="${estadoActual === 'INACTIVO' ? 'text-muted' : ''}">
                            <td>${emp.id || '-'}</td>
                            <td class="fw-bold">${emp.nombre}</td>
                            <td>${emp.correo || emp.email}</td>
                            <td><span class="badge ${colorRol}">${rolMayus}</span></td>
                            <td><span class="badge ${colorEstado}">${estadoActual}</span></td>
                            <td>
                                <!-- BotÃ³n de Borrado LÃ³gico -->
                                <button class="btn btn-sm ${claseBoton} btn-alternar-estado me-1" data-id="${emp.id}" title="${titleBoton}">
                                    <i class="bi ${iconoBoton}"></i>
                                </button>
                                <!-- BotÃ³n de Borrado FÃ­sico (Para errores) -->
                                <button class="btn btn-sm btn-outline-danger btn-eliminar-fisico" data-id="${emp.id}" title="Eliminar registro errÃ³neo">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });

                // Evento 1: Alternar estado (Borrado LÃ³gico)
                document.querySelectorAll('.btn-alternar-estado').forEach(btn => {
                    btn.addEventListener('click', async function() {
                        const idEmpleado = this.getAttribute('data-id');
                        if (confirm(`Â¿Cambiar el estado de acceso del empleado con ID ${idEmpleado}?`)) {
                            try {
                                const res = await fetch(`/api/auth/usuarios/${idEmpleado}/estado`, {
                                    method: "PATCH",
                                    headers: { "X-XSRF-TOKEN": await tokenCsrf() }
                                });
                                
                                if (res.ok) {
                                    mostrarAlerta("Estado del empleado actualizado", "success");
                                    cargarPersonal(); 
                                } else {
                                    mostrarAlerta("No se pudo cambiar el estado", "danger");
                                }
                            } catch (e) {
                                mostrarAlerta("Error de conexiÃ³n al intentar actualizar", "danger");
                            }
                        }
                    });
                });

                // Evento 2: Eliminar definitivamente (Borrado FÃ­sico)
                document.querySelectorAll('.btn-eliminar-fisico').forEach(btn => {
                    btn.addEventListener('click', async function() {
                        const idEmpleado = this.getAttribute('data-id');
                        if (confirm(`ATENCIÃ“N: Â¿EstÃ¡s seguro de ELIMINAR FÃSICAMENTE al empleado con ID ${idEmpleado}? Esto no se puede deshacer.`)) {
                            try {
                                const res = await fetch(`/api/auth/usuarios/${idEmpleado}`, {
                                    method: "DELETE",
                                    headers: { "X-XSRF-TOKEN": await tokenCsrf() }
                                });
                                
                                if (res.ok) {
                                    mostrarAlerta("Empleado eliminado del sistema", "success");
                                    cargarPersonal(); 
                                } else {
                                    const errorData = await res.json();
                                    mostrarAlerta(errorData.error || "No se pudo eliminar al empleado", "danger");
                                }
                            } catch (e) {
                                mostrarAlerta("Error de conexiÃ³n al intentar eliminar", "danger");
                            }
                        }
                    });
                });
            }
        } catch (error) {
            console.log("Tabla de personal pendiente de conexiÃ³n con backend.");
        }
    }

    // 4. Cerrar sesiÃ³n
    document.getElementById("btnCerrarSesion").addEventListener("click", async () => {
        // Para cerrar sesiÃ³n con cookies, normalmente se hace un POST a /logout o se limpia la cookie
        window.location.assign("/login.html");
    });

    function mostrarAlerta(mensaje, tipo) {
        mensajeAlerta.innerHTML = `<div class="alert alert-${tipo} py-2 text-center">${mensaje}</div>`;
        setTimeout(() => mensajeAlerta.innerHTML = "", 3000);
    }
});