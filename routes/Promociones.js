const express = require("express");
const router = express.Router();
const db = require("../Config/db");

router.get("/promo/get_promo", async (req, res) => {
  try {
    const query = "SELECT * FROM promocion";

    const [rows] = await db.promise().query(query);
    res.json(rows);
  } catch (err) {
    console.log(err);
    console.error("promociones " + err);

    res.status(500).json({ error: "Error al obtener promociones " + err });
  }
});

// ✅ Obtener todas las promociones
router.get("/promo/get", async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id_promocion,
        p.id_producto,
        p.titulo,
        p.descripcion,
        p.tipo,
        p.precio_nuevo,
        p.fecha_inicio,
        p.fecha_fin,
        p.estado,
        p.creado,
        p.valor_descuento,
        p.porcentaje_descuento,
        -- Datos del producto relacionado
        prod.nombre_producto,
        prod.descripcion as producto_descripcion,
        prod.precio as precio_original,
        prod.stock,
        prod.fecha_creacion as producto_creado,
        prod.fecha_actualizacion as producto_actualizado,
        -- Imagen del producto
        img.url as imagen_url,
        img.id as imagen_id
      FROM promocion p
      LEFT JOIN producto prod ON p.id_producto = prod.id
      LEFT JOIN imagenes img ON prod.id = img.producto_id
      WHERE p.estado = 'activo'
      ORDER BY p.fecha_inicio DESC
    `;

    const [rows] = await db.promise().query(query);

    // Agrupa imágenes por promoción
    const promocionesMap = {};

    rows.forEach((promo) => {
      // Si ya existe la promoción, solo agrega la imagen
      if (promocionesMap[promo.id_promocion]) {
        if (promo.imagen_id && promo.imagen_url) {
          promocionesMap[promo.id_promocion].imagenes.push({
            id: promo.imagen_id,
            url: promo.imagen_url,
          });
        }
      } else {
        // Calcula descuentos y demás solo una vez
        const ahora = new Date();
        const fechaInicio = new Date(promo.fecha_inicio);
        const fechaFin = new Date(promo.fecha_fin);

        // Calcular descuento si no está definido
        let descuentoCalculado = promo.porcentaje_descuento;
        if (
          !descuentoCalculado &&
          promo.valor_descuento &&
          promo.precio_original
        ) {
          descuentoCalculado = (
            (promo.valor_descuento / promo.precio_original) *
            100
          ).toFixed(1);
        }

        // Calcular ahorro total
        let ahorroTotal = promo.valor_descuento;
        if (!ahorroTotal && promo.porcentaje_descuento && promo.precio_original) {
          ahorroTotal = (
            (promo.precio_original * promo.porcentaje_descuento) /
            100
          ).toFixed(2);
        }

        // Calcular días restantes
        const diasRestantes = promo.fecha_fin
          ? Math.ceil((fechaFin - ahora) / (1000 * 60 * 60 * 24))
          : null;

        promocionesMap[promo.id_promocion] = {
          id_promocion: promo.id_promocion,
          id_producto: promo.id_producto,
          titulo: promo.titulo,
          descripcion: promo.descripcion,
          tipo: promo.tipo,
          precio_original: parseFloat(promo.precio_original) || 0,
          precio_nuevo: parseFloat(promo.precio_nuevo) || 0,
          nombre_producto: promo.nombre_producto,
          producto_descripcion: promo.producto_descripcion,
          stock: promo.stock,
          imagenes: promo.imagen_id && promo.imagen_url
            ? [{ id: promo.imagen_id, url: promo.imagen_url }]
            : [],
          descuento_calculado: parseFloat(descuentoCalculado) || 0,
          ahorro_total: parseFloat(ahorroTotal) || 0,
          dias_restantes: diasRestantes,
          promocion_activa: ahora >= fechaInicio && ahora <= fechaFin,
          fecha_inicio: promo.fecha_inicio,
          fecha_fin: promo.fecha_fin,
          estado: promo.estado,
          creado: promo.creado,
        };
      }
    });

    // Convierte el map a array para enviar al frontend
    const promocionesConImagenes = Object.values(promocionesMap);

    res.json(promocionesConImagenes);
  } catch (err) {
    console.error("Error al obtener promociones: " + err);
    res.status(500).json({ error: "Error al obtener promociones: " + err });
  }
});

// Crear promoción (POST)
router.post("/promo/create", async (req, res) => {
  const {
    id_producto,
    titulo,
    descripcion,
    tipo,
    valor_descuento,
    porcentaje_descuento,
    fecha_inicio,
    fecha_fin,
    estado,
  } = req.body;

  try {
    // 1. Trae el precio original del producto
    const [prodRows] = await db
      .promise()
      .query("SELECT precio FROM producto WHERE id = ?", [id_producto]);
    if (prodRows.length === 0) {
      return res.status(400).json({ error: "Producto no encontrado" });
    }
    const precio_original = parseFloat(prodRows[0].precio);

    // 2. Calcula el precio_nuevo
    let precio_nuevo = null;
    if (tipo === "descuento") {
      if (porcentaje_descuento && parseFloat(porcentaje_descuento) > 0) {
        precio_nuevo =
          precio_original -
          precio_original * (parseFloat(porcentaje_descuento) / 100);
      } else if (valor_descuento && parseFloat(valor_descuento) > 0) {
        precio_nuevo = precio_original - parseFloat(valor_descuento);
      }
      if (precio_nuevo < 0) precio_nuevo = 0;
    } else {
      precio_nuevo = precio_original;
    }

    const query = `
      INSERT INTO promocion (
        id_producto, titulo, descripcion, tipo,
        valor_descuento, porcentaje_descuento,
        precio_nuevo, fecha_inicio, fecha_fin, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db
      .promise()
      .execute(query, [
        id_producto,
        titulo,
        descripcion || "",
        tipo,
        valor_descuento || null,
        porcentaje_descuento || null,
        precio_nuevo,
        fecha_inicio,
        fecha_fin,
        estado,
      ]);

    res.status(201).json({
      message: "Promoción creada exitosamente",
      id: result.insertId,
      precio_nuevo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al crear promoción",
      details: error.message,
    });
  }
});

// Actualizar promoción (PUT)
router.put("/promo/update/:id", async (req, res) => {
  const { id } = req.params;
  const {
    id_producto,
    titulo,
    descripcion,
    tipo,
    valor_descuento,
    porcentaje_descuento,
    fecha_inicio,
    fecha_fin,
    estado,
  } = req.body;

  try {
    // 1. Trae el precio original del producto
    const [prodRows] = await db
      .promise()
      .query("SELECT precio FROM producto WHERE id = ?", [id_producto]);
    if (prodRows.length === 0) {
      return res.status(400).json({ error: "Producto no encontrado" });
    }
    const precio_original = parseFloat(prodRows[0].precio);

    // 2. Calcula el precio_nuevo
    let precio_nuevo = null;
    if (tipo === "descuento") {
      if (porcentaje_descuento && parseFloat(porcentaje_descuento) > 0) {
        precio_nuevo =
          precio_original -
          precio_original * (parseFloat(porcentaje_descuento) / 100);
      } else if (valor_descuento && parseFloat(valor_descuento) > 0) {
        precio_nuevo = precio_original - parseFloat(valor_descuento);
      }
      if (precio_nuevo < 0) precio_nuevo = 0;
    } else {
      precio_nuevo = precio_original;
    }

    const query = `
      UPDATE promocion SET
        id_producto = ?, titulo = ?, descripcion = ?, tipo = ?,
        valor_descuento = ?, porcentaje_descuento = ?,
        precio_nuevo = ?, fecha_inicio = ?, fecha_fin = ?, estado = ?
      WHERE id_promocion = ?
    `;

    await db
      .promise()
      .execute(query, [
        id_producto,
        titulo,
        descripcion || "",
        tipo,
        valor_descuento || null,
        porcentaje_descuento || null,
        precio_nuevo,
        fecha_inicio,
        fecha_fin,
        estado,
        id,
      ]);

    res.json({ message: "Promoción actualizada exitosamente", precio_nuevo });
  } catch (error) {
    res.status(500).json({
      error: "Error al actualizar promoción",
      details: error.message,
    });
  }
});

// ✅ Eliminar promoción
router.delete("/promo/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db
      .promise()
      .execute("DELETE FROM promocion WHERE id_promocion = ?", [id]);
    res.json({ message: "Promoción eliminada exitosamente" });
  } catch (error) {
    res.status(500).json({
      error: "Error al eliminar promoción",
      details: error.message,
    });
  }
});

module.exports = router;
