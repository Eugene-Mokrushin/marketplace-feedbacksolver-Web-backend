import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ref, uploadBytes } from 'firebase/storage';
import { LoggerService } from '@/log/logger.service';
import { NewFileDto, RawData } from './templatesDto';
import { FirebaseService } from '@/firebase/firebase.service';
import {
  DocumentData,
  DocumentReference,
  Timestamp,
  collection,
  doc,
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

  downloadBasicExcel(fileType: string) {
    const files = { blanks: 'templateSelf.xlsx', AIs: 'templateAIs.xlsx' };
    try {
      const filepath = join(__dirname, 'templateFiles', files[fileType]);
      return { filepath: filepath, filename: files[fileType] };
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

      const db = this.firebaseService.getFirestore();
      const templatesRef = collection(db, 'templates');
      const q = query(templatesRef, where('creator', '==', oraginizationId));
      const templatesDocs = await getDocs(q);
      templatesDocs.forEach((doc) => {
        const templateData = doc.data();
        const templateStats = {
          id: doc.id,
          provider: templateData.provider,
          file_name: templateData.file_name,
          typeFill: templateData.typeFill,
          date_created: templateData.timestamp.seconds,
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

  async addNewFile(dto: NewFileDto, file: Express.Multer.File) {
    try {
      const ufid = uuidv4();
      const fileName = dto.fileName.replace(
        /\.(xlsx|xls|csv|xlsb|xlsm|xls|xlt|xltm|xla|xlam)$/i,
        '',
      );

      const organizationRef = doc(
        this.firebaseService.getFirestore(),
        'users',
        dto.organizationId,
      );
      const organizationDoc = await getDoc(organizationRef);
      if (organizationDoc.exists()) {
        // const organizationFiles = organizationDoc.data().files;
        // Make file plain
        const deciferedFile = await this.decipherFile(file);
        // Uploads file to bucket
        await this.uploadFile(dto, ufid, file, fileName);
        // Saves raw file for future use
        const uploadDate = await this.saveRawFile(
          deciferedFile,
          ufid,
          fileName,
          dto.typeFill,
          dto.organizationId,
          'excel',
        );
        // Adds file to organization as reference
        // await this.assignFile(organizationRef, organizationFiles, ufid);
        return {
          file_id: ufid,
          file_name: fileName,
          date_created: uploadDate,
        };
      } else {
        throw new HttpException(
          'No such organization or user was found',
          HttpStatus.NOT_FOUND,
        );
      }
    } catch (error) {
      const errorCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage = error.message;
      this.logger.error(
        `Failed to upload the file general ${errorCode}. Message: ${errorMessage}`,
      );
      throw new HttpException(errorMessage, errorCode);
    }
  }

  private async assignFile(
    organizationRef: DocumentReference<DocumentData>,
    organizationFiles: string[] | undefined,
    ufid: string,
  ) {
    try {
      const filesArray = organizationFiles || [];
      filesArray.push(ufid);
      await setDoc(organizationRef, { files: filesArray }, { merge: true });
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
      const workbook = new Workbook();
      const fileBuffer = file.buffer;
      const collectedData = await workbook.xlsx.load(fileBuffer).then(() => {
        const worksheet = workbook.getWorksheet('Шаблон');
        const data: RawData[] = [];
        let countdown = 0;
        let row = 2;
        const getCell = (cell: string) => {
          const val = String(worksheet.getCell(cell).value) || null;
          if (val === 'null') return null;
          return val;
        };
        while (countdown < 10) {
          const category = getCell(`A${row}`) || null;
          const article = getCell(`C${row}`) || null;
          const brand = getCell(`B${row}`) || null;
          const rating = +getCell(`E${row}`) || null;
          const response = getCell(`F${row}`)?.split('^') || null;
          const triggers =
            getCell(`H${row}`)?.replace(', ', ',').split(',') || null;
          const blacklistResponse = getCell(`I${row}`) || null;
          const recommendation =
            getCell(`K${row}`)?.replace(', ', ',').split(',') || null;
          if (
            (category === 'null' && article === 'null' && brand === 'null') ||
            (!article && !brand && !category)
          )
            countdown++;
          const rowData: RawData = {
            category,
            article,
            brand,
            rating,
            response,
            triggers,
            blacklistResponse,
            recommendation,
          };
          data.push(rowData);
          row++;
        }
        return data;
      });
      const filteredData = collectedData.map((row) => {
        if (
          (!row.article && !row.brand && !row.category) ||
          (row.article === 'null' &&
            row.brand === 'null' &&
            row.category === 'null')
        ) {
          return null;
        } else {
          return row;
        }
      });
      const finalData = filteredData.filter((row) => row !== null);
      return finalData;
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
    dto: NewFileDto,
    ufid: string,
    file: Express.Multer.File,
    fileName: string,
  ) {
    try {
      const storageRef = ref(
        this.firebaseService.getStorage(),
        'templates/' + ufid,
      );
      const metadata = {
        contentType: file.mimetype,
        customMetadata: {
          uid: dto.organizationId,
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
    type: string,
    creator: string,
    provider: string,
  ) {
    try {
      const uploadDate = Timestamp.fromDate(new Date());
      await setDoc(
        doc(this.firebaseService.getFirestore(), 'templates', ufid),
        {
          file_name: filename,
          raw_data: JSON.stringify(deciferedFile),
          typeFill: type,
          timestamp: uploadDate,
          creator: creator,
          provider: provider,
        },
      );
      return uploadDate;
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
