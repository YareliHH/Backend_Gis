const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Preference } = require('mercadopago');

// 🔐 Configura tu Access Token
const client = new MercadoPagoConfig({
    accessToken: 'APP_USR-4446643915013686-070920-66961f94b8401e2730fc918ee580146d-2543693813',
});

// 🌐 URL de tu frontend (ajusta según el entorno)
const APP_URL = 'https://backend-gis-1.onrender.com';

router.post('/crear_preferencia', async (req, res) => {
    try {
        const { carrito } = req.body;

        // Validar que el carrito no esté vacío
        if (!Array.isArray(carrito) || carrito.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío o no es válido.' });
        }

        // 🛒 Formatear los productos del carrito para Mercado Pago
        const items = carrito.map((item, index) => ({
            title: item.nombre || `Producto ${index + 1}`,
            quantity: Number(item.cantidad_carrito),
            unit_price: Number(item.precio_carrito),
            currency_id: 'MXN',
        }));

        // Crear el cuerpo de la preferencia
        const preference = {
            items,
            back_urls: {
                success: `${APP_URL}/cliente/pago-exitoso`,
                failure: `${APP_URL}/cliente/pago-fallido`,
                pending: `${APP_URL}/cliente/pago-pendiente`,
            },
            auto_return: 'approved',
        };

        //  Crear preferencia con Mercado Pago
        const preferenceClient = new Preference(client);
        const result = await preferenceClient.create({ body: preference });

        // ✅ Respuesta con ID y link de pago
        res.status(200).json({
            id: result.id,
            init_point: result.init_point,
        });

    } catch (error) {
        console.error(' Error al crear la preferencia:', error);
        res.status(500).json({
            error: 'Error al crear la preferencia de pago',
            message: error.message,
        });
    }
});

module.exports = router;
