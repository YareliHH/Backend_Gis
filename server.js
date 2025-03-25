// server.js

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); 
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const Registrer = require('./routes/CRUDregistre.js'); 
const login = require('./routes/CRUDuser.js');  
const TerminosYC = require('./routes/CrudTerminosYC.js'); 
const politicas = require('./routes/CrudPoliticas.js');
const deslinde = require('./routes/CrudDeslinde.js');
const perfil_empresa = require('./routes/PerfiEmpresa.js');
const redesSociales = require('./routes/RedesSociales.js');
const reportes = require('./routes/Reportes.js');
const contactanos = require('./routes/Contactanos.js');
const faqs = require('./routes/PreguntasF.js');
const productos = require('./routes/Productos.js');
const acercaDe = require('./routes/AcercaDe.js');
const ventas = require('./routes/ventas.js');
const categoria = require('./routes/Categoria.js');
const color = require ('./routes/Colores.js');
const tallas = require('./routes/Tallas.js');
const genero = require ('./routes/Generos.js');
const carrito = require ('./routes/Carrito.js');
const banner = require ('./routes/Banner.js');
const chat = require ('./routes/chat.js');

const app = express();

app.use(cookieParser());

// Configuración CORS esencial para cookies
app.use(cors({
 origin: [
   "http://localhost:3000",
  "http://localhost:3002" ,"https://gisliveboutique.com"
 ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Set-Cookie"] 
}));

// Configuración básica de seguridad con Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.google.com", "https://www.gstatic.com"],
      frameSrc: ["'self'", "https://www.google.com", "https://www.recaptcha.net"],
      imgSrc: ["'self'", "https://www.google.com", "https://www.gstatic.com"],
      connectSrc: [
        "'self'",
        "http://localhost:3000",
        "http://localhost:3001"
      ]
    }
  }
}));

// Middlewares básicos
app.use(bodyParser.json());
app.use(express.json());

// Definir las rutas de la API
app.use('/api', Registrer); 
app.use('/api', login);
app.use('/api', TerminosYC);
app.use('/api', politicas);
app.use('/api', deslinde); 
app.use('/api', perfil_empresa);
app.use('/api', redesSociales);
app.use('/api', reportes);
app.use('/api', contactanos);
app.use('/api', faqs);
app.use('/api', productos);
app.use('/api', acercaDe);
app.use('/api', ventas);
app.use('/api', categoria);
app.use('/api', color);
app.use('/api', tallas);
app.use('/api', genero);
app.use('/api', carrito);
app.use('/api', banner);
app.use('/api', chat);


// Iniciar el servidor
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

module.exports = app;
