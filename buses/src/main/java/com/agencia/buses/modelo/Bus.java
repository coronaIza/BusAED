package com.agencia.buses.modelo;

// Clase del modelo Bus sin anotaciones JPA para demostrar acceso directo por JDBC
public class Bus {
    private Integer id;
    private String placa;
    private String modelo;
    private Integer capacidad;
    private String estado; // ACTIVO, MANTENIMIENTO, INACTIVO

    public Bus() {}

    public Bus(Integer id, String placa, String modelo, Integer capacidad, String estado) {
        this.id = id;
        this.placa = placa;
        this.modelo = modelo;
        this.capacidad = capacidad;
        this.estado = estado;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getPlaca() { return placa; }
    public void setPlaca(String placa) { this.placa = placa; }

    public String getModelo() { return modelo; }
    public void setModelo(String modelo) { this.modelo = modelo; }

    public Integer getCapacidad() { return capacidad; }
    public void setCapacidad(Integer capacidad) { this.capacidad = capacidad; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
}
