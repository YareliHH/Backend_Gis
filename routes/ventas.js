const express = require('express');
const router = express.Router();
const db = require('../Config/db');

const mercadopago = require('mercadopago');

// ⚙️ Configura MercadoPago con tu token
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_TOKEN
});

router.get('/verificar-pago', async (req, res) => {
  const { collection_status, external_reference } = req.query;
  const venta_id = parseInt(external_reference);

  if (!venta_id || !collection_status) {
    return res.redirect('https://gisliveboutique.com/cliente/pago-fallido');
  }

  try {
    if (collection_status === 'approved') {
      // ✅ Actualizar estado a pagado
      await db.query(
        `UPDATE ventas SET estado = 'pagado' WHERE id = ?`,
        [venta_id]
      );

      // 📜 Registrar historial
      await db.query(
        `INSERT INTO historial_ventas (venta_id, estado_anterior, estado_nuevo, cambio_por, fecha) 
         VALUES (?, ?, ?, ?, NOW())`,
        [venta_id, 'pendiente', 'pagado', 'MercadoPago']
      );

      return res.redirect('https://gisliveboutique.com/cliente/pago-exitoso');

    } else if (collection_status === 'in_process') {
      return res.redirect('https://gisliveboutique.com/cliente/pago-pendiente');
    } else {
      return res.redirect('https://gisliveboutique.com/cliente/pago-fallido');
    }
  } catch (error) {
    console.error('❌ Error en /verificar-pago:', error);
    return res.redirect('https://gisliveboutique.com/cliente/pago-fallido');
  }
});

router.get('/historial/:venta_id', async (req, res) => {
  const { venta_id } = req.params;

  try {
    const [historial] = await db.query(
      `SELECT estado_anterior, estado_nuevo, cambio_por, fecha
       FROM historial_ventas WHERE venta_id = ? ORDER BY fecha DESC`,
      [venta_id]
    );

    res.json(historial);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error al obtener historial de venta' });
  }
});

module.exports = router;
