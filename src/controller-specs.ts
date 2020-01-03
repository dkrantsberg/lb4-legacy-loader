import {MetadataMap} from '@loopback/metadata'
import {Injection} from '@loopback/context'
import {RestBindings} from '@loopback/rest';

const testControllerSpec = {
  paths: {
    '/test': {
      post: {
        responses: {
          '200': {
            description: 'create todoListImage model instance',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/TodoListImage'
                }
              }
            }
          }
        },
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/TodoListImage'
              }
            }
          },
          'x-parameter-index': 1
        },
        'x-operation-name': 'create',
        'x-controller-name': 'TestController',
        operationId: 'TestController.create'
      },
      get: {
        responses: {
          '200': {
            description: 'The image belonging to the TodoList',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/TodoListImageWithRelations'
                }
              }
            }
          }
        },
        parameters: [],
        'x-operation-name': 'find',
        'x-controller-name': 'TestController',
        operationId: 'TestController.find'
      }
    }
  },
  components: {
    schemas: {
      TodoListImage: {
        title: 'TodoListImage',
        properties: {
          id: {
            type: 'number'
          },
          todoListId: {
            type: 'number'
          },
          value: {
            type: 'string'
          }
        },
        required: [
          'value'
        ],
        additionalProperties: false
      },
      TodoWithRelations: {
        title: 'TodoWithRelations',
        description: '(Schema options: { includeRelations: true })',
        properties: {
          id: {
            type: 'number'
          },
          title: {
            type: 'string'
          },
          desc: {
            type: 'string'
          },
          isComplete: {
            type: 'boolean'
          },
          todoListId: {
            type: 'number'
          },
          todoList: {
            $ref: '#/components/schemas/TodoListWithRelations'
          }
        },
        required: [
          'title'
        ],
        additionalProperties: false
      },
      TodoListWithRelations: {
        title: 'TodoListWithRelations',
        description: '(Schema options: { includeRelations: true })',
        properties: {
          id: {
            type: 'number'
          },
          title: {
            type: 'string'
          },
          color: {
            type: 'string'
          },
          todos: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/TodoWithRelations'
            }
          },
          image: {
            $ref: '#/components/schemas/TodoListImageWithRelations'
          }
        },
        required: [
          'title'
        ],
        additionalProperties: false
      },
      TodoListImageWithRelations: {
        title: 'TodoListImageWithRelations',
        description: '(Schema options: { includeRelations: true })',
        properties: {
          id: {
            type: 'number'
          },
          todoListId: {
            type: 'number'
          },
          value: {
            type: 'string'
          },
          todoList: {
            $ref: '#/components/schemas/TodoListWithRelations'
          }
        },
        required: [
          'value'
        ],
        additionalProperties: false
      }
    }
  }
};


const getInjectionSpecs = (target: Object): MetadataMap<Readonly<Injection>[]>  => {
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
};

export {testControllerSpec, getInjectionSpecs};
