const express = require('express');
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const db = require('../Config/db');

// Multer almacenamiento en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: 'dqshjerfz',
  api_key: '621792211413143',
  api_secret: 'Y2SiySDJ_WzYdaN96uoyUdtyt54',
});

// ☁️ Subida a Cloudinary
const uploadToCloudinary = async (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    ).end(fileBuffer);
  });
};

// 1. Crear insignia
router.post("/crear", upload.fields([{ name: "icono" }]), async (req, res) => {
  const { nombre, descripcion, tipo, regla } = req.body;

  if (!nombre || !tipo || !regla) {
    return res.status(400).json({ message: "Nombre, tipo y regla son obligatorios." });
  }

  try {
    const icono_url = req.files?.icono
      ? await uploadToCloudinary(req.files.icono[0].buffer, "insignias")
      : "";

    const [result] = await db.execute(
      "INSERT INTO insignias (nombre, descripcion, icono_url, tipo, regla) VALUES (?, ?, ?, ?, ?)",
      [nombre, descripcion, icono_url, tipo, regla]
    );

    res.status(201).json({ message: "Insignia creada exitosamente", id: result.insertId });
  } catch (error) {
    console.error("Error al crear insignia:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 2. Obtener todas las insignias
router.get("/obtener", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM insignias");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener insignias:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 3. Obtener insignia por ID
router.get("/insignias/:id", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM insignias WHERE id = ?", [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Insignia no encontrada." });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener insignia por ID:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 4. Actualizar insignia
router.put("/insignias/:id", upload.fields([{ name: "icono" }]), async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, tipo, regla } = req.body;

  if (!nombre || !tipo || !regla) {
    return res.status(400).json({ message: "Nombre, tipo y regla son obligatorios." });
  }

  try {
    let icono_url;

    if (req.files?.icono) {
      icono_url = await uploadToCloudinary(req.files.icono[0].buffer, "insignias");
    } else {
      const [rows] = await db.execute("SELECT icono_url FROM insignias WHERE id = ?", [id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Insignia no encontrada." });
      }
      icono_url = rows[0].icono_url || "";
    }

    const [result] = await db.execute(
      "UPDATE insignias SET nombre = ?, descripcion = ?, icono_url = ?, tipo = ?, regla = ? WHERE id = ?",
      [nombre, descripcion, icono_url, tipo, regla, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Insignia no encontrada." });
    }

    res.json({ message: "Insignia actualizada exitosamente" });
  } catch (error) {
    console.error("Error al actualizar insignia:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 5. Eliminar insignia
router.delete("/insignias/:id", async (req, res) => {
  try {
    const [result] = await db.execute("DELETE FROM insignias WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Insignia no encontrada." });
    }
    res.json({ message: "Insignia eliminada exitosamente" });
  } catch (error) {
    console.error("Error al eliminar insignia:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;


