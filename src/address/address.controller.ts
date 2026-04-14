import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';


@ApiTags('Address')
@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create address for current user' })
  @ApiBody({ type: CreateAddressDto })
  @ApiOkResponse({ description: 'Address created successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  create(@Body() createAddressDto: CreateAddressDto, @Request() req) {
    const profile_id = req.user.id;

    return this.addressService.create(createAddressDto, profile_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all addresses for current user' })
  @ApiOkResponse({ description: 'Addresses returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  async findAll(@Request() req) {
    return this.addressService.findAll(req.user.id);
  }

  // GET BY ID
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get address by id for current user' })
  @ApiParam({ name: 'id', description: 'Address id' })
  @ApiOkResponse({ description: 'Address returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.addressService.findOne(req.user.id, id);
  }

  // UPDATE
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update address by id for current user' })
  @ApiParam({ name: 'id', description: 'Address id' })
  @ApiBody({ type: UpdateAddressDto })
  @ApiOkResponse({ description: 'Address updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.addressService.update(req.user.id, id, updateAddressDto);
  }

  // DELETE
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete address by id for current user' })
  @ApiParam({ name: 'id', description: 'Address id' })
  @ApiOkResponse({ description: 'Address deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  async remove(@Request() req, @Param('id') id: string) {
    return this.addressService.remove(req.user.id, id);
  }


}
