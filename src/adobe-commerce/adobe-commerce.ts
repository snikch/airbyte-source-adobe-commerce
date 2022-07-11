import axios, { AxiosInstance, AxiosResponse } from "axios"
import { AirbyteLogger, wrapApiError } from "faros-airbyte-cdk"
import { VError } from "verror"

import { Customer, CustomerSearchResults } from "./models"

const DEFAULT_PAGE_SIZE = 100;
const MAX_NUMBER_OF_RETRIES = 10;

export interface AdobeCommerceConfig {
  readonly api_key: string;
  readonly api_url: string;
  readonly page_size?: number;
}

export class AdobeCommerce {
  private static adobeCommerce?: AdobeCommerce;

  constructor(
    private readonly restClient: AxiosInstance,
    private readonly pageSize: number,
    private readonly logger: AirbyteLogger
  ) {}

  static instance(config: AdobeCommerceConfig, logger: AirbyteLogger): AdobeCommerce {
    if (AdobeCommerce.adobeCommerce) return AdobeCommerce.adobeCommerce;

    if (!config.api_key) {
      throw new VError('API Key has to be provided');
    }
    if (!config.api_url) {
      throw new VError('API URL has to be provided');
    }
    const httpClient = axios.create({
      baseURL: config.api_url,
      timeout: 5000,
      headers: {Authorization: `Bearer ${config.api_key}`},
    });

    const pageSize = config.page_size ?? DEFAULT_PAGE_SIZE;
    AdobeCommerce.adobeCommerce = new AdobeCommerce(httpClient, pageSize, logger);
    logger.debug('Created AdobeCommerce instance');
    return AdobeCommerce.adobeCommerce;
  }

  async checkConnection(): Promise<void> {
    try {
      await this.restClient.get<any>('V1/products?searchCriteria[filterGroups][0][filters][0][field]=sku&searchCriteria[filterGroups][0][filters][0][value]=test');
    } catch (err: any) {
      let errorMessage = 'Please verify your api key is correct. Error: ';
      if (err.error_code || err.error_info) {
        errorMessage += `${err.error_code}: ${err.error_info}`;
        throw new VError(errorMessage);
      }
      try {
        errorMessage += err.message ?? err.statusText ?? wrapApiError(err);
      } catch (wrapError: any) {
        errorMessage += wrapError.message;
      }
      throw new VError(errorMessage);
    }
  }
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  delay = (waitingTime) =>
    new Promise((resolve) => setTimeout(resolve, waitingTime));

  async retryApi<T>(
    url: string,
    params?: Record<string, any>
  ): Promise<AxiosResponse<T>> {
    let attemptCount = 0;
    do {
      const response = await this.restClient.get<T>(url, {params});
      // retry when got rate limiting
      if (response.status === 429) {
        attemptCount++;
        await this.delay(Math.pow(2, attemptCount) * 200);
        continue;
      }
      return response;
    } while (attemptCount < MAX_NUMBER_OF_RETRIES);
    return Promise.reject()
  }

  async *getCustomers(createdAt?: Date): AsyncGenerator<Customer> {
    let page = 0;
    do {
      const params = {
        'searchCriteria[currentPage]': page,
        'searchCriteria[pageSize]': this.pageSize,
        'searchCriteria[sortOrders][0][direction]': 'asc',
        'searchCriteria[sortOrders][0][field]': 'created_at',
      };
      if (createdAt) {
        params['searchCriteria[filterGroups][0][filters][0][field]'] = 'created_at'
        params['searchCriteria[filterGroups][0][filters][0][value]'] = createdAt.toISOString()
        params['searchCriteria[filterGroups][0][filters][0][conditionType]'] = 'gt'
      }
      const response = await this.retryApi<CustomerSearchResults>(
        `V1/customers/search`,
        params
      );
      for (const item of response?.data?.items ?? []) {
          yield item;
      }
      if (response?.data.items.length > 0 )
        page++;
      else break;
    } while (true);
  }

  // async *getUsers(): AsyncGenerator<User> {
  //   let offset = 0;
  //   do {
  //     const params = {offset, limit: this.pageSize, sort: 'createdAt'};
  //     const response = await this.retryApi<PaginateResponse<User>>(
  //       'v2/users',
  //       params
  //     );
  //     for (const user of response.data.data) {
  //       yield user;
  //     }
  //     if (response?.data.totalCount > offset + this.pageSize) {
  //       offset += this.pageSize;
  //     } else {
  //       break;
  //     }
  //   } while (true);
  // }

  // async *getTeams(): AsyncGenerator<Team> {
  //   const response = await this.retryApi<PaginateResponse<Team>>('v2/teams');
  //   for (const team of response.data.data) {
  //     yield team;
  //   }
  // }
}
