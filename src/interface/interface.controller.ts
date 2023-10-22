import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InterfaceService } from './interface.service';
import { AddUserDto, NewKeyPairDto, NewMarketplaceDto } from './interfaceDto';

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

  @Post('changeMarketplaceKey')
  changeMarketplaceKey(@Body() dto: NewKeyPairDto) {
    return this.interfaceService.changeMarketplaceKey(dto);
  }

  @Post('addUserToOragnization')
  addUserToOrganization(@Body() dto: AddUserDto) {
    return this.interfaceService.addUserToOrganization(dto);
  }
}
