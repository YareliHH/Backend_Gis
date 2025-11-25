const express = require('express');
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const db = require('../Config/db');

// Multer almacenamiento en memoria
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: 'dqshjerfz',
  api_key: '621792211413143',
  api_secret: 'Y2SiySDJ_WzYdaN96uoyUdtyt54',
});

// ☁️ Subida a Cloudinary
const uploadToCloudinary = async (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder, 
        resource_type: "image",
        transformation: [
          { width: 500, height: 500, crop: "limit" },
          { quality: "auto" }
        ]
      },
      (error, result) => {
        if (error) {
          console.error("Error al subir a Cloudinary:", error);
          reject(new Error("Error al subir la imagen"));
        } else {
          resolve(result.secure_url);
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// 1. CREAR INSIGNIA
router.post("/crear", upload.single("icono"), async (req, res) => {
  try {
    const { nombre, descripcion, tipo, regla } = req.body;

    if (!nombre || !tipo || !regla) {
      return res.status(400).json({ 
        message: "Nombre, tipo y regla son obligatorios.",
        error: true
      });
    }

    if (nombre.length > 255) {
      return res.status(400).json({ 
        message: "El nombre no puede exceder 255 caracteres",
        error: true
      });
    }

    let icono_url = "";
    
    if (req.file) {
      try {
        icono_url = await uploadToCloudinary(req.file.buffer, "insignias");
      } catch (uploadError) {
        console.error("Error en uploadToCloudinary:", uploadError);
        return res.status(500).json({ 
          message: "Error al subir la imagen",
          error: true
        });
      }
    }

    // CORREGIDO: Usar 'fecha' en lugar de 'fecha_creacion'
    const [result] = await db.query(
      "INSERT INTO insignias (nombre, descripcion, icono_url, tipo, regla, activa, fecha_creacion) VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)",
      [nombre.trim(), descripcion?.trim() || "", icono_url, tipo.trim(), regla.trim()]
    );

    res.status(201).json({ 
      message: "Insignia creada exitosamente", 
      id: result.insertId,
      success: true
    });
  } catch (error) {
    console.error("Error al crear insignia:", error);
    res.status(500).json({ 
      message: error.message || "Error interno del servidor",
      error: true
    });
  }
});

// 2. OBTENER TODAS LAS INSIGNIAS
router.get("/obtener",  (req, res) => {
  
    // CORREGIDO: Usar 'fecha' en lugar de 'fecha_creacion'
    db.query("SELECT id, nombre, descripcion, icono_url, tipo, regla, activa, fecha_creacion FROM insignias ORDER BY fecha_creacion DESC", 
    (error, results) => 
      {
        if (error)
        {
          console.error("Error al obtener insignias:", error);
          return res.status(500).json({ message: "Error al obtener insignias" });
        }
        res.json(results);
      }

    );
});

// 3. OBTENER INSIGNIA POR ID
router.get("/insignias/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        message: "ID inválido",
        error: true
      });
    }

    // CORREGIDO: Usar 'fecha' en lugar de 'fecha_creacion'
    const [rows] = await db.query(
      "SELECT id, nombre, descripcion, icono_url, tipo, regla, activa, fecha_creacion FROM insignias WHERE id = ?", 
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        message: "Insignia no encontrada.",
        error: true
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener insignia por ID:", error);
    res.status(500).json({ 
      message: "Error interno del servidor",
      error: true
    });
  }
});

// 4. ACTUALIZAR INSIGNIA
router.put("/insignias/:id", upload.single("icono"), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, tipo, regla } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        message: "ID inválido",
        error: true
      });
    }

    if (!nombre || !tipo || !regla) {
      return res.status(400).json({ 
        message: "Nombre, tipo y regla son obligatorios.",
        error: true
      });
    }

    if (nombre.length > 255) {
      return res.status(400).json({ 
        message: "El nombre no puede exceder 255 caracteres",
        error: true
      });
    }

    const [existing] = await db.query("SELECT icono_url FROM insignias WHERE id = ?", [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ 
        message: "Insignia no encontrada.",
        error: true
      });
    }

    let icono_url = existing[0].icono_url || "";

    if (req.file) {
      try {
        icono_url = await uploadToCloudinary(req.file.buffer, "insignias");
      } catch (uploadError) {
        console.error("Error en uploadToCloudinary:", uploadError);
        return res.status(500).json({ 
          message: "Error al subir la nueva imagen",
          error: true
        });
      }
    }

    const [result] = await db.query(
      "UPDATE insignias SET nombre = ?, descripcion = ?, icono_url = ?, tipo = ?, regla = ? WHERE id = ?",
      [nombre.trim(), descripcion?.trim() || "", icono_url, tipo.trim(), regla.trim(), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        message: "Insignia no encontrada.",
        error: true
      });
    }

    res.json({ 
      message: "Insignia actualizada exitosamente",
      success: true
    });
  } catch (error) {
    console.error("Error al actualizar insignia:", error);
    res.status(500).json({ 
      message: error.message || "Error interno del servidor",
      error: true
    });
  }
});

// 5. ELIMINAR INSIGNIA
router.delete("/insignias/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        message: "ID inválido",
        error: true
      });
    }

    // Verificar si hay usuarios con esta insignia
    const [usuariosConInsignia] = await db.query(
      "SELECT COUNT(*) as count FROM usuarios_insignias WHERE insignia_id = ?",
      [id]
    );

    if (usuariosConInsignia[0].count > 0) {
      return res.status(400).json({ 
        message: `No se puede eliminar. Hay ${usuariosConInsignia[0].count} usuario(s) con esta insignia.`,
        error: true
      });
    }

    const [result] = await db.query("DELETE FROM insignias WHERE id = ?", [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        message: "Insignia no encontrada.",
        error: true
      });
    }

    res.json({ 
      message: "Insignia eliminada exitosamente",
      success: true
    });
  } catch (error) {
    console.error("Error al eliminar insignia:", error);
    res.status(500).json({ 
      message: "Error interno del servidor",
      error: true
    });
  }
});

// Manejo de errores de multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'El archivo es demasiado grande. Máximo 5MB.',
        error: true
      });
    }
  }
  
  if (error.message === 'Solo se permiten archivos de imagen') {
    return res.status(400).json({ 
      message: error.message,
      error: true
    });
  }

  next(error);
});

// RUTA: OBTENER INSIGNIAS DE UN USUARIO
router.get("/insignias/:usuario_id", async (req, res) => {
  const { usuario_id } = req.params;

  if (!usuario_id) {
    return res.status(400).json({ message: "Falta el usuario_id" });
  }

  try {
    const [insignias] = await db.promise().query(
      `SELECT i.id, i.nombre, i.descripcion, i.icono_url, i.regla, ui.fecha_asignacion
       FROM usuarios_insignias ui
       INNER JOIN insignias i ON ui.insignia_id = i.id
       WHERE ui.usuario_id = ?`,
      [usuario_id]
    );

    return res.json({ ok: true, insignias });
  } catch (error) {
    console.error("Error obteniendo insignias del usuario:", error);
    return res
      .status(500)
      .json({ ok: false, message: "Error al obtener las insignias" });
  }
});


module.exports = router;