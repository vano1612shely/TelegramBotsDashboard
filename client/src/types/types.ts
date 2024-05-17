export type GetDataWithTypedSelect<T> = {
  perPage?: number | null;
  page?: number | null;
  take_all?: boolean | null;
  select?: T[] | null;
  include_relations?: boolean | null;
};
