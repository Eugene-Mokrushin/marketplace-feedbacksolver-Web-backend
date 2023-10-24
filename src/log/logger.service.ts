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
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Adding 1 to month because getMonth() returns 0-based index
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0'); // Ensure three digits for milliseconds
    const dateStr = `${year}-${month}-${day} ${hour}:${minutes}:${seconds}:${milliseconds}`;
    const log = `${dateStr} || ${message}\n`;
    fs.appendFile(`./src/log/logs/${document}.txt`, log, (err) => {
      if (err) {
        console.log(err);
      }
    });
  }
}
