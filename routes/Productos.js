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

//  Endpoint para agregar un producto con imagen
router.post("/agregarProductos", upload.single("imagen"), async (req, res) => {
  try {
    console.log("===================== DEPURACIÓN DE AGREGAR PRODUCTO =====================");
    console.log("Headers recibidos:", req.headers);
    console.log("Cuerpo de la solicitud (req.body):", req.body);
    console.log("Archivo recibido (req.file):", req.file);

    const { nombre_producto, descripcion, precio, stock, id_categoria, id_color, id_talla, id_genero } = req.body;

    // Subir imagen a Cloudinary si existe
    let imagenUrl = null;
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "productos" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

      imagenUrl = uploadResult.secure_url;
    }

    console.log("URL de imagen generada:", imagenUrl);
    console.log("===========================================================");

    // Insertar producto
    const queryProducto = `
      INSERT INTO producto (nombre_producto, descripcion, precio, stock, id_categoria, id_color, id_talla, id_genero)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      queryProducto,
      [nombre_producto, descripcion, Number(precio), Number(stock),
        Number(id_categoria), Number(id_color), Number(id_talla),
        Number(id_genero)],
      (err, resultProducto) => {
        if (err) {
          console.error("Error en inserción de producto:", err);
          return res.status(500).json({
            error: "Error al agregar el producto",
            details: err.message
          });
        }

        // Si hay imagen, insertar en la tabla de imágenes
        if (imagenUrl) {
          const queryImagen = `
            INSERT INTO imagenes (producto_id, url, creado_en)
            VALUES (?, ?, CURRENT_TIMESTAMP)
          `;

          db.query(
            queryImagen,
            [resultProducto.insertId, imagenUrl],
            (err, resultImagen) => {
              if (err) {
                console.error("Error en inserción de imagen:", err);
                return res.status(500).json({
                  error: "Error al agregar la imagen",
                  details: err.message
                });
              }

              res.json({
                message: "Producto e imagen agregados con éxito",
                producto_id: resultProducto.insertId,
                imagen_id: resultImagen.insertId,
                imagen_url: imagenUrl
              });
            }
          );
        } else {
          res.json({
            message: "Producto agregado con éxito",
            producto_id: resultProducto.insertId
          });
        }
      }
    );
  } catch (error) {
    console.error("Error general:", error);
    res.status(500).json({
      error: "Error al procesar la solicitud",
      details: error.message
    });
  }
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
router.put("/actualizar/:id", upload.single("imagen"), (req, res) => {
  const { id } = req.params;
  const {
    nombre_producto,
    descripcion,
    precio,
    stock,
    id_categoria,
    id_color,
    id_talla,
    id_genero
  } = req.body;

  // Update product information
  const updateQuery = `
    UPDATE producto
    SET nombre_producto = ?, descripcion = ?, precio = ?, stock = ?, 
        id_categoria = ?, id_color = ?, id_talla = ?, id_genero = ?, 
        fecha_actualizacion = CURRENT_TIMESTAMP 
    WHERE id = ?`;

  db.query(
    updateQuery,
    [nombre_producto, descripcion, precio, stock, id_categoria, id_color, id_talla, id_genero, id],
    (updateErr) => {
      if (updateErr) {
        console.error("Error al actualizar producto:", updateErr);
        return res.status(500).json({ error: "Error al actualizar producto" });
      }

      // If an image is uploaded
      if (req.file) {
        // Delete previous images for this product
        db.query("DELETE FROM imagenes WHERE producto_id = ?", [id], (deleteErr) => {
          if (deleteErr) {
            console.error("Error al eliminar imágenes anteriores:", deleteErr);
          }

          // Upload new image to Cloudinary
          const stream = cloudinary.uploader.upload_stream(
            { folder: "productos" },
            (cloudinaryErr, uploadResult) => {
              if (cloudinaryErr) {
                console.error("Error al subir imagen a Cloudinary:", cloudinaryErr);
                return res.status(500).json({ error: "Error al subir imagen" });
              }

              // Save image URL to database
              db.query(
                "INSERT INTO imagenes (producto_id, url) VALUES (?, ?)",
                [id, uploadResult.secure_url],
                (insertErr) => {
                  if (insertErr) {
                    console.error("Error al guardar URL de imagen:", insertErr);
                    return res.status(500).json({ error: "Error al guardar imagen" });
                  }

                  res.json({ message: "Producto actualizado correctamente" });
                }
              );
            }
          );

          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      } else {
        // No image uploaded
        res.json({ message: "Producto actualizado correctamente" });
      }
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

// Obtener todos los productos
router.get("/productos", (req, res) => {
  const query = `
  SELECT
    p.id,
    p.nombre_producto,
    p.descripcion,
    p.precio,
    p.stock,
    p.fecha_creacion,
    p.fecha_actualizacion,
    p.id_categoria,
    p.id_color,
    p.id_talla,
    p.id_genero,
    i.url  -- Obtener la URL de la imagen desde la tabla imagenes
  FROM
    u988046079_bdgislive.producto p
  LEFT JOIN  -- Usamos LEFT JOIN para incluir productos sin imagen
    u988046079_bdgislive.imagenes i ON p.id = i.producto_id;  -- Relacionamos el producto con su imagen
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error al obtener productos:", err);
      return res.status(500).json({ error: "Error al obtener productos" });
    }
    res.status(200).json(results);
  });
});

// Endpoint para búsqueda de productos
router.get("/buscar", (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === '') {
    return res.status(400).json({ error: "Se requiere un término de búsqueda" });
  }

  // Crear un término de búsqueda con comodines para MySQL
  const searchTerm = `%${q.trim()}%`;

  const query = `
    SELECT
      p.id,
      p.nombre_producto,
      p.descripcion,
      p.precio,
      p.stock,
      p.id_categoria,
      p.id_color,
      p.id_talla,
      p.id_genero,
      c.nombre AS categoria,
      co.color,
      t.talla,
      g.genero,
      i.url
    FROM
      u988046079_bdgislive.producto p
    LEFT JOIN
      u988046079_bdgislive.categorias c ON p.id_categoria = c.id_categoria
    LEFT JOIN
      u988046079_bdgislive.color co ON p.id_color = co.id
    LEFT JOIN
      u988046079_bdgislive.tallas t ON p.id_talla = t.id
    LEFT JOIN
      u988046079_bdgislive.genero g ON p.id_genero = g.id
    LEFT JOIN
      u988046079_bdgislive.imagenes i ON p.id = i.producto_id
    WHERE
      p.nombre_producto LIKE ? OR
      p.descripcion LIKE ? OR
      c.nombre LIKE ? OR
      co.color LIKE ? OR
      t.talla LIKE ? OR
      g.genero LIKE ?
    GROUP BY p.id
    LIMIT 10
  `;

  db.query(
    query,
    [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
    (err, results) => {
      if (err) {
        console.error("Error al buscar productos:", err);
        return res.status(500).json({ error: "Error al buscar productos" });
      }

      res.status(200).json(results);
    }
  );
});

// Obtener productos del género "Hombre"
router.get("/Hombres", (req, res) => {
  const query = `
  SELECT p.*, i.url
  FROM u988046079_bdgislive.producto p
  JOIN u988046079_bdgislive.genero g ON p.id_genero = g.id
  LEFT JOIN u988046079_bdgislive.imagenes i ON p.id = i.producto_id
  WHERE g.genero = 'Hombre';
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error al obtener productos del género Hombre:", err);
      return res.status(500).json({ error: "Error al obtener productos" });
    }
    res.status(200).json(results);
  });
});

// Obtener todos los colores
router.get("/colores", (req, res) => {
  db.query("SELECT * FROM u988046079_bdgislive.color", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(results);
  });
});

// Obtener todas las categorías
router.get("/categorias", (req, res) => {
  db.query("SELECT * FROM u988046079_bdgislive.categorias", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(results);
  });
});

// Obtener todas las tallas
router.get("/tallas", (req, res) => {
  db.query("SELECT * FROM u988046079_bdgislive.tallas", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(results);
  });
});


// Obtener productos del género "Mujer"
router.get("/Mujeres", (req, res) => {
  const query = `
       SELECT
    p.id,
    p.nombre_producto,
    p.descripcion,
    p.precio,
    p.stock,
    p.fecha_creacion,
    p.fecha_actualizacion,
    p.id_categoria,
    p.id_color,
    p.id_talla,
    p.id_genero,
    i.url  -- Obtener la URL de la imagen desde la tabla imagenes
FROM
    u988046079_bdgislive.producto p
JOIN
    u988046079_bdgislive.genero g ON p.id_genero = g.id
LEFT JOIN  -- Usamos LEFT JOIN para incluir productos sin imagen
    u988046079_bdgislive.imagenes i ON p.id = i.producto_id  -- Relacionamos el producto con su imagen
WHERE
    g.genero = 'Mujer';
    `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error al obtener productos del género Hombre:", err);
      return res.status(500).json({ error: "Error al obtener productos" });
    }
    res.status(200).json(results);
  });
});


router.get('/producto-detalle/:id', (req, res) => {
  const productId = req.params.id;

  // Obtener el producto y la imagen asociada desde la base de datos
  const query = `
      SELECT 
        p.id, 
        p.nombre_producto, 
        p.descripcion, 
        p.precio, 
        p.stock,
        i.url -- Obtener la URL de la imagen desde la tabla imagenes
      FROM 
        u988046079_bdgislive.producto p
      LEFT JOIN 
        u988046079_bdgislive.imagenes i ON p.id = i.producto_id
      WHERE 
        p.id = ?;
    `;

  db.query(query, [productId], (err, result) => {
    if (err) {
      console.error("Error al obtener los detalles del producto:", err);
      return res.status(500).json({ error: "Error al obtener los detalles del producto" });
    }
    res.json(result[0]);  // Devolver el primer producto (ya que debería ser único por id)
  });
});



module.exports = router;