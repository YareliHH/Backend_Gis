const express = require("express");
const router = express.Router();
const db = require("../Config/db");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: "dqshjerfz",
  api_key: "621792211413143",
  api_secret: "Y2SiySDJ_WzYdaN96uoyUdtyt54",
});

// Configuración de multer para almacenar imágenes en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

// **Obtener todos los banners**
router.get("/obtenerbanner", (req, res) => {
  const sql = "SELECT * FROM banners";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Error al obtener los banners." });
    res.json(results);
  });
});

// **Insertar un nuevo banner con imagen en Cloudinary**
router.post("/insertabanner", upload.single("imagen"), async (req, res) => {
  try {
    const { titulo, descripcion } = req.body;
    if (!titulo || !descripcion) {
      return res.status(400).json({ error: "Título y descripción son obligatorios." });
    }

    let imageUrl = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file);
      imageUrl = result.secure_url;
    }

    const sql = "INSERT INTO banners (titulo, descripcion, url) VALUES (?, ?, ?)";
    db.query(sql, [titulo, descripcion, imageUrl], (err, result) => {
      if (err) return res.status(500).json({ error: "Error al insertar el banner." });
      res.json({ id: result.insertId, titulo, descripcion, url: imageUrl });
    });
  } catch (error) {
    res.status(500).json({ error: "Error interno al insertar el banner." });
  }
});

// **Actualizar un banner con opción de nueva imagen**
router.put("/actualizarbanner/:id", upload.single("imagen"), async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion } = req.body;

    if (!titulo || !descripcion) {
      return res.status(400).json({ error: "Título y descripción son obligatorios." });
    }

    let imageUrl = req.body.url; // Mantener la URL actual si no se sube nueva imagen
    if (req.file) {
      const result = await uploadToCloudinary(req.file);
      imageUrl = result.secure_url;
    }

    const sql = "UPDATE banners SET titulo=?, descripcion=?, url=? WHERE id=?";
    db.query(sql, [titulo, descripcion, imageUrl, id], (err) => {
      if (err) return res.status(500).json({ error: "Error al actualizar el banner." });
      res.json({ mensaje: "Banner actualizado", titulo, descripcion, url: imageUrl });
    });
  } catch (error) {
    res.status(500).json({ error: "Error interno al actualizar el banner." });
  }
});

// **Eliminar un banner por ID**
router.delete("/eliminarbanner/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM banners WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ error: "Error al eliminar el banner." });
    res.json({ mensaje: "Banner eliminado" });
  });
});

// **Función para subir imágenes a Cloudinary**
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream((error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

module.exports = router;
