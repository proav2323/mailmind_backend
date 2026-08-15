import { Controller, Get, Headers, Req } from '@nestjs/common';
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
}
