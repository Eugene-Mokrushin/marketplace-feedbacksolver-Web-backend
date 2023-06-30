import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { NewFileDto } from './templatesDto';

@Controller('templates')
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get('/download')
  downloadTemplate() {
    return this.templatesService.downloadBasicExcel();
  }

  @Post('/addComment')
  @UseInterceptors(AnyFilesInterceptor())
  postNewComment(
    @Req() req: any,
    @Body() dto: NewFileDto,
    @UploadedFiles() file: File,
  ) {
    return this.templatesService.addNewFile(dto, file);
  }
}
