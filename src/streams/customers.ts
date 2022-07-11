import { AirbyteLogger, AirbyteStreamBase, StreamKey, SyncMode } from "faros-airbyte-cdk"
import { Dictionary } from "ts-essentials"

import { AdobeCommerce, AdobeCommerceConfig } from "../adobe-commerce/adobe-commerce"
import { Customer } from "../adobe-commerce/models"

interface CustomerState {
    lastCreatedAt?: Date;
}
export class Customers extends AirbyteStreamBase {
    constructor(
        private readonly config: AdobeCommerceConfig,
        protected readonly logger: AirbyteLogger
    ) {
        super(logger);
    }

    getJsonSchema(): Dictionary<any, string> {
        return require('../../resources/schemas/customer.json');
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
        streamState?: CustomerState
    ): AsyncGenerator<Customer> {
        const lastCreatedAt =
            syncMode === SyncMode.INCREMENTAL
                ? new Date(streamState?.lastCreatedAt ?? 0)
                : undefined;
        const adobeCustomer = AdobeCommerce.instance(this.config, this.logger);
        yield* adobeCustomer.getCustomers(lastCreatedAt);
    }

    getUpdatedState(
        currentStreamState: CustomerState,
        latestRecord: Customer
    ): CustomerState {
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
