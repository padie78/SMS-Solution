function limpiarTexto(texto) {
    // Elimina espacios dobles y caracteres extraños de Textract
    return texto.replace(/\s+/g, ' ').trim();
}

function validarCampos(datos) {
    return datos.cantidad && datos.unidad && datos.tipo_energia;
}

module.exports = { limpiarTexto, validarCampos };