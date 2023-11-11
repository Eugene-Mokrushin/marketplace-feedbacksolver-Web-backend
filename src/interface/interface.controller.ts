import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { InterfaceService } from './interface.service';
import {
  AddUserDto,
  NewKeyPairDto,
  NewMarketplaceDto,
  UpdateMarketplaceDto,
  UpdateProfilePictureDto,
} from './interfaceDto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('interface')
export class InterfaceController {
  constructor(private interfaceService: InterfaceService) {}

  @Get('getMarketplaces/:organizationId')
  getMarketplaces(@Param('organizationId') organizationId: string) {
    return this.interfaceService.getMarketplaces(organizationId);
  }

  @Post('addMarketplace')
  addMarketplace(@Body() dto: NewMarketplaceDto) {
    return this.interfaceService.addNewMarketplace(dto);
  }

  @Post('updateMarketplace')
  updateMarketplace(@Body() dto: UpdateMarketplaceDto) {
    return this.interfaceService.updateMarketplace(dto);
  }

  @Delete('deleteMarketplace/:marketplaceId')
  deleteMarketplace(@Param('marketplaceId') marketplaceId: string) {
    return this.interfaceService.deleteMarketplace(marketplaceId);
  }

  @Post('changeMarketplaceKey')
  changeMarketplaceKey(@Body() dto: NewKeyPairDto) {
    return this.interfaceService.changeMarketplaceKey(dto);
  }

  @Post('addUserToOragnization')
  addUserToOrganization(@Body() dto: AddUserDto) {
    return this.interfaceService.addUserToOrganization(dto);
  }

  @Post('updateProfilePicture')
  @UseInterceptors(FileInterceptor('file'))
  updateProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdateProfilePictureDto,
  ) {
    return this.interfaceService.updateProfilePicture(file, dto);
  }
}
