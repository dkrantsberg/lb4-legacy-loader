import {Request, Response} from 'express';

class TestApi {
  public testMiddleware1 = (req: Request, res: Response) => {
    res.json({test: 'Hello World 1!'});
  };
  public testMiddleware2 = (req: Request, res: Response) => {
    res.json({test: 'Hello World 2! '});
  };
  public testMiddleware3 = (req: Request, res: Response) => {
    res.json({test: 'Hello World 3!'});
  };
  public testMiddleware4 = (req: Request, res: Response) => {
    res.json({test: 'Hello World 4!'});
  };

  public get Routes() {
    return [
      {path: '/test1', httpMethod: 'GET', middleware: this.testMiddleware1},
      {path: '/test1', httpMethod: 'POST', middleware: this.testMiddleware1},
      {path: '/test2', httpMethod: 'GET', middleware: this.testMiddleware2},
      {path: '/test3', httpMethod: 'GET', middleware: this.testMiddleware3},
      {path: '/test4', httpMethod: 'GET', middleware: this.testMiddleware4}
    ];
  }
}

export = new TestApi();
