import { AirbyteLogger, AirbyteStreamBase, StreamKey, SyncMode } from "faros-airbyte-cdk"
import { Dictionary } from "ts-essentials"

import { AdobeCommerce, AdobeCommerceConfig } from "../adobe-commerce/adobe-commerce"
import { Product } from "../adobe-commerce/models"

interface ProductState {
    lastCreatedAt?: Date;
}
export class Products extends AirbyteStreamBase {
    constructor(
        private readonly config: AdobeCommerceConfig,
        protected readonly logger: AirbyteLogger
    ) {
        super(logger);
    }

    getJsonSchema(): Dictionary<any, string> {
        return require('../../resources/schemas/product.json');
    }
    get primaryKey(): StreamKey {
        return 'id';
    }
    get cursorField(): string | string[] {
        return 'updated_at';
    }
    async *readRecords(
        syncMode: SyncMode,
        cursorField?: string[],
        streamSlice?: Dictionary<any>,
        streamState?: ProductState
    ): AsyncGenerator<Product> {
        const lastCreatedAt =
            syncMode === SyncMode.INCREMENTAL
                ? new Date(streamState?.lastCreatedAt ?? 0)
                : undefined;
        const adobeProduct = AdobeCommerce.instance(this.config, this.logger);
        yield* adobeProduct.getProducts(lastCreatedAt);
    }

    getUpdatedState(
        currentStreamState: ProductState,
        latestRecord: Product
    ): ProductState {
        const lastCreatedAt = new Date(latestRecord.updated_at!);
        return {
            lastCreatedAt:
                new Date(lastCreatedAt) >
                new Date(currentStreamState?.lastCreatedAt ?? 0)
                    ? lastCreatedAt
                    : currentStreamState?.lastCreatedAt,
        };
    }
}
