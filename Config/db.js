const mysql = require('mysql2');
require('dotenv').config(); // Cargar variables de entorno desde .env

// Definir si se usará la base de datos local o la de producción
const isLocalhost = false; // Cambia a true para usar la base de datos local

const config = isLocalhost
  ? {
      // Configuración local
      host: 'localhost',
      user: 'root', // Usuario local
      password: '', // Contraseña local (déjala vacía si no usas una)
      database: 'bdgislive', // Nombre de la base de datos local
      port: 3306,
    }
  : {
      // Configuración de producción (Hostinger)
      host: '191.96.56.103', // Dirección IP o dominio del servidor MySQL en Hostinger
      user: 'u988046079_bdgislive', // Usuario de la base de datos en Hostinger
      password: 'bdGislive2023$', // Reemplaza con la contraseña correcta
      database: 'u988046079_bdgislive', // Nombre exacto de la base de datos en Hostinger
      port: 3306,
    };

// Crear un pool de conexiones a MySQL
const pool = mysql.createPool({
  ...config,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
});

// Verificar la conexión
pool.getConnection((err, connection) => {
  if (err) {
    console.error(' Error conectando a la base de datos:', err.message);
    return;
  }
  console.log(' Conexión a MySQL exitosa');
  console.log(' Base de datos conectada en:', config.host);
  connection.release();
});

module.exports = pool;
