const express = require("express");
const router = express.Router();
const db = require('../Config/db'); 


// Agregar un producto al carrito o actualizar la cantidad si ya existe
router.post("/agregar", async (req, res) => {
    const { usuario_id, producto_id, cantidad, precio_unitario } = req.body;

    try {
        if (!usuario_id || !producto_id || !cantidad || cantidad <= 0 || !precio_unitario) {
            return res.status(400).json({ message: "Datos inválidos" });
        }

        const subtotal = cantidad * precio_unitario;

        // Verificar si el producto ya está en el carrito
        const [existe] = await db.query(
            "SELECT cantidad FROM carrito WHERE usuario_id = ? AND producto_id = ?",
            [usuario_id, producto_id]
        );

        if (existe.length > 0) {
            // Si ya está en el carrito, actualizar cantidad y subtotal
            await db.query(
                `UPDATE carrito 
                 SET cantidad = cantidad + ?, subtotal = subtotal + ?, fecha_actualizacion = CURRENT_TIMESTAMP 
                 WHERE usuario_id = ? AND producto_id = ?`,
                [cantidad, subtotal, usuario_id, producto_id]
            );
            res.status(200).json({ message: "Cantidad y subtotal actualizados en el carrito" });
        } else {
            // Si no existe, insertarlo
            await db.query(
                `INSERT INTO carrito (usuario_id, producto_id, cantidad, precio_unitario, subtotal, fecha_creacion, fecha_actualizacion) 
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [usuario_id, producto_id, cantidad, precio_unitario, subtotal]
            );
            res.status(201).json({ message: "Producto agregado al carrito" });
        }
    } catch (error) {
        console.error("Error al agregar el producto:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// Obtener los productos del carrito de un usuario
router.get("/:usuario_id", async (req, res) => {
    const { usuario_id } = req.params;

    try {
        const [carrito] = await db.query(`
            SELECT c.producto_id, p.nombre, c.cantidad, c.precio_unitario, c.subtotal, 
                   c.fecha_creacion, c.fecha_actualizacion
            FROM carrito c
            INNER JOIN productos p ON c.producto_id = p.id
            WHERE c.usuario_id = ?`, [usuario_id]);

        res.status(200).json(carrito);
    } catch (error) {
        console.error("Error al obtener el carrito:", error);
        res.status(500).json({ error: "Error al obtener el carrito" });
    }
});

// Eliminar un producto del carrito
router.delete("/eliminar/:usuario_id/:producto_id", async (req, res) => {
    const { usuario_id, producto_id } = req.params;

    try {
        await db.query("DELETE FROM carrito WHERE usuario_id = ? AND producto_id = ?", [usuario_id, producto_id]);
        res.status(200).json({ message: "Producto eliminado del carrito" });
    } catch (error) {
        console.error("Error al eliminar el producto:", error);
        res.status(500).json({ error: "Error al eliminar el producto" });
    }
});

// Vaciar el carrito de un usuario
router.delete("/vaciar/:usuario_id", async (req, res) => {
    const { usuario_id } = req.params;

    try {
        await db.query("DELETE FROM carrito WHERE usuario_id = ?", [usuario_id]);
        res.status(200).json({ message: "Carrito vaciado correctamente" });
    } catch (error) {
        console.error("Error al vaciar el carrito:", error);
        res.status(500).json({ error: "Error al vaciar el carrito" });
    }
});

module.exports = router;
