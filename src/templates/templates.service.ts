import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { LoggerService } from '@/log/logger.service';
import { NewFileDto, RawData } from './templatesDto';
import { FirebaseService } from '@/firebase/firebase.service';
import {
  Timestamp,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Workbook } from 'exceljs';
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

  async getSpecificFile(ufid: string) {
    try {
      const db = this.firebaseService.getFirestore();
      const templateRef = doc(db, 'templates', ufid);
      const templateDoc = await getDoc(templateRef);

      if (!templateDoc.data())
        throw new HttpException('Template not found', HttpStatus.NOT_FOUND);

      return { data: templateDoc.data() };
    } catch (error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      this.logger.error(
        `Failed to retrieve the template - ${ufid}. ${errorCode}.\nMessage: ${errorMessage}`,
      );
      throw new HttpException(errorMessage, HttpStatus.NOT_FOUND);
    }
  }

  async getAllFiles(oraginizationId: string) {
    try {
      const templates = [];

      // Getting list of templates assigned to this organization
      const db = this.firebaseService.getFirestore();
      const organizationRef = doc(db, 'organizations', oraginizationId);
      const organizationDoc = await getDoc(organizationRef);

      if (!organizationDoc.data())
        return { data: [], message: 'Organization does not exist' };

      const filesArray = (organizationDoc.data().files as string[]) || [];
      if (filesArray.length === 0)
        return {
          data: [],
          message: 'No templates are assigned to this organization',
        };

      // Getting templates assigned to this organization
      const q = query(
        collection(db, 'templates'),
        where(documentId(), 'in', filesArray),
      );
      const productsDocsSnap = await getDocs(q);

      // Mutate template object and sent it back
      productsDocsSnap.forEach((doc) => {
        const templateData = doc.data();
        const templateStats = {
          id: doc.id,
          file_name: templateData.file_name,
          timestamp: templateData.timestamp.seconds,
        };
        templates.push(templateStats);
      });
      return { data: templates };
    } catch (error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      this.logger.error(
        `Failed to retrieve the templates from ${oraginizationId}. ${errorCode}.\nMessage: ${errorMessage}`,
      );
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async addNewFile(NewFileDto: NewFileDto, file: Express.Multer.File) {
    try {
      const ufid = uuidv4();
      const fileName = NewFileDto.fileName.replace(
        /\.(xlsx|xls|csv|xlsb|xlsm|xls|xlt|xltm|xla|xlam)$/i,
        '',
      );
      // Make file plain
      const deciferedFile = await this.decipherFile(file);
      // Uploads file to bucket
      await this.uploadFile(NewFileDto, ufid, file, fileName);
      // Saves raw file for future use
      await this.saveRawFile(deciferedFile, ufid, fileName);
      // // Adds file to organization as reference
      await this.assignFile(NewFileDto.organizationUid, ufid);
      return { fileId: ufid };
    } catch (error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      this.logger.error(
        `Failed to upload the file general ${errorCode}. Message: ${errorMessage}`,
      );
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async assignFile(oraginizationId: string, ufid: string) {
    try {
      const organizationRef = doc(
        this.firebaseService.getFirestore(),
        'organizations',
        oraginizationId,
      );
      const organizationDoc = await getDoc(organizationRef);
      if (organizationDoc.exists()) {
        const filesArray = organizationDoc.data().files || [];
        filesArray.push(ufid);
        await setDoc(organizationRef, { files: filesArray }, { merge: true });
      } else {
        throw new HttpException(
          'No such organization was found',
          HttpStatus.NOT_FOUND,
        );
      }
    } catch (error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      this.logger.error(
        `Failed to assign the file ${errorCode}. Message: ${errorMessage}`,
      );
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async decipherFile(file: Express.Multer.File) {
    try {
      const data: RawData[] = [];
      const workbook = new Workbook();
      const fileBuffer = file.buffer;
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

      return data;
    } catch (error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      this.logger.error(
        `Failed to desipher the file ${errorCode}. Message: ${errorMessage}`,
      );
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async uploadFile(
    NewFileDto: NewFileDto,
    ufid: string,
    file: Express.Multer.File,
    fileName: string,
  ) {
    try {
      const storage = getStorage(this.firebaseService.getApp());
      const storageRef = ref(storage, ufid);
      const metadata = {
        contentType: file.mimetype,
        customMetadata: {
          uid: NewFileDto.userId,
          fileName: fileName,
        },
      };
      await uploadBytes(storageRef, file.buffer, metadata);
    } catch (error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      this.logger.error(
        `Failed to upload the file to bucket ${errorCode}. Message: ${errorMessage}`,
      );
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async saveRawFile(
    deciferedFile: RawData[],
    ufid: string,
    filename: string,
  ) {
    try {
      await setDoc(
        doc(this.firebaseService.getFirestore(), 'templates', ufid),
        {
          file_name: filename,
          raw_data: JSON.stringify(deciferedFile),
          timestamp: Timestamp.fromDate(new Date()),
        },
      );
    } catch (error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      this.logger.error(
        `Failed to save the raw file ${errorCode}. Message: ${errorMessage}`,
      );
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
