import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(boardId: string) {
    return this.prisma.label.findMany({
      where: { boardId },
      orderBy: { name: 'asc' },
    });
  }

  create(boardId: string, createLabelDto: CreateLabelDto) {
    return this.prisma.label.create({
      data: {
        boardId,
        name: createLabelDto.name,
        color: createLabelDto.color,
      },
    });
  }

  update(id: string, updateLabelDto: UpdateLabelDto) {
    return this.prisma.label.update({
      where: { id },
      data: updateLabelDto,
    });
  }

  remove(id: string) {
    return this.prisma.label.delete({
      where: { id },
    });
  }
}
