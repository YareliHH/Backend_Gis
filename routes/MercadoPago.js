// backend/routes/ventas.js
const express = require("express");
const router = express.Router();
const db = require("../Config/db");
const mercadopago = require("mercadopago");

// ===============================
// CONFIGURAR MERCADO PAGO
// ===============================
mercadopago.configure({
  access_token: "APP_USR-4446643915013686-070920-66961f94b8401e2730fc918ee580146d-2543693813",
});


async function otorgarInsigniasPorCompra(usuario_id) {
  const connection = await db.getConnection();

  try {
    // Total de compras pagadas
    const [compras] = await connection.query(
      `SELECT COUNT(*) AS total FROM ventas WHERE usuario_id = ? AND estado = 'pagado'`,
      [usuario_id]
    );
    const totalCompras = compras[0].total;

    // Insignias activas
    const [insignias] = await connection.query(
      `SELECT id, regla FROM insignias WHERE tipo = 'logro' AND activa = 1`
    );

    // Insignias que ya tiene
    const [yaTiene] = await connection.query(
      `SELECT insignia_id FROM usuarios_insignias WHERE usuario_id = ?`,
      [usuario_id]
    );
    const idsExistentes = yaTiene.map(i => i.insignia_id);

    const nuevas = [];

    for (const ins of insignias) {
      const cumpleRegla =
        (ins.regla === "primera_compra" && totalCompras >= 1) ||
        (ins.regla === "cinco_compras" && totalCompras >= 5) ||
        (ins.regla === "diez_compras" && totalCompras >= 10);

      if (cumpleRegla && !idsExistentes.includes(ins.id)) {
        nuevas.push([usuario_id, ins.id]);
      }
    }

    if (nuevas.length > 0) {
      await connection.query(
        `INSERT INTO usuarios_insignias (usuario_id, insignia_id) VALUES ?`,
        [nuevas]
      );
      console.log("🏅 Nuevas insignias otorgadas:", nuevas);
    }
  } catch (error) {
    console.error("Error otorgando insignias:", error);
  } finally {
    connection.release();
  }
}

// ===============================
// RUTA: REALIZAR COMPRA
// ===============================
router.post("/comprar", async (req, res) => {
  const { productos, total, metodoPago, direccionEnvio, usuario_id } = req.body;

  if (!usuario_id) {
    return res.status(400).json({ message: "Falta el usuario_id" });
  }

  if (!productos || productos.length === 0) {
    return res.status(400).json({ message: "El carrito está vacío" });
  }

  const estadoVenta = metodoPago === 4 ? "pendiente" : "pagado";

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Crear venta
    const [ventaResult] = await connection.query(
      `INSERT INTO ventas (usuario_id, total, metodo_pago_id, direccion_envio, estado)
       VALUES (?, ?, ?, ?, ?)`,
      [usuario_id, total, metodoPago, direccionEnvio || null, estadoVenta]
    );

    const venta_id = ventaResult.insertId;

    // Insertar productos
    const valoresProductos = productos.map((p) => [
      venta_id,
      p.producto_id,
      p.cantidad,
      p.precio_venta,
    ]);

    await connection.query(
      `INSERT INTO detalles_ventas (venta_id, producto_id, cantidad, precio_unitario)
       VALUES ?`,
      [valoresProductos]
    );

    // Limpiar carrito
    await connection.query(`DELETE FROM carrito WHERE usuario_id = ?`, [usuario_id]);

    // Historial
    await connection.query(
      `INSERT INTO historial_ventas (venta_id, estado_anterior, estado_nuevo, cambio_por)
       VALUES (?, ?, ?, ?)`,
      [venta_id, "N/A", estadoVenta, "Sistema"]
    );

    await connection.commit();
    connection.release();

    // ===========================================
    // SI PAGA CON MERCADO PAGO → CREAR PREFERENCIA
    // ===========================================
    if (metodoPago === 4) {
      const preference = {
        items: productos.map((p) => ({
          title: p.nombre,
          quantity: p.cantidad,
          unit_price: Number(p.precio_venta),
          currency_id: "MXN",
        })),
        back_urls: {
          success: "https://backend-gis-1.onrender.com/cliente/verificar-pago",
          failure: "https://backend-gis-1.onrender.com/cliente/verificar-pago",
          pending: "https://backend-gis-1.onrender.com/cliente/verificar-pago",
        },
        auto_return: "approved",
        external_reference: venta_id.toString(),
      };

      try {
        const response = await mercadopago.preferences.create(preference);

        return res.json({
          message: "Compra registrada, redirigiendo a Mercado Pago...",
          init_point: response.body.init_point,
        });

      } catch (error) {
        console.error("❌ Error creando preferencia:", error);
        return res.status(500).json({ message: "Error creando preferencia de pago" });
      }
    }

    // Si el pago es inmediato
    await otorgarInsigniasPorCompra(usuario_id);

    return res.json({ message: "Compra realizada con éxito" });

  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error("❌ Error en la compra:", error);
    return res.status(500).json({ message: "Error procesando la compra" });
  }
});

// ===============================
// RUTA: VERIFICAR PAGO MERCADO PAGO
// ===============================
router.get("/verificar-pago", async (req, res) => {
  const { collection_status, external_reference } = req.query;
  const venta_id = Number(external_reference);

  if (!venta_id || !collection_status) {
    return res.redirect("https://backend-gis-1.onrender.com/cliente/pago-fallido");
  }

  try {
    if (collection_status === "approved") {
      await db.query(
        `UPDATE ventas SET estado = 'pagado' WHERE id = ?`,
        [venta_id]
      );

      await db.query(
        `INSERT INTO historial_ventas (venta_id, estado_anterior, estado_nuevo, cambio_por)
         VALUES (?, ?, ?, ?)`,
        [venta_id, "pendiente", "pagado", "MercadoPago"]
      );

      const [[venta]] = await db.query(
        `SELECT usuario_id FROM ventas WHERE id = ?`,
        [venta_id]
      );

      await otorgarInsigniasPorCompra(venta.usuario_id);

      return res.redirect("https://backend-gis-1.onrender.com/cliente/pago-exitoso");
    }

    if (collection_status === "in_process") {
      return res.redirect("https://backend-gis-1.onrender.com/cliente/pago-pendiente");
    }

    return res.redirect("https://backend-gis-1.onrender.com/cliente/pago-fallido");

  } catch (error) {
    console.error("❌ Error verificando pago:", error);
    return res.redirect("https://backend-gis-1.onrender.com/cliente/pago-fallido");
  }
});

module.exports = router;
