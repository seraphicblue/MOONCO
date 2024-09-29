import { Module } from "@nestjs/common";
import { BatchController } from "./batch.controller";
import { BatchService } from "./batch.service";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [BatchController],
  providers: [BatchService],
})
export class BatchModule {}
