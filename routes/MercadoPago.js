const express = require('express');
const router = express.Router();
const db = require('../Config/db');
const verifyToken = require('../Middleware/auth');
const { MercadoPagoConfig, Preference } = require('mercadopago');

// 🔐 Configura tu Access Token de MercadoPago
const client = new MercadoPagoConfig({
  accessToken: 'APP_USR-4446643915013686-070920-66961f94b8401e2730fc918ee580146d-2543693813',
});

// 🌐 URL base de tu backend
const APP_URL = 'https://backend-gis-1.onrender.com';

// 🛒 Crear compra (con MercadoPago incluido)
router.post('/crear_preferencia', verifyToken, async (req, res) => {
  const { productos, total, metodoPago, direccionEnvio, costoEnvio } = req.body;
  const usuario_id = req.usuario.id;

  if (!productos || productos.length === 0) {
    return res.status(400).json({ message: 'El carrito está vacío' });
  }

  // Estado inicial de la venta
  const estadoVenta = (metodoPago == 4 || metodoPago == 3) ? 'pendiente' : 'pagado';

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 🧾 1️⃣ Insertar venta
    const [ventaResult] = await connection.query(
      `INSERT INTO ventas (usuario_id, costo_envio, total, metodo_pago_id, direccion_envio, estado, fecha)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [usuario_id, costoEnvio || 0, total, metodoPago, direccionEnvio || null, estadoVenta]
    );
    const venta_id = ventaResult.insertId;

    // 🛍️ 2️⃣ Insertar productos en detalle_compra
    const valoresProductos = productos.map(p => [
      venta_id,
      p.cantidad,
      p.precio_compra,
      p.producto_id
    ]);
    await connection.query(
      `INSERT INTO detalle_compra (compra_id, cantidad, precio_compra, producto_id) VALUES ?`,
      [valoresProductos]
    );

    // 📜 3️⃣ Registrar historial de la venta
    await connection.query(
      `INSERT INTO historial_ventas (venta_id, estado_anterior, estado_nuevo, cambio_por, fecha)
       VALUES (?, ?, ?, ?, NOW())`,
      [venta_id, 'N/A', estadoVenta, 'Sistema']
    );

    await connection.commit();

    // 💳 4️⃣ Si es MercadoPago
    if (metodoPago == 4) {
      const items = productos.map((p, index) => ({
        title: p.nombre || `Producto ${index + 1}`,
        quantity: Number(p.cantidad),
        unit_price: Number(p.precio_compra),
        currency_id: 'MXN',
      }));

      const preference = {
        items,
        back_urls: {
          success: `${APP_URL}/verificar-pago`,
          failure: `${APP_URL}/verificar-pago`,
          pending: `${APP_URL}/verificar-pago`,
        },
        auto_return: 'approved',
        external_reference: venta_id.toString(),
      };

      try {
        const preferenceClient = new Preference(client);
        const result = await preferenceClient.create({ body: preference });

        connection.release();
        return res.json({
          message: 'Compra registrada, redirige a Mercado Pago',
          init_point: result.init_point,
          id_preferencia: result.id,
        });
      } catch (error) {
        console.error('❌ Error creando preferencia MercadoPago:', error);
        await connection.rollback();
        connection.release();
        return res.status(500).json({ message: 'Error creando preferencia de pago' });
      }
    }

    // 💵 5️⃣ Pago en efectivo
    if (metodoPago == 3) {
      connection.release();
      return res.json({
        message: 'Compra registrada con pago en efectivo, pendiente por confirmar',
        redirect: '/pago-pendiente'
      });
    }

    // ✅ 6️⃣ Otros métodos (tarjeta, transferencia, etc.)
    connection.release();
    return res.json({ message: 'Compra realizada con éxito' });

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch (rollbackError) {
        console.error('Error al hacer rollback:', rollbackError);
      }
    }
    console.error('Error en la compra:', error);
    return res.status(500).json({ message: 'Error al procesar la compra' });
  }
});

module.exports = router;
