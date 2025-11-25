// backend/routes/MercadoPago.js
const express = require("express");
const router = express.Router();
const db = require("../Config/db");
const MercadoPago = require("mercadopago");
const { Preference } = MercadoPago;


// CONFIGURAR MERCADO PAGO
const client = new MercadoPago.MercadoPagoConfig({
  access_token:
    "APP_USR-4446643915013686-070920-66961f94b8401e2730fc918ee580146d-2543693813",
});

//   FUNCIÓN PARA OTORGAR INSIGNIAS (Compras + Embajador)
async function otorgarInsigniasPorCompra(usuario_id) {
  const connection = await db.getConnection();

  try {
    const [compras] = await connection.query(
      `SELECT COUNT(*) AS total FROM ventas 
       WHERE usuario_id = ? AND estado = 'pagado'`,
      [usuario_id]
    );
    const totalCompras = compras[0].total || 0;

    const [insignias] = await connection.query(
      `SELECT id, regla FROM insignias 
       WHERE tipo = 'logro' AND activa = 1`
    );

    const [compartidos] = await connection.query(
      `SELECT COUNT(*) AS total 
       FROM compartir_productos
       WHERE usuario_id = ?`,
      [usuario_id]
    );
    const totalCompartidos = compartidos[0].total || 0;

    const [yaTiene] = await connection.query(
      `SELECT insignia_id FROM usuarios_insignias 
       WHERE usuario_id = ?`,
      [usuario_id]
    );
    const existentes = yaTiene.map((i) => i.insignia_id);

    const nuevas = [];

    for (const ins of insignias) {
      let cumple = false;

      switch (ins.regla) {
        case "primera_compra":
          if (totalCompras >= 1) cumple = true;
          break;

        case "comprador_frecuente":
          if (totalCompras >= 5) cumple = true;
          break;

        case "comprador_vip":
          if (totalCompras >= 10) cumple = true;
          break;

        case "embajador_marca":
          if (totalCompartidos >= 1) cumple = true;
          break;

        case "coleccionista":
          if (yaTiene.length >= 4) cumple = true;
          break;
      }

      if (cumple && !existentes.includes(ins.id)) {
        nuevas.push([usuario_id, ins.id]);
      }
    }

    if (nuevas.length > 0) {
      await connection.query(
        `INSERT INTO usuarios_insignias (usuario_id, insignia_id) VALUES ?`,
        [nuevas]
      );
      console.log("🏅 Insignias otorgadas:", nuevas);
    }
  } catch (error) {
    console.error("Error otorgando insignias:", error);
  } finally {
    connection.release();
  }
}

// RUTA: COMPARTIR PRODUCTOS
router.post("/compartir", async (req, res) => {
  const { usuario_id, producto_id } = req.body;

  if (!usuario_id) {
    return res.status(400).json({ message: "Falta usuario_id" });
  }

  if (!producto_id) {
    return res.status(400).json({ message: "Falta producto_id" });
  }

  try {
    const connection = await db.getConnection();

    await connection.query(
      `INSERT INTO compartir_productos (usuario_id, producto_id)
       VALUES (?, ?)`,
      [usuario_id, producto_id]
    );

    await otorgarInsigniasPorCompra(usuario_id);

    connection.release();

    return res.json({
      ok: true,
      message: "Compartido registrado correctamente",
    });
  } catch (error) {
    console.error("❌ Error registrando compartir:", error);
    return res.status(500).json({ message: "Error al registrar el compartir" });
  }
});

// RUTA: REALIZAR COMPRA (Mercado Pago)

router.post("/crear_preferencia", async (req, res) => {
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

    const [ventaResult] = await connection.query(
      `INSERT INTO ventas (usuario_id, total, metodo_pago_id, direccion_envio, estado)
       VALUES (?, ?, ?, ?, ?)`,
      [usuario_id, total, metodoPago, direccionEnvio || null, estadoVenta]
    );

    const venta_id = ventaResult.insertId;

    const valoresProductos = productos.map((p) => [
      venta_id,
      p.id_producto,
      p.cantidad,
      p.precio_venta,
    ]);

    await connection.query(
      `INSERT INTO detalles_venta
       (venta_id, cantidad, precio_unitario, id_producto)
       VALUES ?`,
      [valoresProductos]
    );

    await connection.query(`DELETE FROM carrito WHERE usuario_id = ?`, [
      usuario_id,
    ]);

    await connection.commit();
    connection.release();

    // MERCADO PAGO
    if (metodoPago === 4) {
      const preferenceData = {
        items: productos.map((p) => ({
          title: p.nombre,
          quantity: p.cantidad,
          unit_price: Number(p.precio_venta),
          currency_id: "MXN",
        })),
        back_urls: {
          success: "https://backend-gis-1.onrender.com/api/pago/verificar-pago",
          failure: "https://backend-gis-1.onrender.com/api/pago/verificar-pago",
          pending: "https://backend-gis-1.onrender.com/api/pago/verificar-pago",
        },
        auto_return: "approved",
        external_reference: venta_id.toString(),
      };

      const preference = new Preference(client);
      const mp = await preference.create({ body: preferenceData });

      return res.json({
        message: "Compra registrada, redirigiendo a Mercado Pago…",
        init_point: mp.init_point || mp.sandbox_init_point,
      });
    }

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

// RUTA: VERIFICAR PAGO MERCADO PAGO
router.get("/verificar-pago", async (req, res) => {
  const { collection_status, external_reference } = req.query;
  const venta_id = Number(external_reference);

  if (!venta_id || !collection_status) {
    return res.redirect("https://gisliveboutique.com/cliente/pago-fallido");
  }

  try {
    if (collection_status === "approved") {
      await db.query(`UPDATE ventas SET estado = 'pagado' WHERE id = ?`, [
        venta_id,
      ]);

      const [[venta]] = await db.query(
        `SELECT usuario_id FROM ventas WHERE id = ?`,
        [venta_id]
      );

      await otorgarInsigniasPorCompra(venta.usuario_id);

      return res.redirect("https://gisliveboutique.com/cliente/pago-exitoso");
    }

    if (collection_status === "in_process") {
      return res.redirect("https://gisliveboutique.com/cliente/pago-pendiente");
    }

    return res.redirect("https://gisliveboutique.com/cliente/pago-fallido");
  } catch (error) {
    console.error("Error verificando pago:", error);
    return res.redirect("https://gisliveboutique.com/cliente/pago-fallido");
  }
});

module.exports = router;
