import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

function formatBranch(branch: any, lang: string = 'vi') {
  const isEn = lang === 'en';
  return {
    ...branch,
    displayName: isEn && branch.nameEn ? branch.nameEn : branch.name,
    displayAddress:
      isEn && branch.addressEn ? branch.addressEn : branch.address,
    displayCity: isEn && branch.cityEn ? branch.cityEn : branch.city,
  };
}

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(lang: string = 'vi') {
    const branches = await this.prisma.branch.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return branches.map((b) => formatBranch(b, lang));
  }

  async findOne(id: string, lang: string = 'vi') {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
    });
    return branch ? formatBranch(branch, lang) : null;
  }
}
