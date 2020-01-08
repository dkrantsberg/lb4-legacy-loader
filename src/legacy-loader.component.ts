import {Application, Component, CoreBindings, inject} from '@loopback/core';
import * as glob from 'glob';
import * as path from 'path';
import * as _ from 'lodash';
import {RestBindings, RouterSpec} from '@loopback/rest';
import {PathObject, PathsObject} from '@loopback/openapi-v3';
import {Request, Response, NextFunction} from 'express';
import {OAI3Keys} from '@loopback/openapi-v3/dist/keys';
import {Injection, MetadataInspector} from '@loopback/context';
import {MetadataAccessor, MetadataMap} from '@loopback/metadata';
import * as async from 'async';
import * as util from 'util';

const METHODS_KEY = MetadataAccessor.create<Injection, MethodDecorator>(
  'inject:methods',
);

const options = {
  pattern: 'api/*.js',
  directory: process.cwd() + '/dist',
};

export class LegacyLoaderComponent implements Component {
  constructor(@inject(CoreBindings.APPLICATION_INSTANCE) private application: Application) {
    const serviceModulePaths = glob.sync(options.pattern, {cwd: options.directory})
      .map(file => {
        return path.resolve(options.directory, file);
      });

    // loop over discovered api modules
    for (const serviceModulePath of serviceModulePaths) {
      const module = require(serviceModulePath);
      const routes = getRoutes(module);

      const controllerClassName = `${module.constructor.name}Controller`;
      const middlewareFunctions: any = {};  // an key-value object with keys being route handler names and values the handler function themselves
      let pathsSpecs: PathsObject = {};  // LB4 object to add to class to specify route / handler mapping
      // loop over routes defined in the module
      for (const route of routes) {
        const handlerName = route.httpMethod.toLowerCase() + route.path.replace('/', '_');
        middlewareFunctions[handlerName] = route.middleware;
        appendPath(pathsSpecs, route, controllerClassName, handlerName);
      }
      const controllerSpecs: RouterSpec = {paths: pathsSpecs};
      const controllerClassDefinition = getControllerClassDefinition(controllerClassName, Object.keys(middlewareFunctions));
      const defineNewController = new Function('middlewareRunner', 'middlewareFunctions', controllerClassDefinition);
      const controllerClass = defineNewController(middlewareRunnerPromise, middlewareFunctions);

      // Add metadata for mapping HTTP routes to controller class functions
      MetadataInspector.defineMetadata(
        OAI3Keys.CONTROLLER_SPEC_KEY.key,
        controllerSpecs,
        controllerClass,
      );

      const injectionSpecs = getControllerInjectionSpecs(controllerClass);
      // Add metadata for injecting HTTP Request and Response objects into controller class
      MetadataInspector.defineMetadata<MetadataMap<Readonly<Injection>[]>>(
        METHODS_KEY,
        injectionSpecs,
        controllerClass,
      );

      // add controller to the LB4 application
      this.application.controller(controllerClass);
    }
  }
}

/**
 * Runs middleware function or a collection of functions
 * @param middleware middleware which can be either a single function or an array of functions
 * @param req HTTP request object
 * @param res HTTP response object
 * @param cb callback function
 */
function middlewareRunner(middleware: any, req: Request, res: Response, cb: NextFunction) {
  if (_.isFunction(middleware)) {
    middleware(req, req, cb);
  } else if (_.isArray(middleware)) {
    // apply request and response arguments to each middleware function and run them
    async.applyEachSeries(middleware, req, res, cb);
  }
}

const middlewareRunnerPromise = util.promisify(middlewareRunner);

/**
 * @description Retrieves the list of routes from the given module.
 * @param {Module} serviceModule - A NodeJS module that defines routes
 * @returns {Array} - A list of route objects or an empty array
 * @private
 */
function getRoutes(serviceModule: any): LegacyRoute[] {
  if (_.isFunction(serviceModule)) {  // support revealing module pattern
    serviceModule = serviceModule();
  }

  let routes = serviceModule.Routes || serviceModule.routes || [];

  // Ensure modifications of the route properties do not mutate the original module
  return _.cloneDeep(routes);
}

/**
 * Returns a string with controller class definition
 * @param controllerClassName - a name to be given to controller class
 * @param handlerNames - handler function name
 */
function getControllerClassDefinition(controllerClassName: string, handlerNames: string[]): string {
  let handlers = '';
  for (const handlerName of handlerNames) {
    handlers = handlers + `async ${handlerName}() {return await middlewareRunner(middlewareFunctions['${handlerName}'], this.request, this.response);}\n`;
  }
  return `return class ${controllerClassName} {
    constructor(request, response) {
       this.request = request;
       this.response = response;
    };
    
    ${handlers}      
  }`;
}

/**
 * Appends a new LB4 PathObject to PathObjects collection
 * @param pathsObject - LB4 PathObjects collection to append new item to
 * @param route - HTTP route for new PathObject
 * @param controllerName - controller class name
 * @param handlerName - handler function name to map HTTP route to
 */
function appendPath(pathsObject: PathsObject, route: LegacyRoute, controllerName: string, handlerName: string) {
  let pathObject: PathObject;
  const method = route.httpMethod.toLowerCase();
  if (!pathsObject[route.path]) {
    pathObject = {};
    pathsObject[route.path] = pathObject;
  } else {
    pathObject = pathsObject[route.path];
  }
  pathObject[method] = {
    responses: {},
    'x-operation-name': handlerName,
    'x-controller-name': controllerName,
    operationId: `${controllerName}.${handlerName}`,
  };
}


/**
 * Returns LB4 MetadataMap to be used for injecting Request and Response objects to dynamically defined controller classes
 * @param target - controller class object
 */
function getControllerInjectionSpecs(target: Object): MetadataMap<Readonly<Injection>[]> {
  return {
    '': [
      {
        target,
        methodDescriptorOrParameterIndex: 0,
        bindingSelector: RestBindings.Http.REQUEST,
        metadata: {
          decorator: '@inject',
        },
      },
      {
        target,
        methodDescriptorOrParameterIndex: 1,
        bindingSelector: RestBindings.Http.RESPONSE,
        metadata: {
          decorator: '@inject',
        },
      },
    ],
  };
}

interface LegacyRoute {
  path: string;
  httpMethod: string;
  middleware: (req: Request, res: Response) => {};
}
