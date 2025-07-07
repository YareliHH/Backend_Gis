const express = require('express');
const router = express.Router();
const db = require("../Config/db"); // Asegúrate de que db.js tiene las funciones necesarias
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// 🔹 Configuración de Cloudinary
cloudinary.config({
  cloud_name: "dqshjerfz",
  api_key: "621792211413143",
  api_secret: "Y2SiySDJ_WzYdaN96uoyUdtyt54",
});

// 🔹 Configurar Multer para almacenamiento en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 🔹 Función para subir imágenes a Cloudinary
const uploadToCloudinary = async (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: "image" },
      (error, result) => {
        if (error) {
          console.error("Error al subir imagen a Cloudinary:", error);
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// 🔹 Ruta para agregar un nuevo banner
router.post("/agregarbanner", upload.single('imagen'), async (req, res) => {
  const { titulo, descripcion } = req.body;

  if (!titulo || !descripcion) {
    return res.status(400).json({ message: "El título y la descripción son obligatorios." });
  }

  try {
    const imageUrl = req.file ? await uploadToCloudinary(req.file.buffer, 'banners') : '';

    db.crearBanner(titulo, descripcion, imageUrl, (err, result) => {
      if (err) {
        console.error("Error al agregar el banner:", err);
        return res.status(500).json({ message: "Error interno del servidor" });
      }
      res.status(201).json({ message: "Banner agregado exitosamente", id: result.insertId });
    });
  } catch (err) {
    res.status(500).json({ message: "Error al subir la imagen" });
  }
});

// 🔹 Obtener todos los banners
router.get("/obtbanner", (req, res) => {
  db.obtenerTodosBanners((err, results) => {
    if (err) {
      console.error("Error al obtener los banners:", err);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
    res.json(results);
  });
});

// 🔹 Obtener un banner por ID
router.get("/bannersget/:id", (req, res) => {
  const { id } = req.params;

  db.obtenerBannerPorId(id, (err, results) => {
    if (err) {
      console.error("Error al obtener el banner:", err);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Banner no encontrado" });
    }
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
    const imageUrl = req.file ? await uploadToCloudinary(req.file.buffer, 'banners') : null;

    db.actualizarBanner(id, titulo, descripcion, imageUrl, (err, result) => {
      if (err) {
        console.error("Error al actualizar el banner:", err);
        return res.status(500).json({ message: "Error interno del servidor" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Banner no encontrado" });
      }
      res.json({ message: "Banner actualizado exitosamente" });
    });
  } catch (err) {
    res.status(500).json({ message: "Error al subir la imagen" });
  }
});

// 🔹 Eliminar un banner
router.delete("/banners/:id", (req, res) => {
  const { id } = req.params;

  db.eliminarBanner(id, (err, result) => {
    if (err) {
      console.error("Error al eliminar el banner:", err);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Banner no encontrado" });
    }
    res.json({ message: "Banner eliminado exitosamente" });
  });
});

module.exports = router;
