const express = require('express');
const router = express.Router();
const db = require("../Config/db"); // Tu conexión a la base de datos
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// 🔹 Configuración de Cloudinary
cloudinary.config({
  cloud_name: "dqshjerfz",
  api_key: "621792211413143",
  api_secret: "Y2SiySDJ_WzYdaN96uoyUdtyt54",
});

// 🔹 Configurar Multer para almacenar en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🔹 Subida a Cloudinary
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) {
          console.error("Error al subir a Cloudinary:", error);
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// Agregar un nuevo banner con una imagen
router.post("/agregarbanner", upload.single('imagen'), asyncHandler(async (req, res) => {
  const { titulo, descripcion } = req.body;

  // Validación de datos
  if (!titulo || !descripcion) {
    return res.status(400).json({ message: "El título y la descripción son obligatorios." });
  }

  let url = '';
  if (req.file) {
    try {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'banners');
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      return res.status(500).json({ message: "Error al subir la imagen" });
    }
  }

  try {
    const result = await queryAsync(
      "INSERT INTO banner (titulo, descripcion, url) VALUES (?, ?, ?)",
      [titulo, descripcion, uploadResult.secure_url]
    );

    res.status(201).json({
      message: "Banner agregado exitosamente",
      id: result.insertId,
      url
    });
  } catch (err) {
    console.error("Error al insertar banner:", err);
    res.status(500).json({ message: "Error al guardar en la base de datos" });
  }
}));


// 🔹 Obtener todos los banners
router.get("/obtenerbanner", (req, res) => {
  db.query("SELECT * FROM banner ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ message: "Error al obtener banners" });
    res.json(results);
  });
});

// 🔹 Obtener un banner por ID
router.get("/bannersget/:id", (req, res) => {
  const { id } = req.params;

  db.query("SELECT * FROM banner WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error al obtener el banner" });
    if (results.length === 0) return res.status(404).json({ message: "Banner no encontrado" });
    res.json(results[0]);
  });
});

// 🔹 Editar un banner
router.put("/bannersedit/:id", upload.single('imagen'), async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion } = req.body;

  if (!titulo || !descripcion) {
    return res.status(400).json({ message: "El título y la descripción son obligatorios." });
  }

  try {
    const url = req.file ? await uploadToCloudinary(req.file.buffer, 'banners') : null;

    const sql = url
      ? "UPDATE banner SET titulo = ?, descripcion = ?, url = ? WHERE id = ?"
      : "UPDATE banner SET titulo = ?, descripcion = ? WHERE id = ?";
    
    const params = url ? [titulo, descripcion, url, id] : [titulo, descripcion, id];

    db.query(sql, params, (err, result) => {
      if (err) return res.status(500).json({ message: "Error al actualizar el banner" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Banner no encontrado" });
      res.json({ message: "Banner actualizado exitosamente" });
    });
  } catch (err) {
    console.error("Error al subir imagen:", err);
    res.status(500).json({ message: "Error al subir la imagen" });
  }
});

// 🔹 Eliminar banner
router.delete("/banners/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM banner WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("Error al eliminar el banner:", err);
      return res.status(500).json({ message: "Error al eliminar el banner" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Banner no encontrado" });
    }

    return res.json({ message: "Banner eliminado exitosamente" });
  });
});

module.exports = router;

