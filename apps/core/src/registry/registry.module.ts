import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RegistryService } from './registry.service';
import { RegistryController } from './registry.controller';
import { ServiceRegistryEntry, ServiceRegistrySchema } from './schemas/service-registry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServiceRegistryEntry.name, schema: ServiceRegistrySchema },
    ]),
  ],
  controllers: [RegistryController],
  providers: [RegistryService],
  exports: [RegistryService],
})
export class RegistryModule {}
