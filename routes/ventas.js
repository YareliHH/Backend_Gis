// backend/routes/ventas.js
const express = require('express');
const router = express.Router();
const db = require("../Config/db");

// Obtener una venta por ID con sus detalles
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const queryVenta = "SELECT * FROM ventas WHERE id = ?";
  const queryDetalles = "SELECT * FROM detalles_venta WHERE venta_id = ?";

  db.query(queryVenta, [id], (err, ventaResult) => {
    if (err) return res.status(500).json({ error: err.message });
    if (ventaResult.length === 0) return res.status(404).json({ error: "Venta no encontrada" });

    const venta = ventaResult[0];
    db.query(queryDetalles, [id], (errDetalles, detallesResult) => {
      if (errDetalles) return res.status(500).json({ error: errDetalles.message });

      venta.detalles = detallesResult;
      res.json(venta);
    });
  });
});

// Registrar una nueva venta con sus detalles
router.post('/registrar', (req, res) => {
  const { usuario_id, total, metodo_pago_id, estado, direccion_envio, estado_envio, detalles } = req.body;

  const venta = {
    usuario_id,
    total,
    metodo_pago_id,
    estado,
    direccion_envio,
    estado_envio
  };

  const insertVenta = "INSERT INTO ventas SET ?";
  db.query(insertVenta, venta, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    const ventaId = result.insertId;
    const detallesData = detalles.map(item => [ventaId, item.cantidad, item.precio_unitario, item.producto_nombre]);
    const insertDetalles = "INSERT INTO detalles_venta (venta_id, cantidad, precio_unitario, producto_nombre) VALUES ?";

    db.query(insertDetalles, [detallesData], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      res.json({ mensaje: "Venta registrada con detalles", venta_id: ventaId });
    });
  });
});

// Eliminar una venta y sus detalles
router.delete('/eliminar/:id', (req, res) => {
  const { id } = req.params;

  const deleteDetalles = "DELETE FROM detalles_venta WHERE venta_id = ?";
  const deleteVenta = "DELETE FROM ventas WHERE id = ?";

  db.query(deleteDetalles, [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query(deleteVenta, [id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      res.json({ mensaje: "Venta y detalles eliminados" });
    });
  });
});

module.exports = router;
