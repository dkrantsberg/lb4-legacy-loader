// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/example-todo-list
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {LegacyApiLoaderApplication} from './application';
import {ApplicationConfig} from '@loopback/core';

export {LegacyApiLoaderApplication};

export async function main(options: ApplicationConfig = {}) {
  const app = new LegacyApiLoaderApplication(options);
  await app.boot();
  await app.start();

  const url = app.restServer.url;
  console.log(`Server is running at ${url}`);
  return app;
}
