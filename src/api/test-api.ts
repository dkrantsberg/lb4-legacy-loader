import {Request, Response, NextFunction} from 'express';

class TestApi {
  public testMiddleware1 = (req: Request, res: Response, next: NextFunction) => {
    console.log('middleware 1 called');
    //    res.json({test: 'Hello World 1!'});
    next();
  };
  public testMiddleware2 = (req: Request, res: Response, next: NextFunction) => {
    res.json({message: 'Hello World 2! ', params: req.params});
    console.log('middleware 2 called');
    next();
  };
  public testMiddleware3 = (req: Request, res: Response, next: NextFunction) => {
    res.json({test: 'Hello World 3!'});
  };
  public testMiddleware4 = (req: Request, res: Response, next: NextFunction) => {
    res.json({test: 'Hello World 4!'});
  };

  public get Routes() {
    return [
      {path: '/test1', httpMethod: 'GET', middleware: [this.testMiddleware1, this.testMiddleware2]},
      {path: '/test2/:param1', httpMethod: 'GET', middleware: this.testMiddleware2},
      {path: '/test3', httpMethod: 'GET', middleware: this.testMiddleware3},
      {path: '/test4', httpMethod: 'GET', middleware: this.testMiddleware4},
    ];
  }
}

export = new TestApi();
