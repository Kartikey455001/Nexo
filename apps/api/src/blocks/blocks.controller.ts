import { Controller, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BlocksService } from './blocks.service';

@ApiTags('Blocks')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('blocks')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post(':userId')
  @ApiOperation({ summary: 'Block a user' })
  async blockUser(@Request() req: any, @Param('userId') userIdToBlock: string) {
    return this.blocksService.blockUser(req.user.userId, userIdToBlock);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Unblock a user' })
  async unblockUser(@Request() req: any, @Param('userId') userIdToUnblock: string) {
    return this.blocksService.unblockUser(req.user.userId, userIdToUnblock);
  }
}
