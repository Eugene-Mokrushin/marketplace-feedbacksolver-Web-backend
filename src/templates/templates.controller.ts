import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { NewFileDto } from './templatesDto';
import { Response } from 'express';
import { readFileSync } from 'fs';

@Controller('templates')
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get('/:fileId')
  getSpecificTemplate(@Param('fileId') fileId: string) {
    return this.templatesService.getSpecificFile(fileId);
  }

  @Get('/downloadTemplate/:fileType')
  downloadTemplate(@Res() res: Response, @Param('fileType') fileType: string) {
    const { filename, filepath } =
      this.templatesService.downloadBasicExcel(fileType);
    const buffer = readFileSync(filepath);
    res.header('Content-disposition', `attachment; filename=${filename}`);
    res.type(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    return res.send(buffer);
  }

  @Get('/downloadFilledTemplate/:organizationId')
  getAllTemplates(@Param('organizationId') organizationId: string) {
    return this.templatesService.getAllFiles(organizationId);
  }

  @Post('/uploadTemplate')
  @UseInterceptors(FileInterceptor('file'))
  addNewTemplate(
    @Body() dto: NewFileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.templatesService.addNewFile(dto, file);
  }
}
