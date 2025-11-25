// backend/routes/MercadoPago.js
const express = require("express");
const router = express.Router();
const db = require("../Config/db");
const mercadopago = require("mercadopago");

// CONFIGURAR MERCADO PAGO
mercadopago.configure({
  access_token: "APP_USR-4446643915013686-070920-66961f94b8401e2730fc918ee580146d-2543693813",
});

//   FUNCIÓN PARA OTORGAR INSIGNIAS (Compras + Embajador)
async function otorgarInsigniasPorCompra(usuario_id) {

  try {
    const [compras] = await db.promise().query(
      `SELECT COUNT(*) AS total FROM ventas 
       WHERE usuario_id = ? AND estado = 'pagado'`,
      [usuario_id]
    );
    const totalCompras = compras[0].total || 0;

    const [insignias] = await db.promise().query(
      `SELECT id, regla FROM insignias 
       WHERE tipo = 'logro' AND activa = 1`
    );

    const [compartidos] = await db.promise().query(
      `SELECT COUNT(*) AS total 
       FROM compartir_productos
       WHERE usuario_id = ?`,
      [usuario_id]
    );
    const totalCompartidos = compartidos[0].total || 0;

    const [yaTiene] = await db.promise().query(
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
   
    await db.promise().query(
      `INSERT INTO compartir_productos (usuario_id, producto_id)
       VALUES (?, ?)`,
      [usuario_id, producto_id]
    );

    await otorgarInsigniasPorCompra(usuario_id);



    return res.json({
      ok: true,
      message: "Compartido registrado correctamente",
    });
  } catch (error) {
    console.error("❌ Error registrando compartir:", error);
    return res.status(500).json({ message: "Error al registrar el compartir" });
  }
});

// RUTA: CREAR PREFERENCIA
router.post("/crear_preferencia", async (req, res) => {
  const { usuario_id, productos, total, metodoPago, direccionEnvio } = req.body;

  if (!usuario_id)
    return res.status(400).json({ message: "Falta el usuario_id" });
  if (!productos || productos.length === 0)
    return res.status(400).json({ message: "El carrito está vacío" });

  try {
    // Registrar la venta
    const estadoVenta = metodoPago === 4 ? "pendiente" : "pagado";

    const direccionJSON = direccionEnvio ? JSON.stringify(direccionEnvio) : null;

    const [ventaResult] = await db
      .promise()
      .query(
        `INSERT INTO ventas (usuario_id, total, metodo_pago_id, direccion_envio, estado) VALUES (?, ?, ?, ?, ?)`,
        [usuario_id, total, metodoPago, direccionJSON || null, estadoVenta]
      );

    const venta_id = ventaResult.insertId;

    const valoresProductos = productos.map((p) => [
      venta_id,
      p.cantidad,
      p.precio_venta,
      p.id_producto,
    ]);

    await db
      .promise()
      .query(
        `INSERT INTO detalles_venta (venta_id, cantidad, precio_unitario, id_producto) VALUES ?`,
        [valoresProductos]
      );

    await db
      .promise()
      .query(`DELETE FROM carrito WHERE usuario_id = ?`, [usuario_id]);

    // Crear preferencia Mercado Pago si aplica
    if (metodoPago === 4) {
      const preference = {
        items: productos.map((p) => ({
          title: p.nombre || "Producto",
          quantity: Number(p.cantidad) || 1,
          unit_price: Number(p.precio_venta) || 1,
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

      // Crear preferencia
        const response = await mercadopago.preferences.create(preference);

      return res.json({
        message: "Compra registrada, redirigiendo a Mercado Pago…",
       init_point: response.body.init_point,
      });
    }

    // Si no es Mercado Pago
    await otorgarInsigniasPorCompra(usuario_id);
    return res.json({ message: "Compra realizada con éxito" });
  } catch (error) {
    console.error("❌ Error en crear preferencia:", error);
    return res
      .status(500)
      .json({ message: "Error procesando la compra", error: error.message });
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
      await db.promise().query(`UPDATE ventas SET estado = 'pagado' WHERE id = ?`, [
        venta_id,
      ]);

      const [[venta]] = await db.promise().query(
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
