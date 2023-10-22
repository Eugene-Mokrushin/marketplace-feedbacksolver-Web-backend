import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
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

  writeInLogDocument(document: string, message: string) {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const hour = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const milliseconds = date.getMilliseconds();
    const dateStr = `${year}-${month}-${day} ${hour}:${minutes}:${seconds}:${milliseconds}`;
    const log = `${dateStr} || ${message}\n`;
    fs.appendFile(`./src/log/logs/${document}.txt`, log, (err) => {
      if (err) {
        console.log(err);
      }
    });
  }
}
