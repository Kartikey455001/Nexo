import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MediaService } from './media.service';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('presigned-url')
  @ApiOperation({ summary: 'Get a presigned upload URL for S3/MinIO' })
  @ApiQuery({ name: 'filename', required: true, type: String })
  @ApiQuery({ name: 'contentType', required: true, type: String })
  async getPresignedUrl(
    @Query('filename') filename: string,
    @Query('contentType') contentType: string,
  ) {
    if (!filename || !contentType) {
      throw new BadRequestException('filename and contentType are required');
    }
    return this.mediaService.generatePresignedUrl(filename, contentType);
  }
}
