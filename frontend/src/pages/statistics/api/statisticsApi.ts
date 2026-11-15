import { createApiClient, ApiError } from '@shared/api' 
import type { StatisticsResponse, GradesOverTimeResponse } from '../model'

export class StatisticsApiError extends ApiError {
    constructor(message: string, status: number) {
        super(message, status)
        this.name = 'StatisticsApiError'
    }
}

const request = createApiClient({ basePath: '/student', ErrorClass: StatisticsApiError })

export function getStatisticsOverview(): Promise<StatisticsResponse>{
    return request<StatisticsResponse>(`/statistics`)
}

export function getGradesOverTime(): Promise<GradesOverTimeResponse>{
    return request<GradesOverTimeResponse>(`/gradesOverTime`)
}
