const express = require("express");
const router = express.Router();
const db = require("../Config/db");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Configuración de multer para manejar imágenes en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//Obtener todos los productos
router.get("/productosid", (req, res) => {
    db.query("SELECT * FROM productos", (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error al obtener productos" });
        }
        res.json(results);
    });
});

// Obtener un producto por ID
router.get("/obtenerproducto/:id", (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM productos WHERE id = ?", [id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error al obtener producto" });
        } 
        if (results.length === 0) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }
        res.json(results[0]);
    });
});

// Agregar un nuevo producto con imágenes en Cloudinary
router.post("/agregar", upload.array("imagenes", 5), async (req, res) => {
    try {
        const { nombre_producto, descripcion, precio, talla, color, stock, categoria_id, genero } = req.body;

        // Insertar el producto en la base de datos
        const productoId = await new Promise((resolve, reject) => {
            const query = `
                INSERT INTO productos (nombre_producto, descripcion, precio, talla, color, stock, categoria_id, genero, fecha_creacion, fecha_actualizacion)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
            db.query(query, [nombre_producto, descripcion, precio, talla, color, stock, categoria_id, genero], (err, result) => {
                if (err) return reject(err);
                resolve(result.insertId);
            });
        });

        // Procesar imágenes y guardarlas en Cloudinary
        let imagenes = [];
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

                // Guardar la URL en la base de datos
                await new Promise((resolve, reject) => {
                    const query = "INSERT INTO imagenes (producto_id, url) VALUES (?, ?)";
                    db.query(query, [productoId, uploadResult.secure_url], (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });

                imagenes.push(uploadResult.secure_url);
            }
        }

        res.status(201).json({ message: "Producto y sus imágenes creados exitosamente", productoId, imagenes });
    } catch (error) {
        console.error("Error al crear producto e imágenes:", error);
        res.status(500).json({ message: "Error al crear producto" });
    }
});

//  Actualizar un producto
router.put("/actualizarproducto/:id", (req, res) => {
    const { id } = req.params;
    const { nombre_producto, descripcion, precio, talla, color, stock, categoria_id, genero } = req.body;
    
    db.query(
        `UPDATE productos 
         SET nombre_producto = ?, descripcion = ?, precio = ?, talla = ?, color = ?, stock = ?, categoria_id = ?, genero = ?, fecha_actualizacion = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [nombre_producto, descripcion, precio, talla, color, stock, categoria_id, genero, id],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Error al actualizar producto" });
            }
            res.json({ message: "Producto actualizado correctamente" });
        }
    );
});

//  Eliminar un producto y sus imágenes
router.delete("/eliminarproducto/:id", async (req, res) => {
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
        db.query("DELETE FROM productos WHERE id = ?", [id], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Error al eliminar producto" });
            }
            res.json({ message: "Producto y sus imágenes eliminados correctamente" });
        });

    } catch (error) {
        console.error("Error al eliminar producto:", error);
        res.status(500).json({ message: "Error al eliminar producto" });
    }
});

module.exports = router;
