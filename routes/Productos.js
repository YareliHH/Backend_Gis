const express = require('express');
const router = express.Router();
const db = require('../Config/db');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configuración de multer para manejar imágenes en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Obtener todos los productos
router.get('/productosid', (req, res) => {
    db.query('SELECT * FROM productos', (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al obtener productos' });
        } else {
            res.json(results);
        }
    });
});
// Obtener un producto por ID
router.get('/obtenerproducto/:id', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM productos WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al obtener producto' });
        } else if (results.length === 0) {
            res.status(404).json({ error: 'Producto no encontrado' });
        } else {
            res.json(results[0]);
        }
    });
});


// Agregar un nuevo producto con imágenes en Cloudinary
router.post('/agregar', upload.array('imagenes', 5), async (req, res) => {
    try {
        const { nombre_producto, descripcion, precio, talla, color, stock, categoria_id } = req.body;
        
        // Insertar el producto en la base de datos
        const productoId = await new Promise((resolve, reject) => {
            const query = `INSERT INTO productos (nombre_producto, descripcion, precio, talla, color, stock, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            db.query(query, [nombre_producto, descripcion, precio, talla, color, stock, categoria_id], (err, result) => {
                if (err) return reject(err);
                resolve(result.insertId);
            });
        });

        // Procesar imágenes si se enviaron archivos
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const uploadResult = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'productos' },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result);
                        }
                    );
                    streamifier.createReadStream(file.buffer).pipe(stream);
                });

                await new Promise((resolve, reject) => {
                    const query = 'INSERT INTO imagenes (producto_id, url) VALUES (?, ?)';
                    db.query(query, [productoId, uploadResult.secure_url], (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });
            }
        }

        res.status(201).json({ message: 'Producto y sus imágenes creados exitosamente', productoId });
    } catch (error) {
        console.error('Error al crear producto e imágenes:', error);
        res.status(500).json({ message: 'Error al crear producto' });
    }
});

// Agregar un nuevo producto
router.post('/agregar', (req, res) => {
    const { nombre_producto, descripcion, precio,talla, color, stock, categoria_id } = req.body;
    db.query(
        'INSERT INTO productos (nombre_producto, descripcion, precio, talla, color, stock, categoria_id) VALUES (?, ?, ?, ?, ?)',
        [nombre, descripcion, precio, stock, categoria_id],
        (err, results) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Error al agregar producto' });
            } else {
                res.json({ id: results.insertId, nombre_producto, descripcion, precio, talla, color, stock, categoria_id });
            }
        }
    );
});

// Actualizar un producto
router.put('/actualizarproducto', (req, res) => {
    const { id } = req.params;
    const { nombre_producto, descripcion, precio, talla, color, stock, categoria_id } = req.body;
    db.query(
        'UPDATE productos SET nombre_producto = ?, descripcion = ?, precio = ?, talla = ?, color = ?, stock = ?, categoria_id = ? WHERE id = ?',
        [nombre_producto, descripcion, precio, talla, color, stock, categoria_id, id],
        (err) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Error al actualizar producto' });
            } else {
                res.json({ message: 'Producto actualizado correctamente' });
            }
        }
    );
});

// Eliminar un producto
router.delete('/eliminarproducto', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM productos WHERE id = ?', [id], (err) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al eliminar producto' });
        } else {
            res.json({ message: 'Producto eliminado correctamente' });
        }
    });
});

module.exports = router;
