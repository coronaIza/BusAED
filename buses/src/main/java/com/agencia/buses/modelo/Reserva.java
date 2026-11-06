package com.agencia.buses.modelo;

import java.time.LocalDateTime;

// Reserva de un asiento para un viaje concreto.
// El estado se usa para historial y cancelaciones sin perder la información.
public class Reserva {

    private Integer id;
    private Integer idViaje;
    private Integer numeroAsiento;
    private String correoCliente;
    private String nombrePasajero;
    private String estado;
    private LocalDateTime fechaReserva;

    public Reserva() {
    }

    public Reserva(String pasajero, Integer numeroAsiento) {
        this.nombrePasajero = pasajero;
        this.numeroAsiento = numeroAsiento;
        this.estado = "CONFIRMADA";
        this.fechaReserva = LocalDateTime.now();
    }

    public Reserva(Integer idViaje, Integer numeroAsiento, String correoCliente, String nombrePasajero) {
        this.idViaje = idViaje;
        this.numeroAsiento = numeroAsiento;
        this.correoCliente = correoCliente;
        this.nombrePasajero = nombrePasajero;
        this.estado = "CONFIRMADA";
        this.fechaReserva = LocalDateTime.now();
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getIdViaje() {
        return idViaje;
    }

    public void setIdViaje(Integer idViaje) {
        this.idViaje = idViaje;
    }

    public Integer getNumeroAsiento() {
        return numeroAsiento;
    }

    public void setNumeroAsiento(Integer numeroAsiento) {
        this.numeroAsiento = numeroAsiento;
    }

    public String getCorreoCliente() {
        return correoCliente;
    }

    public void setCorreoCliente(String correoCliente) {
        this.correoCliente = correoCliente;
    }

    public String getNombrePasajero() {
        return nombrePasajero;
    }

    public void setNombrePasajero(String nombrePasajero) {
        this.nombrePasajero = nombrePasajero;
    }

    public String getPasajero() {
        return nombrePasajero;
    }

    public void setPasajero(String pasajero) {
        this.nombrePasajero = pasajero;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public LocalDateTime getFechaReserva() {
        return fechaReserva;
    }

    public void setFechaReserva(LocalDateTime fechaReserva) {
        this.fechaReserva = fechaReserva;
    }
}
