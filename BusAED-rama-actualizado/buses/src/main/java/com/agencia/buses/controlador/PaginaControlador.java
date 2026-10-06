package com.agencia.buses.controlador;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PaginaControlador {

    @GetMapping("/")
    public String inicio() {
        return "redirect:/login.html";
    }
}
