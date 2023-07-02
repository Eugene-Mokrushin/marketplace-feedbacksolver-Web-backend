import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService {
  logger: Logger;
  constructor() {
    this.logger = new Logger();
  }
  log(message: any) {
    this.logger.log(message);
  }
  warn(message: any) {
    this.logger.warn(message);
  }
  error(message: any) {
    this.logger.error(message);
  }
}
