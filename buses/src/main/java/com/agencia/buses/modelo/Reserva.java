package com.agencia.buses.modelo;

// Modelo Reserva (simple): solo se usa para demostrar la estructura Queue<Reserva>.
// En el proyecto final se conectará con la tabla reserva_boleto.
public class Reserva {

    private String pasajero;
    private Integer numeroAsiento;

    public Reserva() {
    }

    public Reserva(String pasajero, Integer numeroAsiento) {
        this.pasajero = pasajero;
        this.numeroAsiento = numeroAsiento;
    }

    public String getPasajero() {
        return pasajero;
    }

    public void setPasajero(String pasajero) {
        this.pasajero = pasajero;
    }

    public Integer getNumeroAsiento() {
        return numeroAsiento;
    }

    public void setNumeroAsiento(Integer numeroAsiento) {
        this.numeroAsiento = numeroAsiento;
    }
}
