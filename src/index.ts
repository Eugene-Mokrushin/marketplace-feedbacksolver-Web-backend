import * as express from 'express';
import serverless = require('serverless-http');
import { AppMiddleware } from './app.middleware';

const app = express();

app.use((req, res, next) => {
  const nest = new AppMiddleware(app).use(req, res, next);
  nest
    .then(() => {
      next();
    })
    .catch((err) => {
      console.log(JSON.stringify(err));
      next();
    });
});

module.exports.handler = serverless(app);
