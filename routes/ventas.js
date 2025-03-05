const express = require('express');
const router = express.Router();
const db = require('../Config/db');

// Obtener una venta por ID
router.get("/ventas/:id", (req, res) => {
    const { id } = req.params;
    const query = "SELECT * FROM ventas WHERE id = ?";
    db.query(query, [id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (result.length === 0) {
            res.status(404).json({ error: "Venta no encontrada" });
        } else {
            res.json(result[0]);
        }
    });
});

// Registrar una nueva venta
router.post("/ventas", (req, res) => {
    const { cantidad, precio_unitario, total, fecha, metodo_pago } = req.body;
    const query = "INSERT INTO ventas (cantidad, precio_unitario, total, fecha, metodo_pago) VALUES (?, ?, ?, ?, ?)";
    db.query(query, [cantidad, precio_unitario, total, fecha, metodo_pago], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ mensaje: "Venta registrada con éxito", id: result.insertId });
        }
    });
});

//  Actualizar una venta
router.put("/ventas/:id", (req, res) => {
    const { id } = req.params;
    const { cantidad, precio_unitario, total, metodo_pago } = req.body;
    const query = "UPDATE ventas SET cantidad = ?, precio_unitario = ?, total = ?, metodo_pago = ? WHERE id = ?";
    db.query(query, [cantidad, precio_unitario, total, metodo_pago, id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ mensaje: "Venta actualizada con éxito" });
        }
    });
});

// Eliminar una venta
router.delete("/ventas/:id", (req, res) => {
    const { id } = req.params;
    const query = "DELETE FROM ventas WHERE id = ?";
    db.query(query, [id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ mensaje: "Venta eliminada con éxito" });
        }
    });
});

module.exports = router;








// Endpoint para crear un producto con imágenes (ahora protegido por el middleware)
router.post("/productos", verifyToken, upload.array("images"), async (req, res) => {
    try {
      // Extraer datos del producto del body
      const {
        nombre,
        descripcion,
        sku,
        costo,
        porcentaje_ganancia,
        precio_calculado,
        calificacion_promedio,
        total_resenas,
        cantidad_stock,
        categoria_id
      } = req.body;
  
      // Usar el ID del usuario extraído del token
      const usuario_id = req.id;
  
      // Insertar el producto en la tabla productos
      const productoId = await new Promise((resolve, reject) => {
        const query = `
          INSERT INTO productos 
            (nombre, descripcion, sku, costo, porcentaje_ganancia, precio_calculado, calificacion_promedio, total_resenas, cantidad_stock, categoria_id, usuario_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.query(
          query,
          [
            nombre,
            descripcion,
            sku,
            costo,
            porcentaje_ganancia,
            precio_calculado,
            calificacion_promedio,
            total_resenas,
            cantidad_stock,
            categoria_id,
            usuario_id,
          ],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.insertId);
          }
        );
      });
  
      // Procesar imágenes si se enviaron archivos
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "productos" },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              }
            );
            streamifier.createReadStream(file.buffer).pipe(stream);
          });
  
          await new Promise((resolve, reject) => {
            const query = "INSERT INTO imagenes (producto_id, url) VALUES (?, ?)";
            db.query(query, [productoId, uploadResult.secure_url], (err, result) => {
              if (err) return reject(err);
              resolve(result);
            });
          });
        }
      }
  
      res.status(201).json({ message: "Producto y sus imágenes creados exitosamente", productoId });
    } catch (error) {
      console.error("Error al crear producto e imágenes:", error);
      res.status(500).json({ message: "Error al crear producto" });
    }
  });