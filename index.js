// index.js
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const bodyParser = require('body-parser');
const timeApi = require('./api');

const app = express();
const port = 3000;

app.use(bodyParser.json()); // To parse JSON bodies

// Swagger configuration
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'World Time API Wrapper',
      version: '1.0.0',
      description: 'API to fetch the current time in Germany, authenticate users, and set work times',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./api.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Use the API routes
app.use('/', timeApi);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api-docs`);
});

// // Create users.json
// const fs = require('fs');
// const path = require('path');
// const usersFilePath = path.join(__dirname, 'users.json');
// const usersData = [
//   { username: 'user1', password: 'password1' },
//   { username: 'user2', password: 'password2' },
//   { username: 'admin', password: 'adminpass' }
// ];
// fs.writeFileSync(usersFilePath, JSON.stringify(usersData, null, 2));
