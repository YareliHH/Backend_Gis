// Rutas mejoradas para la gestión de productos (backend)
const express = require("express");
const router = express.Router();
const db = require("../Config/db");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const { promisify } = require("util");

// Promisify para las consultas a la base de datos
const queryAsync = promisify(db.query).bind(db);

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: 'dqshjerfz',
  api_key: '621792211413143',
  api_secret: 'Y2SiySDJ_WzYdaN96uoyUdtyt54',
});

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    // Validar tipos de archivo
    if (!file.mimetype.match(/^image\/(jpeg|png|gif)$/)) {
      return cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF)'), false);
    }
    cb(null, true);
  }
});

// Función para subir imagen a Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "productos" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// Manejo de errores
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("Error en la operación:", err);
    res.status(500).json({
      error: "Error en el servidor",
      message: err.message
    });
  });
};

// Obtener todos los productos con imágenes
router.get("/obtener", asyncHandler(async (req, res) => {
  // Obtener productos con sus relaciones
  const productos = await queryAsync(`
    SELECT p.id, p.nombre_producto, p.descripcion, p.precio, p.stock, 
           p.fecha_creacion, p.fecha_actualizacion,
           p.id_categoria, p.id_color, p.id_talla, p.id_genero,
           c.nombre AS categoria, co.color, t.talla, g.genero
    FROM producto p
    LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
    LEFT JOIN color co ON p.id_color = co.id
    LEFT JOIN tallas t ON p.id_talla = t.id
    LEFT JOIN genero g ON p.id_genero = g.id
  `);

  // Para cada producto, obtener sus imágenes
  for (const producto of productos) {
    const imagenes = await queryAsync(
      "SELECT id, url FROM imagenes WHERE producto_id = ?",
      [producto.id]
    );

    // Si no hay imágenes, asignar un array vacío
    producto.imagenes = imagenes.length > 0 ? imagenes : [];

    // Mantener compatibilidad con código anterior que espera una sola imagen
    if (imagenes.length > 0) {
      producto.imagen = imagenes[0].url;
    }
  }

  res.status(200).json(productos);
}));

// Obtener un producto por ID con sus imágenes
router.get("/obtener/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Obtener el producto con sus relaciones
  const [producto] = await queryAsync(`
    SELECT p.id, p.nombre_producto, p.descripcion, p.precio, p.stock, 
           p.fecha_creacion, p.fecha_actualizacion, p.id_categoria, 
           p.id_color, p.id_talla, p.id_genero,
           c.nombre AS categoria, co.color, t.talla, g.genero
    FROM producto p
    LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
    LEFT JOIN color co ON p.id_color = co.id
    LEFT JOIN tallas t ON p.id_talla = t.id
    LEFT JOIN genero g ON p.id_genero = g.id
    WHERE p.id = ?
  `, [id]);

  if (!producto) {
    return res.status(404).json({ message: "Producto no encontrado" });
  }

  // Obtener las imágenes del producto
  const imagenes = await queryAsync(
    "SELECT id, url FROM imagenes WHERE producto_id = ?",
    [id]
  );

  producto.imagenes = imagenes;

  res.status(200).json(producto);
}));

// Obtener imágenes de un producto
router.get("/imagenes/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;

  const imagenes = await queryAsync(
    "SELECT id, url FROM imagenes WHERE producto_id = ?",
    [id]
  );

  res.status(200).json(imagenes);
}));

// Agregar un nuevo producto con múltiples imágenes
router.post("/agregarproducto", upload.array("imagenes", 10), asyncHandler(async (req, res) => {
  const { nombre_producto, descripcion, precio, stock, id_categoria, id_color, id_talla, id_genero } = req.body;

  // Validación de datos
  if (!nombre_producto || !descripcion || !precio || !stock || !id_categoria || !id_color || !id_talla || !id_genero) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }

  // Insertar el producto
  const result = await queryAsync(
    `INSERT INTO producto (nombre_producto, descripcion, precio, stock, id_categoria, id_color, id_talla, id_genero)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombre_producto, descripcion, precio, stock, id_categoria, id_color, id_talla, id_genero]
  );

  const productoId = result.insertId;

  // Procesar y guardar imágenes
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      try {
        // Subir a Cloudinary
        const uploadResult = await uploadToCloudinary(file.buffer);

        // Guardar referencia en la base de datos
        await queryAsync(
          "INSERT INTO imagenes (producto_id, url, creado_en) VALUES (?, ?, NOW())",
          [productoId, uploadResult.secure_url]
        );
      } catch (error) {
        console.error("Error al procesar imagen:", error);
        // Continuamos con las siguientes imágenes aunque falle alguna
      }
    }
  }

  res.status(201).json({
    message: "Producto agregado con éxito",
    id: productoId
  });
}));

// Actualizar un producto y sus imágenes
router.put("/actualizar/:id", upload.array("imagenes", 10), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre_producto, descripcion, precio, stock, id_categoria, id_color, id_talla, id_genero, mantenerImagenes } = req.body;

  // Validar que el producto exista
  const [productoExistente] = await queryAsync("SELECT id FROM producto WHERE id = ?", [id]);

  if (!productoExistente) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  // Actualizar datos del producto
  await queryAsync(
    `UPDATE producto
     SET nombre_producto = ?, descripcion = ?, precio = ?, stock = ?, 
         id_categoria = ?, id_color = ?, id_talla = ?, id_genero = ?, 
         fecha_actualizacion = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [nombre_producto, descripcion, precio, stock, id_categoria, id_color, id_talla, id_genero, id]
  );

  // Manejar las imágenes a mantener
  let imagenesAMantener = [];
  if (mantenerImagenes) {
    try {
      imagenesAMantener = JSON.parse(mantenerImagenes);
    } catch (err) {
      console.error("Error al procesar imágenes a mantener:", err);
    }
  }

  // Eliminar imágenes que no están en la lista de mantener
  if (Array.isArray(imagenesAMantener) && imagenesAMantener.length > 0) {
    await queryAsync(
      "DELETE FROM imagenes WHERE producto_id = ? AND id NOT IN (?)",
      [id, imagenesAMantener]
    );
  } else {
    // Si no se especifican imágenes a mantener, eliminar todas
    await queryAsync(
      "DELETE FROM imagenes WHERE producto_id = ?",
      [id]
    );
  }

  // Procesar nuevas imágenes
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      try {
        const uploadResult = await uploadToCloudinary(file.buffer);

        await queryAsync(
          "INSERT INTO imagenes (producto_id, url, creado_en) VALUES (?, ?, NOW())",
          [id, uploadResult.secure_url]
        );
      } catch (error) {
        console.error("Error al procesar nueva imagen:", error);
      }
    }
  }

  res.json({
    message: "Producto actualizado con éxito",
    id: id
  });
}));

// Eliminar un producto y sus imágenes
router.delete("/eliminar/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verificar que el producto exista
  const [producto] = await queryAsync("SELECT id FROM producto WHERE id = ?", [id]);

  if (!producto) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  // Obtener imágenes para eliminarlas de Cloudinary después (opcional)
  const imagenes = await queryAsync("SELECT url FROM imagenes WHERE producto_id = ?", [id]);

  // Eliminar registros de imágenes
  await queryAsync("DELETE FROM imagenes WHERE producto_id = ?", [id]);

  // Eliminar el producto
  await queryAsync("DELETE FROM producto WHERE id = ?", [id]);

  // Eliminar imágenes de Cloudinary (opcional, si tienes los public_ids)
  // Este paso es opcional ya que Cloudinary tiene manejo de recursos no utilizados

  res.json({ message: "Producto y sus imágenes eliminados correctamente" });
}));

// Buscar productos con filtros
router.get("/buscar", asyncHandler(async (req, res) => {
  let { q, categoria, color, talla, genero, ordenar, pagina, limite } = req.query;

  // Inicializar parámetros de paginación
  pagina = parseInt(pagina) || 1;
  limite = parseInt(limite) || 10;
  const offset = (pagina - 1) * limite;

  // Construir la consulta base
  let sqlQuery = `
    SELECT
      p.id, p.nombre_producto, p.descripcion, p.precio, p.stock,
      p.fecha_creacion, p.fecha_actualizacion,
      p.id_categoria, p.id_color, p.id_talla, p.id_genero,
      c.nombre AS categoria, co.color, t.talla, g.genero
    FROM
      producto p
    LEFT JOIN
      categorias c ON p.id_categoria = c.id_categoria
    LEFT JOIN
      color co ON p.id_color = co.id
    LEFT JOIN
      tallas t ON p.id_talla = t.id
    LEFT JOIN
      genero g ON p.id_genero = g.id
    WHERE 1=1
  `;

  // Array para parámetros
  const params = [];

  // Añadir condiciones según los filtros
  if (q) {
    sqlQuery += " AND (p.nombre_producto LIKE ? OR p.descripcion LIKE ?)";
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm);
  }

  if (categoria) {
    sqlQuery += " AND p.id_categoria = ?";
    params.push(categoria);
  }

  if (color) {
    sqlQuery += " AND p.id_color = ?";
    params.push(color);
  }

  if (talla) {
    sqlQuery += " AND p.id_talla = ?";
    params.push(talla);
  }

  if (genero) {
    sqlQuery += " AND p.id_genero = ?";
    params.push(genero);
  }

  // Consulta para contar total de resultados
  const countQuery = sqlQuery.replace("SELECT\n      p.id, p.nombre_producto", "SELECT COUNT(*) as total");
  const [countResult] = await queryAsync(countQuery, params);
  const total = countResult.total;

  // Añadir ordenamiento
  if (ordenar) {
    const [campo, direccion] = ordenar.split(':');
    const camposValidos = ['nombre_producto', 'precio', 'stock', 'fecha_creacion'];
    const direccionesValidas = ['asc', 'desc'];

    if (camposValidos.includes(campo) && direccionesValidas.includes(direccion.toLowerCase())) {
      sqlQuery += ` ORDER BY p.${campo} ${direccion}`;
    }
  } else {
    sqlQuery += " ORDER BY p.id DESC";
  }

  // Añadir paginación
  sqlQuery += " LIMIT ? OFFSET ?";
  params.push(limite, offset);

  // Ejecutar consulta principal
  const productos = await queryAsync(sqlQuery, params);

  // Obtener imágenes para cada producto
  for (const producto of productos) {
    const imagenes = await queryAsync(
      "SELECT id, url FROM imagenes WHERE producto_id = ?",
      [producto.id]
    );
    producto.imagenes = imagenes;

    if (imagenes.length > 0) {
      producto.imagen = imagenes[0].url;
    }
  }

  // Enviar respuesta con metadatos de paginación
  res.status(200).json({
    productos,
    paginacion: {
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    }
  });
}));

// Obtener todos los catálogos en una sola llamada
router.get("/catalogos", asyncHandler(async (req, res) => {
  const [categorias, colores, tallas, generos] = await Promise.all([
    queryAsync("SELECT * FROM categorias"),
    queryAsync("SELECT * FROM color"),
    queryAsync("SELECT * FROM tallas"),
    queryAsync("SELECT * FROM genero")
  ]);

  res.status(200).json({
    categorias,
    colores,
    tallas,
    generos
  });
}));

// Mantener endpoints anteriores para compatibilidad
router.get("/obtenercat", asyncHandler(async (req, res) => {
  const categorias = await queryAsync("SELECT * FROM categorias");
  res.status(200).json(categorias);
}));

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

router.get("/generos", asyncHandler(async (req, res) => {
  const generos = await queryAsync("SELECT * FROM genero");
  res.status(200).json(generos);
}));


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

// Modificación del endpoint para producto-detalle
router.get('/producto-detalle/:id', (req, res) => {
  const productId = req.params.id;

  // Función para promisificar la consulta
  const queryAsync = (sql, params) => {
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };

  // Función para obtener el producto
  const getProducto = async () => {
    try {
      // 1. Obtener información básica del producto
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
          p.id_genero
        FROM 
          u988046079_bdgislive.producto p
        WHERE 
          p.id = ?;
      `;

      const productoResult = await queryAsync(query, [productId]);

      if (productoResult.length === 0) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      const producto = productoResult[0];

      // 2. Obtener todas las imágenes del producto
      const imagenesQuery = `
        SELECT id, url 
        FROM u988046079_bdgislive.imagenes 
        WHERE producto_id = ?;
      `;

      const imagenes = await queryAsync(imagenesQuery, [productId]);

      // 3. Añadir las imágenes al objeto del producto
      producto.imagenes = imagenes;

      // 4. Mantener compatibilidad con código antiguo
      if (imagenes.length > 0) {
        producto.url = imagenes[0].url;
      }

      res.status(200).json(producto);
    } catch (err) {
      console.error("Error al obtener los detalles del producto:", err);
      res.status(500).json({ error: "Error al obtener los detalles del producto" });
    }
  };

  getProducto();
});

// Endpoint para búsqueda de productos
router.get("/buscare", (req, res) => {
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
//YERELI PITSOTL 🥺
module.exports = router;