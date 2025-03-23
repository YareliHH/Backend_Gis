const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const GEMINI_API_KEY = 'AIzaSyBqJpohIy7Btan8s7y7vAShC-JDiVMdvbE';

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    message: { error: 'Demasiadas solicitudes, por favor intente más tarde' },
});

const respuestasPersonalizadas = {
    "cita": `Cómo realizar una compra en GisLive Boutique Clínica<br><br>
      <strong>Acceder a la Tienda</strong><br>
      - Ingresa a nuestro sitio web oficial.<br>
      - Explora nuestro catálogo de productos.<br><br>
      <strong>Seleccionar Productos</strong><br>
      - Elige los uniformes clínicos que necesitas.<br>
      - Agrega los productos al carrito de compras.<br><br>
      <strong>Finalizar Compra</strong><br>
      - Verifica los artículos en tu carrito.<br>
      - Ingresa tu información de envío y pago.<br><br>
      <strong>Confirmación</strong><br>
      - Recibirás un correo con los detalles de tu compra y el número de seguimiento.`,

    "horario": "Nuestro horario de atención es de lunes a viernes de 9:00 AM a 7:00 PM y sábados de 10:00 AM a 3:00 PM.",

    "ubicación": "Nos encontramos en Huejutla de Reyes, Hidalgo. Puedes ver nuestra ubicación en Google Maps aquí: [LINK]",

    "precios": "Nuestros precios varían según el tipo de uniforme y accesorios. Consulta nuestro catálogo en línea o contáctanos para obtener una cotización personalizada.",

    "promociones": "Contamos con descuentos en compras por volumen y promociones especiales en temporadas específicas. Consulta nuestra sección de ofertas para más detalles.",

    "pago": "Aceptamos pagos con tarjeta de crédito/débito, transferencia bancaria y efectivo en nuestra tienda física. Si necesitas más información, no dudes en contactarnos.",

    "duracion": "El tiempo de entrega depende de la ubicación y el método de envío seleccionado. Te proporcionaremos un número de seguimiento para que puedas monitorear tu pedido.",

    "disponibilidad": "Puedes consultar la disponibilidad de nuestros productos en la tienda en línea o contactarnos para verificar existencias.",

 
   
};

const verificarRespuestaPersonalizada = (mensaje) => {
    for (const palabraClave in respuestasPersonalizadas) {
        const regex = new RegExp(`\\b${palabraClave}\\b`, "i");
        if (regex.test(mensaje)) {
            return respuestasPersonalizadas[palabraClave];
        }
    }
    return null;
};

router.post('/chat', limiter, async (req, res) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Mensaje inválido' });
    }

    const respuestaPersonalizada = verificarRespuestaPersonalizada(message);
    if (respuestaPersonalizada) {
        return res.json({ response: respuestaPersonalizada });
    }

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${AIzaSyBqJpohIy7Btan8s7y7vAShC-JDiVMdvbE}`,
            {
                contents: [
                    {
                        parts: [{ text: `Responde en español: ${message}` }],
                    },
                ],
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const geminiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No hay respuesta disponible';

        res.json({ response: geminiResponse });

    } catch (error) {
        console.error('Error en Gemini:', error);
        res.status(500).json({ error: 'Error procesando el mensaje' });
    }
});

module.exports = router;
