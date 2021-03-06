// These are important and needed before anything else
import 'zone.js/dist/zone-node';
import 'reflect-metadata';

import { renderModuleFactory } from '@angular/platform-server';
import { enableProdMode } from '@angular/core';

import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';
import {APP_BASE_HREF} from '@angular/common';

const properties = {
  serverBaseUri: process.env.serverBaseUri,
  mongoConnectUrl: process.env.mongoConnectUrl,
  dbName: process.env.dbName || 'ahem',
  appListenPort: parseInt(process.env.appListenPort) || 3000,
  smtpPort: parseInt(process.env.smtpPort) || 25,
  emailDeleteInterval: parseInt(process.env.emailDeleteInterval) || 3600,
  emailDeleteAge: parseInt(process.env.emailDeleteAge) || 86400,
  allowAutocomplete: JSON.parse(process.env.allowAutocomplete),
  allowedDomains: process.env.allowedDomains.split(','),
  jwtSecret: process.env.jwtSecret,
  jwtExpiresIn: parseInt(process.env.jwtExpiresIn) || 3600,
  maxAllowedApiCalls: parseInt(process.env.maxAllowedApiCalls) || 10000
};

console.log(properties);

// Faster server renders w/ Prod mode (dev mode never needed)
enableProdMode();

// Express server
const app = express();

const PORT = process.env.PORT || 4000;
const DIST_FOLDER = join(process.cwd(), 'dist');

// Our index.html we'll use as our template
const template = fs.readFileSync(join(DIST_FOLDER, 'browser', 'index.html')).toString();

// * NOTE :: leave this as require() since this file is built Dynamically from webpack
const { AppServerModuleNgFactory, LAZY_MODULE_MAP } = require('./dist/server/main');

const { provideModuleMap } = require('@nguniversal/module-map-ngfactory-loader');

app.engine('html', (_, options, callback) => {
  renderModuleFactory(AppServerModuleNgFactory, {
    // Our index.html
    document: template,
    url: options.req.url,
    // DI so that we can get lazy-loading to work differently (since we need it to just instantly render it)
    extraProviders: [
      provideModuleMap(LAZY_MODULE_MAP),
      {provide: APP_BASE_HREF, useValue: properties.serverBaseUri}
    ]
  }).then(html => {
    callback(null, html);
  });
});

app.set('view engine', 'html');
app.set('views', join(DIST_FOLDER, 'browser'));

// Server static files from /browser
app.get('*.*', express.static(join(DIST_FOLDER, 'browser')));

// All regular routes use the Universal engine
app.get('*', (req, res) => {
  res.render(join(DIST_FOLDER, 'browser', 'index.html'), { req });
});

// Start up the Node server
app.listen(PORT, () => {
  console.log(`Node server listening on http://localhost:${PORT}`);
});
