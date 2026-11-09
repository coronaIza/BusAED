package com.agencia.buses.modelo;

// Modelo Chofer: fila de la tabla "chofer". Se usa para asignar un chofer a un viaje.
public class Chofer {
    private Integer id;
    private String nombre;
    private String apellidos;
    private String licencia;
    private String telefono;
    private Integer idUsuario;

    public Chofer() {}

    public Chofer(Integer id, String nombre, String apellidos, String licencia, String telefono) {
        this.id = id;
        this.nombre = nombre;
        this.apellidos = apellidos;
        this.licencia = licencia;
        this.telefono = telefono;
    }

    public Chofer(Integer id, String nombre, String apellidos, String licencia, String telefono, Integer idUsuario) {
        this.id = id;
        this.nombre = nombre;
        this.apellidos = apellidos;
        this.licencia = licencia;
        this.telefono = telefono;
        this.idUsuario = idUsuario;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getApellidos() { return apellidos; }
    public void setApellidos(String apellidos) { this.apellidos = apellidos; }

    public String getLicencia() { return licencia; }
    public void setLicencia(String licencia) { this.licencia = licencia; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }
}
