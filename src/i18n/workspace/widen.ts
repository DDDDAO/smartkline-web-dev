export type Widen<T> = T extends (...args: infer Args) => infer Return
  ? (...args: Args) => Widen<Return>
  : T extends readonly (infer Item)[]
    ? readonly Widen<Item>[]
    : T extends string
      ? string
      : T extends object
        ? { [Key in keyof T]: Widen<T[Key]> }
        : T;
