import {
  HttpException,
  HttpStatus,
  Injectable,
  LoggerService,
} from '@nestjs/common';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { NewFileDto, RawData } from './templatesDto';
import { FirebaseService } from '@/firebase/firebase.service';
import { doc, setDoc } from 'firebase/firestore';
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
      const ufid = uuidv4();
      const fileName = NewFileDto.fileName.replace(
        /\.(xlsx|xls|csv|xlsb|xlsm|xls|xlt|xltm|xla|xlam)$/i,
        '',
      );
      const deciferedFile = this.decipherFile(file);
      await this.uploadFile(NewFileDto, ufid, file, fileName);
      await this.saveRawFile(deciferedFile, ufid, fileName);
    } catch (error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      this.logger.error(
        `Failed to upload the file ${errorCode}. Message: ${errorMessage}`,
      );
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private decipherFile(file: File) {
    const data: RawData[] = [];

    const workbook = new exceljs.Workbook();
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);
    fileReader.onload = () => {
      const fileBuffer = fileReader.result as ArrayBuffer;
      workbook.xlsx.load(fileBuffer).then(() => {
        const worksheet = workbook.getWorksheet('Шаблон');

        worksheet.eachRow((row) => {
          const articleWB = String(row.getCell('A').value) || null;
          const brand = String(row.getCell('B').value) || null;
          const rating = +row.getCell('C').value || null;

          let response = null;
          if (row.getCell('E').value) {
            const cellValue = row.getCell('E').value;
            response =
              typeof cellValue === 'string' ? cellValue.split('^') : null;
          }

          let triggers = null;
          if (row.getCell('G').value) {
            const cellValue = row.getCell('G').value;
            triggers =
              typeof cellValue === 'string'
                ? cellValue.replace(', ', ',').split(',')
                : null;
          }

          const blacklistResponse = String(row.getCell('H').value) || null;

          let recommendation = null;
          if (row.getCell('J').value) {
            const cellValue = row.getCell('J').value;
            recommendation =
              typeof cellValue === 'string'
                ? cellValue.replace(', ', ',').split(',')
                : null;
          }

          if (articleWB || brand) {
            const rowData: RawData = {
              articleWB,
              brand,
              rating,
              response,
              triggers,
              blacklistResponse,
              recommendation,
            };
            data.push(rowData);
          }
        });
        data.shift();
      });
    };

    return data;
  }

  private async uploadFile(
    NewFileDto: NewFileDto,
    ufid: string,
    file: File,
    fileName: string,
  ) {
    const storage = getStorage(this.firebaseService.getApp());
    const storageRef = ref(storage, ufid);
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uid: NewFileDto.user.uid,
        fileName: fileName,
      },
    };
    await uploadBytes(storageRef, file, metadata);
  }

  private async saveRawFile(
    deciferedFile: RawData[],
    ufid: string,
    filename: string,
  ) {
    await setDoc(doc(this.firebaseService.getFirestore(), 'templates', ufid), {
      file_name: filename,
      raw_data: JSON.stringify(deciferedFile),
    });
  }
}
