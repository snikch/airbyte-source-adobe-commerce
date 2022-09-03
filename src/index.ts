import { Command } from "commander"
import {
  AirbyteConfig, AirbyteLogger, AirbyteSourceBase, AirbyteSourceRunner, AirbyteSpec,
  AirbyteStreamBase,
} from "faros-airbyte-cdk"
import VError from "verror"

import { AdobeCommerce, AdobeCommerceConfig } from "./adobe-commerce/adobe-commerce"
import { Customers, Products } from "./streams"

/** The main entry point. */
export function mainCommand(): Command {
    const logger = new AirbyteLogger();
    const source = new AdobeCommerceSource(logger);
    return new AirbyteSourceRunner(logger, source).mainCommand();
}

/** AdobeCommerce source implementation. */
export class AdobeCommerceSource extends AirbyteSourceBase {
    async spec(): Promise<AirbyteSpec> {
        return new AirbyteSpec(require('../resources/spec.json'));
    }
    async checkConnection(config: AirbyteConfig): Promise<[boolean, VError]> {
        try {
            const fireHydrant = AdobeCommerce.instance(
                config as AdobeCommerceConfig,
                this.logger
            );
            await fireHydrant.checkConnection();
        } catch (err: any) {
            return [false, err];
        }
        return [true, undefined];
    }
    streams(config: AirbyteConfig): AirbyteStreamBase[] {
        return [
            new Customers(config as AdobeCommerceConfig, this.logger),
            new Products(config as AdobeCommerceConfig, this.logger),
        ];
    }
}
