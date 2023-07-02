import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { NewFileDto } from './templatesDto';

@Controller('templates')
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get('/:fileId')
  getSpecificTemplate(@Param('fileId') fileId: string) {
    return this.templatesService.getSpecificFile(fileId);
  }

  @Get('/download')
  downloadTemplate() {
    return this.templatesService.downloadBasicExcel();
  }

  @Get('/all/:organizationId')
  getAllTemplates(@Param('organizationId') organizationId: string) {
    return this.templatesService.getAllFiles(organizationId);
  }

  @Post('/add')
  @UseInterceptors(FileInterceptor('file'))
  addNewTemplate(
    @Body() dto: NewFileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.templatesService.addNewFile(dto, file);
  }
}
