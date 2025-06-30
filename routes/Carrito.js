const express = require("express");
const router = express.Router();
const db = require("../Config/db");

//carrito de compras
router.post("/agregarcarrito", (req, res) => {
    const { usuario_id, producto_id, cantidad } = req.body;

    if (!usuario_id || !producto_id || !cantidad) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    db.query("SELECT precio, stock FROM producto WHERE id = ?", [producto_id], (err, results) => {
        if (err) return res.status(500).json({ error: "Error al obtener datos del producto" });

        if (results.length === 0) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        const { precio, stock } = results[0];

        if (cantidad > stock) {
            return res.status(400).json({ error: "Stock insuficiente" });
        }

        const subtotal = precio * cantidad;

        // Verificar si el producto ya está en el carrito del usuario
        db.query(
            "SELECT cantidad FROM carrito WHERE usuario_id = ? AND producto_id = ? AND estado = 'activo'",
            [usuario_id, producto_id],
            (err, results) => {
                if (err) return res.status(500).json({ error: "Error al verificar el carrito" });

                if (results.length > 0) {
                    // Si el producto ya está en el carrito, actualizar cantidad y subtotal
                    const nuevaCantidad = results[0].cantidad + cantidad;
                    const nuevoSubtotal = nuevaCantidad * precio;

                    if (nuevaCantidad > stock) {
                        return res.status(400).json({ error: "Stock insuficiente al actualizar el carrito" });
                    }

                    db.query(
                        "UPDATE carrito SET cantidad = ?, subtotal = ? WHERE usuario_id = ? AND producto_id = ? AND estado = 'activo'",
                        [nuevaCantidad, nuevoSubtotal, usuario_id, producto_id],
                        (err) => {
                            if (err) return res.status(500).json({ error: "Error al actualizar el carrito" });
                            res.json({ mensaje: "Carrito actualizado correctamente" });
                        }
                    );
                } else {
                    // Si el producto no está en el carrito, insertarlo
                    db.query(
                        "INSERT INTO carrito (usuario_id, producto_id, cantidad, subtotal, preciot, estado) VALUES (?, ?, ?, ?, ?, 'activo')",
                        [usuario_id, producto_id, cantidad, subtotal, precio],
                        (err) => {
                            if (err) return res.status(500).json({ error: "Error al agregar al carrito" });
                            res.json({ mensaje: "Producto agregado al carrito" });
                        }
                    );
                }
            }
        );
    });
});




router.get("/carrito/:usuario_id", (req, res) => {
    const { usuario_id } = req.params; // Obtener el usuario_id de los parámetros de la ruta

    if (!usuario_id) {
        return res.status(400).json({ error: "El usuario_id es obligatorio" });
    }

    // Consulta para obtener los productos del carrito del usuario
    db.query(
        `SELECT 
    carrito.id, 
    carrito.usuario_id, 
    carrito.producto_id, 
    carrito.cantidad, 
    carrito.subtotal, 
    carrito.preciot, 
    carrito.estado,
    producto.nombre_producto, 
    producto.precio, 
    producto.descripcion,
    imagenes.url AS imagen_url
FROM carrito 
JOIN producto ON carrito.producto_id = producto.id 
LEFT JOIN imagenes ON carrito.producto_id = imagenes.producto_id 
WHERE carrito.usuario_id = ? 
AND carrito.estado = 'activo'
GROUP BY carrito.id
`,
        [usuario_id],
        (err, results) => {
            if (err) return res.status(500).json({ error: "Error al obtener los productos del carrito" });

            if (results.length === 0) {
                return res.status(404).json({ error: "El carrito está vacío" });
            }

            res.json({ productos: results });
        }
    );
});


router.delete("/carrito/eliminar/:usuario_id/:producto_id", (req, res) => {
    const { usuario_id, producto_id } = req.params;

    if (!usuario_id || !producto_id) {
        return res.status(400).json({ error: "El usuario_id y producto_id son obligatorios" });
    }

    // Eliminar el producto específico del carrito
    db.query(
        "DELETE FROM carrito WHERE usuario_id = ? AND producto_id = ? AND estado = 'activo'",
        [usuario_id, producto_id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: "Error al eliminar el producto del carrito" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Producto no encontrado en el carrito" });
            }

            res.json({ mensaje: "Producto eliminado del carrito correctamente" });
        }
    );
});


router.delete("/carrito/vaciar/:usuario_id", (req, res) => {
    const { usuario_id } = req.params;

    if (!usuario_id) {
        return res.status(400).json({ error: "El usuario_id es obligatorio" });
    }

    // Eliminar todos los productos del carrito del usuario
    db.query(
        "DELETE FROM carrito WHERE usuario_id = ? AND estado = 'activo'",
        [usuario_id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: "Error al vaciar el carrito" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "El carrito ya está vacío o el usuario no existe" });
            }

            res.json({ mensaje: "Carrito vaciado correctamente" });
        }
    );
});


module.exports = router;
