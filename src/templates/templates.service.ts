import {
  HttpException,
  HttpStatus,
  Injectable,
  LoggerService,
} from '@nestjs/common';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { NewFileDto } from './templatesDto';
import { FirebaseService } from '@/firebase/firebase.service';
import { v4 as uuidv4 } from 'uuid';
import exceljs from 'exceljs';
import { join } from 'path';

@Injectable()
export class TemplatesService {
  constructor(
    private logger: LoggerService,
    private firebaseService: FirebaseService,
  ) {}

  downloadBasicExcel() {
    try {
      const filepath = join(__dirname, '..', 'assets', 'templateWB.xlsx');
      return filepath;
    } catch (error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      this.logger.error(
        `Failed to download file ${errorCode}. Message: ${errorMessage}`,
      );
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async addNewFile(NewFileDto: NewFileDto, file: File) {
    try {
      const workbook = new exceljs.Workbook();
      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(file); // Read the file as an ArrayBuffer

      fileReader.onload = () => {
        const fileBuffer = fileReader.result as ArrayBuffer;
        workbook.xlsx.load(fileBuffer).then(() => {
          const worksheet = workbook.getWorksheet('Шаблон');
          const data = [];

          worksheet.eachRow((row, rowNumber) => {
            const rowData = {
              articleWB: row.getCell('A').value || null,
              brand: row.getCell('B').value || null,
              rating: row.getCell('C').value || null,
              response: row.getCell('E').value
                ? row.getCell('E').value.split('^')
                : null,
              triggers: row.getCell('G').value
                ? row.getCell('G').value.replace(', ', ',').split(',')
                : null,
              blacklistResponse: row.getCell('H').value || null,
              recommendation: row.getCell('J').value
                ? row.getCell('J').value.replace(', ', ',').split(',')
                : null,
            };
            if (rowData.articleWB || rowData.brand) {
              data.push(rowData);
            }
          });
          data.shift();
        });
      };
      const storage = getStorage(this.firebaseService.getApp());
      const trueFilename = NewFileDto.fileName.replace(/.xlsx/g, '');
      const storageRef = ref(storage, uuidv4());
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uid: NewFileDto.user.uid,
          fileName: trueFilename,
        },
      };
      await uploadBytes(storageRef, file, metadata);
    } catch (error) {}
  }
}
