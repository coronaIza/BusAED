package com.agencia.buses.modelo;

import jakarta.persistence.*;

// Entidad JPA para la autenticacion requerida por el profesor
@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // Aquí le decimos a Spring: "La variable se llama correo,
    // pero guárdala en la columna 'email' de la base de datos".
    @Column(name = "email", unique = true, nullable = false)
    private String correo;

    // Y aquí: "La variable se llama clave,
    // pero guárdala en la columna 'password' de la base de datos"
    @Column(name = "password", nullable = false)
    private String clave;

    private String nombre;
    private String rol; // ADMIN o PASAJERO

    public Usuario() {}

    public Usuario(String correo, String clave, String nombre, String rol) {
        this.correo = correo;
        this.clave = clave;
        this.nombre = nombre;
        this.rol = rol;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }

    public String getClave() { return clave; }
    public void setClave(String clave) { this.clave = clave; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = rol; }
}