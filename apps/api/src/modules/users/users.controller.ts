import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type CurrentUserData } from '../../common/decorators/current-user.decorator';
import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

class InviteUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  role?: string;
}

class AcceptInviteDto {
  @IsString()
  name: string;

  @IsString()
  @MinLength(8)
  password: string;
}

class UpdateRoleDto {
  @IsString()
  role: string;
}

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserData) {
    return this.usersService.list(user.organizationId);
  }

  @Post('invite')
  @Roles('ADMIN')
  invite(@Body() dto: InviteUserDto, @CurrentUser() user: CurrentUserData) {
    return this.usersService.invite(user.organizationId, user.id, dto);
  }

  @Post('accept-invite/:token')
  acceptInvite(@Param('token') token: string, @Body() dto: AcceptInviteDto) {
    return this.usersService.acceptInvite(token, dto);
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.usersService.updateRole(id, user.organizationId, dto.role, user.id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.usersService.remove(id, user.organizationId, user.id);
  }

  @Get('invitations')
  @Roles('ADMIN')
  getPendingInvitations(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getPendingInvitations(user.organizationId);
  }
}
