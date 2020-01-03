import {Application, Component, CoreBindings, inject} from '@loopback/core';
import * as glob from 'glob';
import * as path from 'path';
import * as _ from 'lodash';
import {RestBindings, RouterSpec} from '@loopback/rest';
import {PathObject, PathsObject} from '@loopback/openapi-v3';
import {Request, Response} from 'express';
import {OAI3Keys} from '@loopback/openapi-v3/dist/keys';
import {Injection, MetadataInspector} from '@loopback/context';
import {MetadataAccessor, MetadataMap} from '@loopback/metadata';

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

    for (const serviceModulePath of serviceModulePaths) {
      const module = require(serviceModulePath);
      const routes = getRoutes(module);

      const controllerClassName = `${module.constructor.name}Controller`;
      const middlewareFunctions: any = {};
      let pathsSpecs: PathsObject = {};
      for (const route of routes) {
        const handlerName = route.httpMethod.toLowerCase() + route.path.replace('/', '_');
        middlewareFunctions[handlerName] = route.middleware;
        appendPath(pathsSpecs, route, controllerClassName, handlerName);
      }
      const controllerSpecs: RouterSpec = {paths: pathsSpecs};
      const controllerClassDefinition = getControllerClassDefinition(controllerClassName, Object.keys(middlewareFunctions));
      const defineNewController = new Function('middlewareFunctions', controllerClassDefinition);
      const controllerClass = defineNewController(middlewareFunctions);

      MetadataInspector.defineMetadata(
        OAI3Keys.CONTROLLER_SPEC_KEY.key,
        controllerSpecs,
        controllerClass,
      );

      const injectionSpecs = getControllerInjectionSpecs(controllerClass);

      MetadataInspector.defineMetadata<MetadataMap<Readonly<Injection>[]>>(
        METHODS_KEY,
        injectionSpecs,
        controllerClass,
      );

      this.application.controller(controllerClass);
    }
  }
}

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

function getControllerClassDefinition(controllerClassName: string, handlerNames: string[]) {
  let handlers = '';
  for (const handlerName of handlerNames) {
    handlers = handlers + `async ${handlerName}() {return middlewareFunctions['${handlerName}'](this.request, this.response);}\n`;
  }
  return `return class ${controllerClassName} {
    constructor(request, response) {
       this.request = request;
       this.response = response;
    };
    
    ${handlers}      
  }`;
}

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

      function getControllerInjectionSpecs(target: Object): MetadataMap<Readonly<Injection>[]> {
        return {
          '': [
            {
              target,
              methodDescriptorOrParameterIndex: 0,
              bindingSelector: RestBindings.Http.REQUEST,
              metadata: {
                decorator: '@inject'
              }
            },
            {
              target,
              methodDescriptorOrParameterIndex: 1,
              bindingSelector: RestBindings.Http.RESPONSE,
              metadata: {
                decorator: '@inject'
              }
            }
          ]
        }
      }

interface LegacyRoute {
  path: string;
  httpMethod: string;
  middleware: (req: Request, res: Response) => {};
}
