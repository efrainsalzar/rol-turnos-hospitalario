export interface CollectionResponse<T> {
  data: T[];
  meta: {
    total: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
    hasMore?: boolean;
  };
}
