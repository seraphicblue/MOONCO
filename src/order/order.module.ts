import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItems } from 'src/order-itmes/entities/order-items.entity';
import { getMongoConfig } from 'src/shared/infrastructure/database/mongodb.config';
import { CreateOrderCommandHandler } from './commands/handlers/create-order.command-handler';
import { DeleteOrderCommandHandler } from './commands/handlers/delete-order.command-handler';
import { Order } from './entities/order.entity';
import { CreateOrderEventHandler } from './events/handlers/create-order.event-handler';
import { OrderController } from './order.controller';
import { GetOrderQueryHandler } from './queries/handlers/get-order.query-handler';
import { CreateOrderEventSchema } from './schemas/create-order.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    TypeOrmModule.forFeature([OrderItems]),
    CqrsModule,
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getMongoConfig,
    }),
    MongooseModule.forFeature([{ name: 'CreateOrderEvent', schema: CreateOrderEventSchema }]),
  ],
  controllers: [OrderController],
  providers: [CreateOrderCommandHandler, GetOrderQueryHandler, DeleteOrderCommandHandler, CreateOrderEventHandler]
})
export class OrderModule {}
