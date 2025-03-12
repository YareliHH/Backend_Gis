const express = require("express");
const router = express.Router();
const db = require("../Config/db");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Configuración de multer para manejar imágenes en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

cloudinary.config({
    cloud_name: 'dqshjerfz',
    api_key: '621792211413143',
    api_secret: 'Y2SiySDJ_WzYdaN96uoyUdtyt54',
});

// Obtener todos los productos
router.get("/obtener", (req, res) => {
    const query = `
       SELECT p.id, p.nombre_producto, p.descripcion, p.precio, p.stock, 
       p.fecha_creacion, p.fecha_actualizacion,
       c.nombre AS categoria, co.color, t.talla, g.genero,
       (SELECT url FROM imagenes WHERE producto_id = p.id LIMIT 1) AS imagen
FROM producto p
LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
LEFT JOIN color co ON p.id_color = co.id
LEFT JOIN tallas t ON p.id_talla = t.id
LEFT JOIN genero g ON p.id_genero = g.id

    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error("Error al obtener productos:", err);
            return res.status(500).json({ error: "Error al obtener productos" });
        }
        res.status(200).json(results);
    });
});

// Obtener un producto por ID
router.get("/obtener/:id", (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT p.id, p.nombre_producto, p.descripcion, p.precio, p.stock, 
               p.fecha_creacion, p.fecha_actualizacion,
               c.nombre AS categoria, co.color, t.talla, g.genero
        FROM producto p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        LEFT JOIN color co ON p.id_color = co.id
        LEFT JOIN tallas t ON p.id_talla = t.id
        LEFT JOIN genero g ON p.id_genero = g.id
        WHERE p.id = ?
    `;
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error("Error al obtener el producto:", err);
            return res.status(500).json({ error: "Error al obtener el producto" });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }
        res.status(200).json(results[0]);
    });
});

// Agregar un nuevo producto con imágenes en Cloudinary
router.put("/actualizar/:id", upload.array("imagenes", 5), async (req, res) => {
    const { id } = req.params;
    const { nombre_producto, descripcion, precio, stock, id_categoria, id_color, id_talla, id_genero } = req.body;
  
    // Actualizar la información del producto
    db.query(
      `
      UPDATE producto
      SET nombre_producto = ?, descripcion = ?, precio = ?, stock = ?, 
          id_categoria = ?, id_color = ?, id_talla = ?, id_genero = ?, 
          fecha_actualizacion = CURRENT_TIMESTAMP 
      WHERE id = ?
      `,
      [nombre_producto, descripcion, precio, stock, id_categoria, id_color, id_talla, id_genero, id],
      async (err) => {
        if (err) {
          console.error("Error al actualizar producto:", err);
          return res.status(500).json({ error: "Error al actualizar producto" });
        }
        
        // Si se envían nuevas imágenes, procesarlas
        if (req.files && req.files.length > 0) {
          // Opcional: eliminar las imágenes anteriores de la BD (y de Cloudinary si lo deseas)
          await new Promise((resolve, reject) => {
            db.query("DELETE FROM imagenes WHERE producto_id = ?", [id], (err) => {
              if (err) return reject(err);
              resolve();
            });
          });
  
          // Procesar y guardar cada nueva imagen
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
              db.query(query, [id, uploadResult.secure_url], (err) => {
                if (err) return reject(err);
                resolve();
              });
            });
          }
        }
        res.json({ message: "Producto actualizado correctamente" });
      }
    );
  });
  
// Actualizar un producto
router.put("/actualizar/:id", (req, res) => {
    const { id } = req.params;
    const { nombre_producto, descripcion, precio, stock, id_categoria, id_color, id_talla, id_genero } = req.body;

    const query = `
        UPDATE producto
        SET nombre_producto = ?, descripcion = ?, precio = ?, stock = ?, 
            id_categoria = ?, id_color = ?, id_talla = ?, id_genero = ?, 
            fecha_actualizacion = CURRENT_TIMESTAMP 
        WHERE id = ?`;
    db.query(query, [nombre_producto, descripcion, precio, stock, id_categoria, id_color, id_talla, id_genero, id], (err) => {
        if (err) {
            console.error("Error al actualizar producto:", err);
            return res.status(500).json({ error: "Error al actualizar producto" });
        }
        res.json({ message: "Producto actualizado correctamente" });
    });
});

// Eliminar un producto y sus imágenes
router.delete("/eliminar/:id", async (req, res) => {
    const { id } = req.params;

    try {
        // Obtener imágenes del producto antes de eliminarlo
        const imagenes = await new Promise((resolve, reject) => {
            db.query("SELECT url FROM imagenes WHERE producto_id = ?", [id], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        // Eliminar imágenes de la base de datos
        await new Promise((resolve, reject) => {
            db.query("DELETE FROM imagenes WHERE producto_id = ?", [id], (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // Eliminar producto de la base de datos
        db.query("DELETE FROM producto WHERE id = ?", [id], (err) => {
            if (err) {
                console.error("Error al eliminar producto:", err);
                return res.status(500).json({ error: "Error al eliminar producto" });
            }
            res.json({ message: "Producto y sus imágenes eliminados correctamente" });
        });
    } catch (error) {
        console.error("Error al eliminar producto:", error);
        res.status(500).json({ message: "Error al eliminar producto" });
    }
});

// Obtener productos del género "Hombre"
router.get("/obtener/Hombre", (req, res) => {
    const query = `
      SELECT 
        p.id, 
        p.nombre_producto, 
        p.descripcion, 
        p.precio, 
        p.stock, 
        p.fecha_creacion, 
        p.fecha_actualizacion,
        c.nombre AS categoria, 
        co.color, 
        t.talla, 
        g.genero,
        (SELECT url FROM imagenes WHERE producto_id = p.id LIMIT 1) AS imagen
      FROM producto p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      LEFT JOIN color co ON p.id_color = co.id
      LEFT JOIN tallas t ON p.id_talla = t.id
      LEFT JOIN genero g ON p.id_genero = g.id
      WHERE g.genero = "Hombre"
    `;
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error al obtener productos del género Hombre:", err);
        return res.status(500).json({ error: "Error al obtener productos" });
      }
      res.status(200).json(results);
    });
  });
  
  // Obtener productos del género "Mujer"
router.get("/obtener/Mujer", (req, res) => {
    const query = `
      SELECT 
        p.id, 
        p.nombre_producto, 
        p.descripcion, 
        p.precio, 
        p.stock, 
        p.fecha_creacion, 
        p.fecha_actualizacion,
        c.nombre AS categoria, 
        co.color, 
        t.talla, 
        g.genero,
        (SELECT url FROM imagenes WHERE producto_id = p.id LIMIT 1) AS imagen
      FROM producto p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      LEFT JOIN color co ON p.id_color = co.id
      LEFT JOIN tallas t ON p.id_talla = t.id
      LEFT JOIN genero g ON p.id_genero = g.id
      WHERE g.genero = "Hombre"
    `;
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error al obtener productos del género Hombre:", err);
        return res.status(500).json({ error: "Error al obtener productos" });
      }
      res.status(200).json(results);
    });
  });
  

module.exports = router;