import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users in organization' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  async listUsers(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.usersService.findByOrganization(user.organizationId, {
      page,
      limit,
      search,
      role,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Invite new user to organization' })
  @ApiResponse({ status: 201, description: 'User invited' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async createUser(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() body: { email: string; name?: string; role?: 'ADMIN' | 'MEMBER' | 'VIEWER' },
  ) {
    return this.usersService.create({
      organizationId: currentUser.organizationId,
      email: body.email,
      name: body.name,
      role: body.role || 'MEMBER',
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { name?: string; role?: 'ADMIN' | 'MEMBER' | 'VIEWER' },
  ) {
    return this.usersService.update(id, currentUser.organizationId, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove user from organization' })
  @ApiResponse({ status: 200, description: 'User removed' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.usersService.delete(id, currentUser.organizationId);
  }
}
