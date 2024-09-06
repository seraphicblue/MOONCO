import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { DeleteProductCommand } from '../impl/delete-product.command';
import { ProductRepository } from '../../repositories/product.repository';
import { Product } from 'src/product/entities/product.entity';
import { DeleteInventoryCommand } from 'src/inventory/commands/impl/delete-inventory.command';
import { EventStoreService } from 'src/shared/event-store/event-store.service';
import { ProductDeletedEvent } from 'src/product/events/impl/product-deleted.event'; // Product 삭제 이벤트
import { Logger, Inject } from '@nestjs/common';
import { DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler implements ICommandHandler<DeleteProductCommand> {
  private readonly logger = new Logger(DeleteProductHandler.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: ProductRepository,
    private readonly eventStoreService: EventStoreService,
    @Inject(EventBus) private readonly eventBus: EventBus
  ) {}

  async execute(command: DeleteProductCommand) {
    const { Id } = command;

    // Product 삭제
    const result: DeleteResult = await this.productRepository.deleteOne({ Id });
    if (result.affected === 0) {
      this.logger.warn(`No product found with ID ${Id}`);
      return;
    }
    
    
    this.logger.log(`Product with ID ${Id} has been deleted`);

    // Inventory 삭제 명령어 발행
    const deleteInventoryCommand = new DeleteInventoryCommand(Id); // Product ID를 Inventory 삭제 명령에 사용
    await this.eventBus.publish(deleteInventoryCommand);
    
    this.logger.log(`DeleteInventoryCommand for product ID ${Id} published`);

    // Event 저장소에 Product 삭제 이벤트 저장
    const productDeletedEvent = new ProductDeletedEvent(Id);
    await this.eventStoreService.saveEvent({
      aggregateId: Id.toString(),
      aggregateType: 'Product',
      eventType: productDeletedEvent.constructor.name,
      eventData: productDeletedEvent,
      version: 1
    });

    this.logger.log(`ProductDeletedEvent for product ID ${Id} saved`);

    return Id;
  }
}
