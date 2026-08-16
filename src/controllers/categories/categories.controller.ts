import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { CategoriesService } from '../../services/categories/categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private categoryService: CategoriesService) {}

  @Get('user')
  async getUserCatgeoires(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ) {
    return await this.categoryService.getUserCategories(req, headers);
  }

  @Post('add')
  async addCategory(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
    @Body() { name }: { name: string },
  ) {
    return await this.categoryService.addCategory(req, headers, name);
  }

  @Delete('delete/:id')
  async deleteCategory(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    return await this.categoryService.deleteCategory(req, headers, id);
  }
}
