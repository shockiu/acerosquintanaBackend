export interface IUnitOfWork {
  runInTransaction<T>(work: (tx: any) => Promise<T>): Promise<T>;
}
