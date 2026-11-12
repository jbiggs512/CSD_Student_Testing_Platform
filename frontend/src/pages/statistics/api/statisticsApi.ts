import { createApiClient, ApiError } from '@shared/api' 

export class StatisticsApiError extends ApiError {
    constructor(message: string, status: number) {
        super(message, status)
        this.name = 'StatisticsApiError'
    }
}

const request = createApiClient({ basePath: '/student', ErrorClass: StatisticsApiError })
